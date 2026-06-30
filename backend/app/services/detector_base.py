from abc import ABC, abstractmethod
import numpy as np

class DetectorBase(ABC):
    """
    Base class for object detection models (e.g., YOLO, Grounding DINO).
    """

    @abstractmethod
    def detect(self, image: np.ndarray, prompt: str, conf_threshold: float) -> dict:
        """
        Detects objects in an image based on a text prompt.

        Args:
            image (np.ndarray): The input image as a NumPy array (H, W, C).
            prompt (str): The text prompt describing what to detect (e.g., "person", "red car").
            conf_threshold (float): Minimum confidence threshold for detections.

        Returns:
            dict: A dictionary containing the detection results:
                - boxes (list[list[float]]): Bounding boxes in pixel coords [[x1, y1, x2, y2], ...].
                - scores (list[float]): Confidence scores for each box.
                - labels (list[str]): Class labels or text prompts for each box.
                - inference_ms (float): Inference time in milliseconds.
        """
        pass
