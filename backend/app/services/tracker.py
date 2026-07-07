import logging
from typing import Literal, Any
import numpy as np
from boxmot.trackers.bbox.botsort.botsort import BotSort
from boxmot.trackers.bbox.bytetrack.bytetrack import ByteTrack

from .tracker_base import TrackerBase

logger = logging.getLogger(__name__)

class ConcreteTracker(TrackerBase):
    def __init__(
        self,
        method: Literal["botsort", "bytetrack"] = "botsort",
        frame_rate: int = 30,
        **kwargs: Any
    ):
        """
        Initializes concrete tracker using boxmot BotSort or ByteTrack.
        ReID is disabled by default to save VRAM and computing resources.
        """
        self.method = method
        self.frame_rate = frame_rate
        
        logger.info(f"Initializing ConcreteTracker: method={method}, frame_rate={frame_rate}")
        
        if method == "botsort":
            # Force with_reid=False to prevent downloading heavy ReID models
            self.tracker = BotSort(
                with_reid=False,
                frame_rate=frame_rate,
                **kwargs
            )
        else:
            self.tracker = ByteTrack(
                frame_rate=frame_rate,
                **kwargs
            )

    def update(self, dets: np.ndarray, img: np.ndarray) -> np.ndarray:
        """
        Updates the tracker with frame detections.
        
        Args:
            dets: numpy array of shape (N, 6) -> [x1, y1, x2, y2, score, class_id]
            img: BGR numpy image frame
            
        Returns:
            numpy array of shape (M, 7) -> [x1, y1, x2, y2, track_id, score, class_id]
        """
        if dets.shape[0] == 0:
            # Maintain tracker updates even without active detections
            empty_dets = np.empty((0, 6), dtype=np.float32)
            res = self.tracker.update(empty_dets, img)
        else:
            res = self.tracker.update(dets, img)
            
        if len(res) == 0:
            return np.empty((0, 7), dtype=np.float32)
            
        arr = np.array(res, dtype=np.float32)
        # Slice to return standard x1, y1, x2, y2, track_id, score, class_id
        return arr[:, :7]
