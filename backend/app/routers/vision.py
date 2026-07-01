"""
POST /api/detect  — Object detection endpoint.
Consumes: multipart/form-data  { image: UploadFile, prompt: str, conf_threshold: float, model: str }
Produces: DetectResponse  (see schemas.py — dual bbox, dual field names)
"""

import sys
import os
import time
import logging

import cv2
import numpy as np
import torch
from PIL import Image
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.core.state import ml_models
from app.models.schemas import DetectResponse, DetectedObject

_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

router = APIRouter()
logger = logging.getLogger(__name__)

# Rotating palette for object color coding
_COLORS = [
    "#FF0040", "#00FFFF", "#39FF14", "#FFD60A",
    "#FF6B35", "#9D4EDD", "#00D4FF", "#DC143C",
]


@router.post("/detect", response_model=DetectResponse)
async def detect_objects(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    conf_threshold: float = Form(0.35),
    model: str = Form("groundingdino"),  # "groundingdino" or "florence2"
):
    t_start = time.time()
    device = ml_models.get("device", "cpu")

    # ── Read & decode image ──────────────────────────────────────────────────
    raw = await image.read()
    nparr = np.frombuffer(raw, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Cannot decode image file.")
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_h, img_w = img_rgb.shape[:2]

    inference_ms = 0.0
    objects = []

    # ── ROUTE 1: Florence-2 VLM Grounding ────────────────────────────────────
    if model == "florence2":
        flo_model = ml_models.get("florence_model")
        flo_proc = ml_models.get("florence_processor")
        if not flo_model or not flo_proc:
            raise HTTPException(status_code=503, detail="Florence-2 model is not loaded in backend.")

        t0 = time.time()
        try:
            # Convert to PIL Image for transformers processor
            image_pil = Image.fromarray(img_rgb).convert("RGB")
            task_prompt = "<CAPTION_TO_PHRASE_GROUNDING>"
            text_input = task_prompt + prompt

            inputs = flo_proc(text=text_input, images=image_pil, return_tensors="pt").to(device)

            with torch.no_grad():
                generated_ids = flo_model.generate(
                    input_ids=inputs["input_ids"],
                    pixel_values=inputs["pixel_values"],
                    max_new_tokens=1024,
                    early_stopping=False,
                    do_sample=False,
                    num_beams=3,
                )

            generated_text = flo_proc.batch_decode(generated_ids, skip_special_tokens=False)[0]
            parsed_answer = flo_proc.post_process_generation(
                generated_text,
                task=task_prompt,
                image_size=(image_pil.width, image_pil.height)
            )

            grounding_data = parsed_answer.get(task_prompt, {})
            raw_boxes = grounding_data.get("bboxes", [])
            raw_labels = grounding_data.get("labels", [])

            inference_ms = (time.time() - t0) * 1000

            for i, (box, label) in enumerate(zip(raw_boxes, raw_labels)):
                x1, y1, x2, y2 = box
                color = _COLORS[i % len(_COLORS)]
                obj = DetectedObject.from_xyxy(
                    obj_id=f"{label[:1].upper()}{i+1:03d}",
                    label=label,
                    score=0.95,  # Florence-2 outputs labels directly, default high score
                    x1=float(x1), y1=float(y1), x2=float(x2), y2=float(y2),
                    img_w=img_w, img_h=img_h,
                    color=color,
                )
                objects.append(obj)

        except Exception as e:
            logger.error(f"Florence-2 error: {e}")
            raise HTTPException(status_code=500, detail=f"Florence-2 error: {e}")

    # ── ROUTE 2: GroundingDINO Grounding ─────────────────────────────────────
    else:
        if not ml_models.get("detector"):
            raise HTTPException(status_code=503, detail="GroundingDINO detector model not loaded.")

        from app.services.detector import GroundingDINODetector
        detector = GroundingDINODetector(ml_models["detector"])
        
        try:
            results = detector.detect(img_rgb, prompt, conf_threshold)
            inference_ms = results["inference_ms"]
            for i, (box, score, label) in enumerate(
                zip(results["boxes"], results["scores"], results["labels"])
            ):
                x1, y1, x2, y2 = box
                color = _COLORS[i % len(_COLORS)]
                obj = DetectedObject.from_xyxy(
                    obj_id=f"{label[:1].upper()}{i+1:03d}",
                    label=label,
                    score=float(score),
                    x1=x1, y1=y1, x2=x2, y2=y2,
                    img_w=img_w, img_h=img_h,
                    color=color,
                )
                objects.append(obj)
        except Exception as e:
            logger.error(f"Detector error: {e}")
            raise HTTPException(status_code=500, detail=f"Detector error: {e}")

    t_total = (time.time() - t_start) * 1000
    logger.info(
        f"detect | model={model} | prompt='{prompt}' | found={len(objects)} | "
        f"infer={inference_ms:.0f}ms | total={t_total:.0f}ms"
    )
    return DetectResponse(
        objects=objects,
        inference_ms=round(inference_ms, 1),
        total_ms=round(t_total, 1),
        device=device,
    )
