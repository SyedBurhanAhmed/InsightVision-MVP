import logging
from typing import Dict, Any, List
import numpy as np

from .tracker import ConcreteTracker

logger = logging.getLogger(__name__)

class TrackManager:
    def __init__(self, method: str = "botsort", frame_rate: int = 30):
        """
        Manages active tracking sessions, mapping stream/session IDs to active tracker instances.
        """
        self.method = method
        self.frame_rate = frame_rate
        self.trackers: Dict[str, ConcreteTracker] = {}
        self.active_tracks: Dict[str, Dict[int, str]] = {}
        self.history_buffers: Dict[str, List[Dict[str, Any]]] = {}
        self.last_confidences: Dict[str, Dict[int, float]] = {}

    def get_or_create_tracker(self, session_id: str) -> ConcreteTracker:
        """
        Retrieves or instantiates an active tracker for a specific session.
        """
        if session_id not in self.trackers:
            logger.info(f"Creating new tracker session: {session_id} using {self.method}")
            self.trackers[session_id] = ConcreteTracker(
                method=self.method,
                frame_rate=self.frame_rate
            )
            self.active_tracks[session_id] = {}
            self.history_buffers[session_id] = []
        return self.trackers[session_id]

    def update_track(
        self,
        session_id: str,
        dets: np.ndarray,
        img: np.ndarray,
        labels_map: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Updates tracker state for a session with current detections.
        
        Args:
            session_id: unique session or stream identifier
            dets: numpy array of shape (N, 6) -> [[x1, y1, x2, y2, score, class_id], ...]
            img: current BGR frame image
            labels_map: list of label names mapping index class_id -> label text
            
        Returns:
            List of dictionaries representing active tracked objects
        """
        tracker = self.get_or_create_tracker(session_id)
        logger.info(f"[TrackManager] Running tracker.update, dets shape={dets.shape}")
        tracks = tracker.update(dets, img)
        logger.info(f"[TrackManager] Done tracker.update, tracks size={len(tracks)}")
        
        output = []
        for row in tracks:
            x1, y1, x2, y2, track_id, score, class_id = row
            track_id_int = int(track_id)
            class_id_int = int(class_id)
            
            # Retrieve label text
            label_name = "object"
            if 0 <= class_id_int < len(labels_map):
                label_name = labels_map[class_id_int]
                
            # Maintain label mapping for persistence
            self.active_tracks[session_id][track_id_int] = label_name
            
            if session_id not in self.last_confidences:
                self.last_confidences[session_id] = {}
            score_val = float(score)
            if score_val > 0.01:
                self.last_confidences[session_id][track_id_int] = score_val
            else:
                score_val = self.last_confidences[session_id].get(track_id_int, 0.0)

            output.append({
                "bbox": [float(x1), float(y1), float(x2 - x1), float(y2 - y1)],
                "track_id": track_id_int,
                "label": label_name,
                "confidence": score_val
            })
            
        # Maintain sliding history buffer (cap at 30 frames)
        if session_id not in self.history_buffers:
            self.history_buffers[session_id] = []
        self.history_buffers[session_id].append({
            "frame": img.copy(),
            "tracks": output
        })
        if len(self.history_buffers[session_id]) > 30:
            self.history_buffers[session_id].pop(0)
            
        return output

    def clear_session(self, session_id: str):
        """
        Clears resource allocations for a completed session.
        """
        if session_id in self.trackers:
            logger.info(f"Clearing tracker session: {session_id}")
            del self.trackers[session_id]
        if session_id in self.active_tracks:
            del self.active_tracks[session_id]
        if session_id in self.history_buffers:
            del self.history_buffers[session_id]
        if session_id in self.last_confidences:
            del self.last_confidences[session_id]
