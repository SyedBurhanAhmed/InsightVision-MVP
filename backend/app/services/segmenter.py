import numpy as np
import time
import logging
import cv2
from PIL import Image
from typing import Any

from app.services.segmenter_base import SegmenterBase

logger = logging.getLogger(__name__)

class SAM2Segmenter(SegmenterBase):
    def __init__(self, model_path: str = "sam2.1_t.pt"):
        """
        SAM2.1-based Segmenter wrapper using ultralytics.
        """
        self.model_path = model_path
        self.model = None

    def load_model(self):
        if self.model is None:
            from ultralytics import SAM
            logger.info(f"Loading SAM2 model '{self.model_path}'...")
            t0 = time.time()
            self.model = SAM(self.model_path)
            logger.info(f"SAM2 model loaded in {time.time() - t0:.1f}s.")

    def segment(self, image: np.ndarray, boxes: list[list[float]]) -> dict:
        """
        Generates segmentation masks for given bounding boxes in an image.
        
        Args:
            image: input image as NumPy array (H, W, C)
            boxes: List of bounding boxes [[x1, y1, x2, y2], ...]
        """
        start_time = time.time()
        self.load_model()
        
        masks = []
        h, w = image.shape[:2]
        
        if not boxes:
            return {
                "masks": [],
                "inference_ms": (time.time() - start_time) * 1000
            }
            
        try:
            # Convert to RGB format required by SAM2
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = self.model.predict(image_rgb, bboxes=boxes, verbose=False)
            
            for res in results:
                if res.masks is not None:
                    for mask_tensor in res.masks.data:
                        mask_np = mask_tensor.cpu().numpy().astype(np.uint8)
                        # Match original image shape
                        if mask_np.shape[:2] != (h, w):
                            mask_np = cv2.resize(mask_np, (w, h), interpolation=cv2.INTER_NEAREST)
                        masks.append(mask_np)
                else:
                    masks.append(np.zeros((h, w), dtype=np.uint8))
        except Exception as e:
            logger.error(f"SAM2 segmentation failed: {e}")
            for box in boxes:
                x1, y1, x2, y2 = map(int, box)
                mask = np.zeros((h, w), dtype=np.uint8)
                mask[max(0, y1):min(h, y2), max(0, x1):min(w, x2)] = 1
                masks.append(mask)
                
        return {
            "masks": masks,
            "inference_ms": (time.time() - start_time) * 1000
        }

    def segment_track(self, session_id: str, track_id: int, track_manager: Any, current_frame: np.ndarray) -> dict:
        """
        Pulls the current bbox for track_id from the track_manager's active registry,
        segments it, and returns the binary mask.
        """
        t0 = time.time()
        tracker = track_manager.trackers.get(session_id)
        if not tracker:
            logger.warning(f"No tracker active for session {session_id}")
            return {"mask": None, "inference_ms": (time.time() - t0) * 1000}
            
        buffer = track_manager.history_buffers.get(session_id, [])
        if not buffer:
            logger.warning(f"No history frame buffer found for session {session_id}")
            return {"mask": None, "inference_ms": (time.time() - t0) * 1000}
            
        latest_item = buffer[-1]
        active_bbox = None
        for track_obj in latest_item["tracks"]:
            if track_obj["track_id"] == track_id:
                # BBox in registry is [x, y, w, h] absolute pixels
                x, y, w, h = track_obj["bbox"]
                active_bbox = [x, y, x + w, y + h]
                break
                
        if active_bbox is None:
            logger.warning(f"Track_id {track_id} not found in latest frame registry of session {session_id}")
            return {"mask": None, "inference_ms": (time.time() - t0) * 1000}
            
        res = self.segment(current_frame, [active_bbox])
        masks = res.get("masks", [])
        mask = masks[0] if masks else None
        
        return {
            "mask": mask,
            "inference_ms": (time.time() - t0) * 1000
        }


