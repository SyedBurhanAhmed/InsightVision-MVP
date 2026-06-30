import numpy as np
import time
import logging
from app.services.reader_base import ReaderBase

logger = logging.getLogger(__name__)

class EasyOCRReader(ReaderBase):
    def __init__(self, reader=None):
        self.reader = reader
        if self.reader is None:
            logger.warning("OCR Reader model not loaded. Using placeholder.")

    def read(self, image: np.ndarray, box: list[float]) -> dict:
        start_time = time.time()
        
        if self.reader is None:
            return {
                "text": "MOCK_TEXT_123",
                "confidence": 0.99,
                "inference_ms": (time.time() - start_time) * 1000
            }
            
        # Implement real OCR here
        return {
            "text": "",
            "confidence": 0.0,
            "inference_ms": (time.time() - start_time) * 1000
        }
