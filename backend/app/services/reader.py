import numpy as np
import time
import logging
import re
import cv2
from PIL import Image
from typing import Any

from app.services.reader_base import ReaderBase
from app.services.gemma4 import Gemma4Service

logger = logging.getLogger(__name__)

class Gemma4Reader(ReaderBase):
    def __init__(self, gemma_svc: Gemma4Service = None):
        """
        Gemma 4-based local VQA/OCR Reader.
        """
        self.gemma_svc = gemma_svc or Gemma4Service()

    def read(self, image: np.ndarray, box: list[float]) -> dict:
        """
        Reads text/license plate characters from a cropped bounding box region.
        
        Args:
            image: Full frame image in BGR format
            box: Bounding box [x1, y1, x2, y2] in absolute pixels
        """
        start_time = time.time()
        x1, y1, x2, y2 = map(int, box)
        h, w = image.shape[:2]
        
        # Clip boundaries to prevent out-of-bounds slicing
        x1 = max(0, min(w - 1, x1))
        y1 = max(0, min(h - 1, y1))
        x2 = max(0, min(w, x2))
        y2 = max(0, min(h, y2))
        
        if x2 <= x1 or y2 <= y1:
            return {
                "text": "",
                "confidence": 0.0,
                "inference_ms": (time.time() - start_time) * 1000
            }
            
        crop = image[y1:y2, x1:x2]
        crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        crop_pil = Image.fromarray(crop_rgb)
        
        try:
            # Route crop to local Gemma 4 model
            res = self.gemma_svc.process(crop_pil, "Read the characters on the license plate or text region.")
            text_out = res["text"] if res["text"] else ""
            return {
                "text": text_out,
                "confidence": 0.95,  # Default score for successfully generated answer
                "inference_ms": (time.time() - start_time) * 1000
            }
        except Exception as e:
            logger.error(f"Gemma4Reader single crop read failed: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "inference_ms": (time.time() - start_time) * 1000
            }

    def read_track(self, session_id: str, track_id: int, track_manager: Any) -> dict:
        """
        Pulls history frames of the track, samples 4-5 crops, runs Gemma 4 OCR,
        and aggregates outputs using majority voting.
        """
        t0 = time.time()
        buffer = getattr(track_manager, "history_buffers", {}).get(session_id, [])
        
        # Find all frames where this track_id is present
        matched_samples = []
        for item in buffer:
            frame_img = item["frame"]
            for track_obj in item["tracks"]:
                if track_obj["track_id"] == track_id:
                    # track_manager stores bbox as [x, y, w, h] absolute pixels
                    x, y, w, h = track_obj["bbox"]
                    x1, y1, x2, y2 = x, y, x + w, y + h
                    matched_samples.append((frame_img, [x1, y1, x2, y2]))
                    break
                    
        if not matched_samples:
            logger.warning(f"No history found for track_id {track_id} in session {session_id}")
            return {
                "text": "",
                "vote_count": 0,
                "total_samples": 0,
                "confidence": 0.0,
                "low_confidence": True,
                "latency_ms": (time.time() - t0) * 1000
            }
            
        # Sample up to 3 frames evenly spaced
        num_samples = min(3, len(matched_samples))
        indices = np.linspace(0, len(matched_samples) - 1, num_samples, dtype=int)
        
        raw_outputs = []
        for idx in indices:
            frame_img, bbox = matched_samples[idx]
            ocr_res = self.read(frame_img, bbox)
            raw_text = ocr_res["text"]
            # Normalize raw output
            normalized_text = re.sub(r'[^A-Za-z0-9]', '', raw_text).upper().strip()
            if normalized_text:
                raw_outputs.append((normalized_text, raw_text))
                
        if not raw_outputs:
            return {
                "text": "",
                "vote_count": 0,
                "total_samples": num_samples,
                "confidence": 0.0,
                "low_confidence": True,
                "latency_ms": (time.time() - t0) * 1000
            }
            
        # Perform majority voting
        from collections import Counter
        norm_texts = [pair[0] for pair in raw_outputs]
        counts = Counter(norm_texts)
        most_common = counts.most_common()
        
        winner_norm, win_count = most_common[0]
        # Find original raw text for winner
        winner_raw = ""
        for norm, raw in raw_outputs:
            if norm == winner_norm:
                winner_raw = raw
                break
                
        total_valid = len(norm_texts)
        confidence = win_count / total_valid
        
        # Check for ties or low confidence
        low_confidence = False
        if len(most_common) > 1 and most_common[0][1] == most_common[1][1]:
            # Tie: select first one and flag low confidence
            low_confidence = True
            
        if win_count < (total_valid / 2):
            low_confidence = True
            
        return {
            "text": winner_raw,
            "vote_count": win_count,
            "total_samples": total_valid,
            "confidence": confidence,
            "low_confidence": low_confidence,
            "latency_ms": (time.time() - t0) * 1000
        }
