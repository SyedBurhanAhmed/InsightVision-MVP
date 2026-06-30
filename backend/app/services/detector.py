import os
import time
import torch
import logging
import numpy as np
from PIL import Image

# Grounding DINO imports
from groundingdino.util.inference import predict
import groundingdino.datasets.transforms as T

from .detector_base import DetectorBase
from app.core.config import settings

logger = logging.getLogger(__name__)

class GroundingDINODetector(DetectorBase):
    def __init__(self, model):
        """
        Initializes the detector with a pre-loaded model.
        The model is loaded in the FastAPI lifespan to prevent per-request loading.
        """
        self.model = model
        
        # Check CPU vs GPU
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.device == "cpu":
            logger.warning("Running Grounding DINO on CPU — latency will be high, for integration testing only")
        
    def detect(self, image: np.ndarray, prompt: str, conf_threshold: float = None) -> dict:
        start_time = time.time()
        
        box_thresh = conf_threshold if conf_threshold is not None else settings.BOX_THRESHOLD
        text_thresh = settings.TEXT_THRESHOLD
        
        # Grounding DINO transform
        transform = T.Compose([
            T.RandomResize([800], max_size=1333),
            T.ToTensor(),
            T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
        
        # Convert np.ndarray to PIL Image
        # Assuming input is BGR or RGB depending on caller, but PIL expects RGB
        # If the input comes from OpenCV, it might be BGR. 
        # But we'll assume it's converted to RGB before calling, or we handle it here if it's BGR.
        # Standard approach: assume RGB.
        image_pil = Image.fromarray(image).convert("RGB")
        image_transformed, _ = transform(image_pil, None)
        
        # Run inference
        boxes, logits, phrases = predict(
            model=self.model,
            image=image_transformed,
            caption=prompt,
            box_threshold=box_thresh,
            text_threshold=text_thresh,
            device=self.device
        )
        
        # Convert normalized [cx, cy, w, h] back to absolute [x1, y1, x2, y2]
        h, w, _ = image.shape
        boxes = boxes * torch.Tensor([w, h, w, h])
        
        xyxy = []
        for box in boxes:
            cx, cy, bw, bh = box
            x1 = cx - bw / 2
            y1 = cy - bh / 2
            x2 = cx + bw / 2
            y2 = cy + bh / 2
            xyxy.append([float(x1), float(y1), float(x2), float(y2)])
            
        inference_ms = (time.time() - start_time) * 1000
        
        return {
            "boxes": xyxy,
            "scores": logits.tolist(),
            "labels": phrases,
            "inference_ms": inference_ms
        }
