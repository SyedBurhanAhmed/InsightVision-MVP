import time
import logging
from app.services.tracker_base import TrackerBase
import supervision as sv

logger = logging.getLogger(__name__)

class ByteTrackerService(TrackerBase):
    def __init__(self):
        self.tracker = sv.ByteTrack()

    def update(self, detections: dict, frame_id: int) -> dict:
        start_time = time.time()
        
        # Convert detection dict to supervision Detections object
        import numpy as np
        
        boxes = np.array(detections.get("boxes", []))
        confidence = np.array(detections.get("scores", []))
        class_id = np.zeros(len(boxes), dtype=int) # dummy class id since tracking usually relies on boxes
        
        if len(boxes) == 0:
            return {
                "tracks": [],
                "inference_ms": (time.time() - start_time) * 1000
            }

        sv_detections = sv.Detections(
            xyxy=boxes,
            confidence=confidence,
            class_id=class_id
        )
        
        tracked_detections = self.tracker.update_with_detections(sv_detections)
        
        tracks = []
        for i, (xyxy, mask, conf, cid, tracker_id, data) in enumerate(tracked_detections):
            tracks.append({
                "track_id": tracker_id,
                "box": xyxy.tolist(),
                "score": float(conf) if conf is not None else 1.0,
                "label": "tracked_object"
            })
            
        return {
            "tracks": tracks,
            "inference_ms": (time.time() - start_time) * 1000
        }
