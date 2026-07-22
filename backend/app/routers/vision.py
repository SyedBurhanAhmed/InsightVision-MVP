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
from PIL import Image
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.core.state import ml_models
from app.models.schemas import DetectResponse, DetectedObject

_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
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
    masks: bool = Form(False),
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

    # ── ROUTE 0.5: Gemma 4 Multimodal Grounding & OCR ───────────────────────
    if model == "gemma4":
        t0 = time.time()
        try:
            from app.services.gemma4 import Gemma4Service
            gemma_svc = Gemma4Service()
            image_pil = Image.fromarray(img_rgb).convert("RGB")
            
            gemma_res = gemma_svc.process(image_pil, prompt)
            inference_ms = (time.time() - t0) * 1000
            
            import uuid
            if gemma_res["type"] == "ocr":
                text_out = gemma_res["text"]
                obj = DetectedObject.from_xyxy(
                    obj_id=str(uuid.uuid4())[:8],
                    label=text_out,
                    score=1.0,
                    x1=0.0, y1=0.0, x2=float(img_w), y2=float(img_h),
                    img_w=img_w, img_h=img_h,
                    color="#22D3C8"
                )
                objects.append(obj)
            else:
                for i, box in enumerate(gemma_res["boxes"]):
                    x1, y1, x2, y2 = box
                    obj = DetectedObject.from_xyxy(
                        obj_id=str(uuid.uuid4())[:8],
                        label=prompt,
                        score=0.85,
                        x1=float(x1), y1=float(y1), x2=float(x2), y2=float(y2),
                        img_w=img_w, img_h=img_h,
                        color=_COLORS[i % len(_COLORS)]
                    )
                    objects.append(obj)
        except Exception as e:
            logger.error(f"Gemma 4 processing failed: {e}")
            raise HTTPException(status_code=500, detail=f"Gemma 4 execution error: {str(e)}")

    # ── ROUTE 1: Florence-2 VLM Grounding (Commented out in favor of Gemma 4) ──
    # elif model == "florence2":
    #     flo_model = ml_models.get("florence_model")
    #     flo_proc = ml_models.get("florence_processor")
    #     if not flo_model or not flo_proc:
    #         raise HTTPException(status_code=503, detail="Florence-2 model is not loaded in backend.")
    # 
    #     t0 = time.time()
    #     try:
    #         # Convert to PIL Image for transformers processor
    #         image_pil = Image.fromarray(img_rgb).convert("RGB")
    #         
    #         # Determine Florence-2 task based on query text or masks toggle
    #         prompt_lower = prompt.lower()
    #         if masks or any(k in prompt_lower for k in ["segment", "mask", "outline"]):
    #             task_prompt = "<REFERRING_EXPRESSION_SEGMENTATION>"
    #             text_input = task_prompt + prompt
    #         elif any(k in prompt_lower for k in ["read", "ocr", "text", "plate", "license"]):
    #             task_prompt = "<OCR_WITH_REGION>"
    #             text_input = task_prompt
    #         else:
    #             task_prompt = "<CAPTION_TO_PHRASE_GROUNDING>"
    #             text_input = task_prompt + prompt
    # 
    #         inputs = flo_proc(text=text_input, images=image_pil, return_tensors="pt").to(device)
    # 
    #         with torch.no_grad():
    #             generated_ids = flo_model.generate(
    #                 input_ids=inputs["input_ids"],
    #                 pixel_values=inputs["pixel_values"],
    #                 max_new_tokens=1024,
    #                 early_stopping=False,
    #                 do_sample=False,
    #                 num_beams=3,
    #             )
    # 
    #         generated_text = flo_proc.batch_decode(generated_ids, skip_special_tokens=False)[0]
    #         parsed_answer = flo_proc.post_process_generation(
    #             generated_text,
    #             task=task_prompt,
    #             image_size=(image_pil.width, image_pil.height)
    #         )
    # 
    #         raw_data = parsed_answer.get(task_prompt, {})
    #         
    #         # Extract boxes and labels based on Florence-2 task output formats
    #         raw_boxes = []
    #         raw_labels = []
    #         
    #         if task_prompt == "<OCR_WITH_REGION>":
    #             # Returns labels (text transcriptions) and quadboxes
    #             quadboxes = raw_data.get("quadboxes", [])
    #             raw_labels = raw_data.get("labels", [])
    #             # Convert quadboxes to standard bounding boxes
    #             for qb in quadboxes:
    #                 xs = qb[0::2]
    #                 ys = qb[1::2]
    #                 raw_boxes.append([min(xs), min(ys), max(xs), max(ys)])
    #         else:
    #             raw_boxes = raw_data.get("bboxes", [])
    #             raw_labels = raw_data.get("labels", [])
    # 
    #         inference_ms = (time.time() - t0) * 1000
    # 
    #         for i, (box, label) in enumerate(zip(raw_boxes, raw_labels)):
    #             x1, y1, x2, y2 = box
    #             color = _COLORS[i % len(_COLORS)]
    #             obj = DetectedObject.from_xyxy(
    #                 obj_id=f"{label[:1].upper()}{i+1:03d}",
    #                 label=label,
    #                 score=0.95,  # Florence-2 outputs labels directly, default high score
    #                 x1=float(x1), y1=float(y1), x2=float(x2), y2=float(y2),
    #                 img_w=img_w, img_h=img_h,
    #                 color=color,
    #             )
    #             objects.append(obj)
    # 
    #     except Exception as e:
    #         logger.error(f"Florence-2 error: {e}")
    #         raise HTTPException(status_code=500, detail=f"Florence-2 error: {e}")

    # ── ROUTE 2: SAM3 Grounding ──────────────────────────────────────────────
    elif model == "sam3":
        if not ml_models.get("sam3_model"):
            raise HTTPException(status_code=503, detail="SAM 3 model not loaded.")

        from app.services.detector import SAM3Detector
        detector = SAM3Detector(ml_models["sam3_model"])
        
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
            logger.error(f"SAM3 detector error: {e}")
            raise HTTPException(status_code=500, detail=f"SAM3 detector error: {e}")

    # ── ROUTE 3: GroundingDINO Grounding ─────────────────────────────────────
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

    # ── ROUTE 3: SAM 3 Segmentation refinement if masks toggle is enabled ──
    if masks and objects:
        try:
            from app.services.segmenter import SAM3Segmenter
            segmenter = SAM3Segmenter()
            
            boxes_to_seg = []
            for obj in objects:
                x, y, w, h = obj.bbox
                boxes_to_seg.append([x, y, x + w, y + h])
                
            t_seg_start = time.time()
            segmenter.segment(img_rgb, boxes_to_seg)
            seg_ms = (time.time() - t_seg_start) * 1000
            inference_ms += seg_ms
            logger.info(f"SAM3 Segmenter processed {len(objects)} object(s) in {seg_ms:.1f}ms")
        except Exception as e:
            logger.error(f"SAM3 Segmenter failed: {e}")

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
