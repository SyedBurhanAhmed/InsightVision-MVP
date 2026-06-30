from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
import cv2
import time
from app.core.state import ml_models
from app.services.detector import GroundingDINODetector

router = APIRouter()

@router.post("/detect")
async def detect_objects(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    conf_threshold: float = Form(0.35)
):
    start_time = time.time()
    
    if not ml_models.get("detector"):
        raise HTTPException(status_code=503, detail="Detector model not loaded.")
        
    # Read image
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Invalid image file.")
        
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    
    # Run detector
    detector = GroundingDINODetector(ml_models["detector"])
    try:
        results = detector.detect(img_rgb, prompt, conf_threshold)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # Format response for frontend
    detected_objects = []
    for i, (box, score, label) in enumerate(zip(results["boxes"], results["scores"], results["labels"])):
        x1, y1, x2, y2 = box
        detected_objects.append({
            "id": i + 1,
            "class": label,
            "confidence": score,
            "bbox": [x1, y1, x2 - x1, y2 - y1],  # Frontend expects [x, y, w, h] format! Wait, earlier it was [x, y, w, h] in the mock data?
            # Mock data: [120, 80, 200, 350] -> x, y, width, height. Let's use x, y, w, h.
            "color": "#00D4FF"  # Default color
        })
        
    return JSONResponse({
        "objects": detected_objects,
        "inference_ms": results["inference_ms"],
        "total_ms": (time.time() - start_time) * 1000
    })
