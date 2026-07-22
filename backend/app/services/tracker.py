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
                track_buffer=60,
                **kwargs
            )
        else:
            self.tracker = ByteTrack(
                frame_rate=frame_rate,
                track_buffer=60,
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
            res_arr = np.empty((0, 7), dtype=np.float32)
        else:
            res_arr = np.array(res, dtype=np.float32)[:, :7]
            
        # BoxMOT drops unmatched tracks into lost_stracks. Since we rely on 
        # Kalman filter propagation without running the heavy localizer per frame,
        # we must extract the predicted bounding boxes of these lost tracks.
        lost_rows = []
        if hasattr(self.tracker, 'lost_stracks'):
            for t in self.tracker.lost_stracks:
                try:
                    xyxy = t.xyxy
                    track_id = getattr(t, 'id', getattr(t, 'track_id', 0))
                    score = getattr(t, 'score', 0.0)
                    cls = getattr(t, 'cls', 0)
                    lost_rows.append([xyxy[0], xyxy[1], xyxy[2], xyxy[3], track_id, score, cls])
                except Exception:
                    pass
                    
        if lost_rows:
            lost_arr = np.array(lost_rows, dtype=np.float32)
            if res_arr.shape[0] == 0:
                res_arr = lost_arr
            else:
                res_arr = np.vstack((res_arr, lost_arr))
                
        return res_arr
