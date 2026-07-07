from abc import ABC, abstractmethod
import numpy as np

class TrackerBase(ABC):
    @abstractmethod
    def update(self, dets: np.ndarray, img: np.ndarray) -> np.ndarray:
        """
        Update tracker state with new bounding box detections.
        
        Args:
            dets: numpy array of shape (N, 6) -> [[x1, y1, x2, y2, score, class_id], ...]
            img: BGR image numpy array of shape (H, W, 3)
            
        Returns:
            numpy array of shape (M, 7) -> [[x1, y1, x2, y2, track_id, score, class_id], ...]
        """
        pass
