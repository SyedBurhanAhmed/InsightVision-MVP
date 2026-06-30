from abc import ABC, abstractmethod

class TrackerBase(ABC):
    """
    Base class for multi-object tracking algorithms (e.g., ByteTrack, DeepSORT).
    """

    @abstractmethod
    def update(self, detections: dict, frame_id: int) -> dict:
        """
        Updates internal tracker state with new detections and returns tracked objects.

        Args:
            detections (dict): The output dictionary from the detector, containing:
                               'boxes', 'scores', 'labels'.
            frame_id (int): The current frame number in the sequence.

        Returns:
            dict: A dictionary containing tracking results:
                - tracks (list[dict]): A list of tracked objects, where each dict has:
                    - track_id (int): Unique identifier for the tracked object.
                    - box (list[float]): Bounding box [x1, y1, x2, y2].
                    - score (float): Confidence score.
                    - label (str): Object class or description.
                - inference_ms (float): Inference time in milliseconds.
        """
        pass