class SAM3Segmenter(SegmenterBase):
    def __init__(self):
        """
        SAM3-based Segmenter wrapper.
        Requires 'sam3' package and HuggingFace authentication with access approval.
        """
        self.model = None
        self.processor = None

    def load_model(self):
        if self.model is None:
            from app.core.state import ml_models
            self.model = ml_models.get("sam3_model")
            self.processor = ml_models.get("sam3_processor")
            
            if self.model is None:
                try:
                    from sam3.model_builder import build_sam3_image_model
                    from sam3.model.sam3_image_processor import Sam3Processor
                    logger.info("Loading SAM3 model (fallback loading)...")
                    t0 = time.time()
                    self.model = build_sam3_image_model()
                    self.processor = Sam3Processor(self.model)
                    logger.info(f"SAM3 model loaded in {time.time() - t0:.1f}s.")
                except ImportError as e:
                    logger.error(f"SAM3 import failed: {e}. Ensure you are in the python 3.12 environment and 'sam3' is installed.")
                    raise ImportError("sam3 package not found. Run 'pip install -e .' in the cloned sam3 repo.")

    def segment(self, image: np.ndarray, boxes: list[list[float]]) -> dict:
        """
        Generates segmentation masks using SAM3 model.
        """
        start_time = time.time()
        self.load_model()
        
        masks = []
        h, w = image.shape[:2]
        
        if not boxes:
            return {
                "masks": [],
                "inference_ms": (time.time() - start_time) * 1000
            }
            
        image_pil = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        try:
            import torch
            with torch.no_grad():
                with torch.amp.autocast("cuda", dtype=torch.bfloat16):
                    inference_state = self.processor.set_image(image_pil)
                    for box in boxes:
                        # Normalize box to cx, cy, w_norm, h_norm in range [0, 1]
                        x1, y1, x2, y2 = box
                        cx = ((x1 + x2) / 2.0) / w
                        cy = ((y1 + y2) / 2.0) / h
                        w_norm = (x2 - x1) / w
                        h_norm = (y2 - y1) / h
                        normalized_box = [cx, cy, w_norm, h_norm]
                        
                        self.processor.reset_all_prompts(inference_state)
                        
                        output = self.processor.add_geometric_prompt(
                            box=normalized_box, label=True, state=inference_state
                        )
                        if "masks" in output and len(output["masks"]) > 0:
                            sam_boxes = output.get("boxes", [])
                            best_idx = 0
                            best_iou = -1.0
                            
                            if len(sam_boxes) > 0:
                                for idx, sbox in enumerate(sam_boxes):
                                    if isinstance(sbox, torch.Tensor):
                                        sbox = sbox.cpu().float().numpy()
                                    sx1, sy1, sx2, sy2 = sbox
                                    
                                    # Compute intersection with prompt box
                                    ix1 = max(x1, sx1)
                                    iy1 = max(y1, sy1)
                                    ix2 = min(x2, sx2)
                                    iy2 = min(y2, sy2)
                                    
                                    iw = max(0.0, ix2 - ix1)
                                    ih = max(0.0, iy2 - iy1)
                                    intersection = iw * ih
                                    
                                    # Compute union
                                    area_track = (x2 - x1) * (y2 - y1)
                                    area_sam = (sx2 - sx1) * (sy2 - sy1)
                                    union = area_track + area_sam - intersection
                                    
                                    iou = intersection / union if union > 0 else 0.0
                                    
                                    if iou > best_iou:
                                        best_iou = iou
                                        best_idx = idx
                            
                            mask = output["masks"][best_idx]
                            if isinstance(mask, torch.Tensor):
                                mask = mask.cpu().float().numpy().astype(np.uint8)
                            if len(mask.shape) == 3 and mask.shape[0] == 1:
                                mask = mask[0]
                            masks.append(mask)
                        else:
                            masks.append(np.zeros((h, w), dtype=np.uint8))
        except Exception as e:
            logger.error(f"SAM3 segmentation failed: {e}")
            # Fallback
            for box in boxes:
                x1, y1, x2, y2 = map(int, box)
                mask = np.zeros((h, w), dtype=np.uint8)
                mask[max(0, y1):min(h, y2), max(0, x1):min(w, x2)] = 1
                masks.append(mask)
                
        return {
            "masks": masks,
            "inference_ms": (time.time() - start_time) * 1000
        }

    def segment_track(self, session_id: str, track_id: int, track_manager: Any, current_frame: np.ndarray) -> dict:
        """
        Pulls the current bbox for track_id from the track_manager's active registry,
        segments it using SAM3, and returns the binary mask.
        """
        t0 = time.time()
        tracker = track_manager.trackers.get(session_id)
        if not tracker:
            logger.warning(f"No tracker active for session {session_id}")
            return {"mask": None, "inference_ms": (time.time() - t0) * 1000}
            
        buffer = track_manager.history_buffers.get(session_id, [])
        if not buffer:
            logger.warning(f"No history frame buffer found for session {session_id}")
            return {"mask": None, "inference_ms": (time.time() - t0) * 1000}
            
        latest_item = buffer[-1]
        active_bbox = None
        for track_obj in latest_item["tracks"]:
            if track_obj["track_id"] == track_id:
                x, y, w, h = track_obj["bbox"]
                active_bbox = [x, y, x + w, y + h]
                break
                
        if active_bbox is None:
            logger.warning(f"Track_id {track_id} not found in latest frame registry of session {session_id}")
            return {"mask": None, "inference_ms": (time.time() - t0) * 1000}
            
        res = self.segment(current_frame, [active_bbox])
        masks = res.get("masks", [])
        mask = masks[0] if masks else None
        
        return {
            "mask": mask,
            "inference_ms": (time.time() - t0) * 1000
        }
