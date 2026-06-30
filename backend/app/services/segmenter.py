import numpy as np
import time
import logging
from app.services.segmenter_base import SegmenterBase

logger = logging.getLogger(__name__)

class SAM2Segmenter(SegmenterBase):
    def __init__(self, model=None):
        self.model = model
        if self.model is None:
            logger.warning("SAM2 model not loaded. Using placeholder/dummy segmentation.")

    def segment(self, image: np.ndarray, boxes: list[list[float]]) -> dict:
        start_time = time.time()
        
        masks = []
        if self.model is None:
            # Placeholder: return a rectangular mask for each box
            height, width = image.shape[:2]
            for box in boxes:
                x1, y1, x2, y2 = map(int, box)
                mask = np.zeros((height, width), dtype=np.uint8)
                mask[max(0, y1):min(height, y2), max(0, x1):min(width, x2)] = 1
                masks.append(mask)
        else:
            # Implement real SAM2 inference here
            pass
            
        return {
            "masks": masks,
            "inference_ms": (time.time() - start_time) * 1000
        }
