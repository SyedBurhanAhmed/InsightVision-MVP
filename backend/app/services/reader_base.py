from abc import ABC, abstractmethod
import numpy as np

class ReaderBase(ABC):
    """
    Base class for OCR or Visual Question Answering models to read text/attributes.
    """

    @abstractmethod
    def read(self, image: np.ndarray, box: list[float]) -> dict:
        """
        Reads text or extracts specific attributes from a cropped region of an image.

        Args:
            image (np.ndarray): The full input image as a NumPy array.
            box (list[float]): Bounding box [x1, y1, x2, y2] to crop and read from.

        Returns:
            dict: A dictionary containing the read results:
                - text (str): The extracted text or description.
                - confidence (float): Confidence score of the extraction.
                - inference_ms (float): Inference time in milliseconds.
        """
        pass
