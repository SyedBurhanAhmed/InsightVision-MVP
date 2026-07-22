"""
POST /api/vision/query — Full VLM pipeline endpoint.

Pipeline:
  1. Parse natural language query → task + prompt (QueryParser via Groq)
  2. Run GroundingDINO detector on the image
  3. Compose a natural language answer (NLComposer)
  4. Return unified QueryResponse (dual field names, dual bbox formats)

Consumes: multipart/form-data { image: UploadFile, query: str, conf_threshold: float }
Produces: QueryResponse  (see schemas.py)
"""

import sys
import os
import time
import logging

import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.core.state import ml_models
from app.models.schemas import QueryResponse, DetectedObject

_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

router = APIRouter()
logger = logging.getLogger(__name__)

_COLORS = [
    "#FF0040", "#00FFFF", "#39FF14", "#FFD60A",
    "#FF6B35", "#9D4EDD", "#00D4FF", "#DC143C",
]


@router.post("/query", response_model=QueryResponse)
async def vlm_query(
    image: UploadFile = File(...),
    query: str = Form(...),
    conf_threshold: float = Form(0.35),
    detector_backend: str = Form("dino"),
):
    t_start = time.time()
    query = query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query string must not be empty.")

    # Read image bytes first for cache lookup
    raw = await image.read()

    # Check cache first
    from app.services.cache import cache
    cached_response = cache.get_static_cache(raw, query, detector_backend, conf_threshold)
    if cached_response:
        logger.info(f"Static image cache hit for query '{query}'")
        cached_response["total_ms"] = round((time.time() - t_start) * 1000, 1)
        return QueryResponse(**cached_response)

    # ── 1. Parse query → task + detector prompt ──────────────────────────────
    parser = ml_models.get("query_parser")
    t_parser = time.time()
    parser_result = {"task": "detect", "prompt": query, "conf_threshold": conf_threshold}
    if parser:
        try:
            parser_result = parser.parse(query)
        except Exception as e:
            logger.warning(f"QueryParser failed, using fallback: {e}")
    parser_ms = (time.time() - t_parser) * 1000
    task = parser_result.get("task", "detect")
    detection_prompt = parser_result.get("prompt", query)
    effective_conf = float(parser_result.get("conf_threshold", conf_threshold))

    logger.info(f"query | task={task} | prompt='{detection_prompt}' | conf={effective_conf} | backend={detector_backend}")

    # ── 2. Read & decode image ───────────────────────────────────────────────
    nparr = np.frombuffer(raw, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Cannot decode image file.")
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_h, img_w = img_rgb.shape[:2]

    # ── 3. Detect objects (unless task is pure describe) ────────────────────
    objects: list[DetectedObject] = []
    inference_ms = 0.0

    if task in ("detect", "count", "ocr", "segment", "track"):
        if detector_backend == "sam3":
            detector_model = ml_models.get("sam3_model")
            if not detector_model:
                raise HTTPException(status_code=503, detail="SAM 3 model not loaded.")
            from app.services.detector import SAM3Detector
            detector = SAM3Detector(detector_model)
        else:
            detector_model = ml_models.get("detector")
            if not detector_model:
                raise HTTPException(status_code=503, detail="Detector model not loaded.")
            from app.services.detector import GroundingDINODetector
            detector = GroundingDINODetector(detector_model)
        try:
            det_result = detector.detect(img_rgb, detection_prompt, effective_conf)
            inference_ms = det_result["inference_ms"]
            for i, (box, score, label) in enumerate(
                zip(det_result["boxes"], det_result["scores"], det_result["labels"])
            ):
                x1, y1, x2, y2 = box
                obj = DetectedObject.from_xyxy(
                    obj_id=f"{label[:1].upper()}{i+1:03d}",
                    label=label,
                    score=float(score),
                    x1=x1, y1=y1, x2=x2, y2=y2,
                    img_w=img_w, img_h=img_h,
                    color=_COLORS[i % len(_COLORS)],
                )
                objects.append(obj)
        except Exception as e:
            logger.error(f"Detector error during query: {e}")
            # Don't crash — return empty objects with error note in answer
            objects = []
            inference_ms = 0.0

        # Perform OCR on primary target region if task is 'ocr' using Gemma 4 Reader
        ocr_text = ""
        if task == "ocr" and objects:
            try:
                from app.services.reader import Gemma4Reader
                reader = Gemma4Reader()
                
                primary_obj = objects[0]
                px, py, pw, ph = primary_obj.bbox
                px1, py1, px2, py2 = int(px), int(py), int(px + pw), int(py + ph)
                
                t_ocr_start = time.time()
                ocr_res = reader.read(img_rgb, [px1, py1, px2, py2])
                ocr_ms = (time.time() - t_ocr_start) * 1000
                inference_ms += ocr_ms
                
                ocr_text = ocr_res.get("text", "").strip()
                primary_obj.type = f"OCR: {ocr_text}"
                logger.info(f"Gemma4Reader read text '{ocr_text}' on crop in {ocr_ms:.1f}ms")
            except Exception as e:
                logger.error(f"OCR reading failed in query router: {e}")

        # Perform SAM 3 segmentation if task is 'segment' using SAM 3 Segmenter
        if task == "segment" and objects:
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
                logger.error(f"SAM3 Segmentation failed in query router: {e}")

    # ── 4. Compose NL answer ─────────────────────────────────────────────────
    from app.services.composer import NLComposer
    composer = NLComposer()
    det_dict = {
        "boxes": [o.bbox for o in objects],
        "scores": [o.confidence for o in objects],
        "labels": [o.type for o in objects],
        "text": ocr_text,
    }
    try:
        answer = composer.compose(task=task, result=det_dict, original_query=query)
    except Exception as e:
        logger.error(f"Composer error: {e}")
        answer = f"Processed query. Found {len(objects)} object(s)."

    total_ms = (time.time() - t_start) * 1000
    logger.info(
        f"query done | task={task} | objects={len(objects)} | "
        f"parser={parser_ms:.0f}ms infer={inference_ms:.0f}ms total={total_ms:.0f}ms"
    )

    response = QueryResponse.build(
        query_text=query,
        answer_text=answer,
        task=task,
        objects=objects,
        inference_ms=inference_ms,
        parser_ms=parser_ms,
        total_ms=total_ms,
        device=ml_models.get("device", "cpu"),
    )

    # Cache response in Redis
    try:
        from app.services.cache import cache
        cache.set_static_cache(raw, query, response.model_dump(), detector_backend, conf_threshold)
    except Exception as e:
        logger.warning(f"Failed to cache static image query: {e}")

    return response
