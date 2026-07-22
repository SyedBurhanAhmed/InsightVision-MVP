from abc import ABC, abstractmethod
import numpy as np

class SegmenterBase(ABC):
    """
    Base class for image segmentation models (e.g., Segment Anything).
    """

    @abstractmethod
    def segment(self, image: np.ndarray, boxes: list[list[float]]) -> dict:
        """
        Generates segmentation masks for given bounding boxes in an image.

        Args:
            image (np.ndarray): The input image as a NumPy array (H, W, C).
            boxes (list[list[float]]): List of bounding boxes [[x1, y1, x2, y2], ...].

        Returns:
            dict: A dictionary containing the segmentation results:
                - masks (list[np.ndarray]): One binary mask per input box, same HxW as the image.
                - inference_ms (float): Inference time in milliseconds.
        """
        pass
