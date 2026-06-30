from abc import ABC, abstractmethod

class QueryParserBase(ABC):
    """
    Base class for parsing raw natural language queries into structured task representations.
    
    Note: The parser is NOT a Vision-Language Model. It is a cheap, fast routing and 
    normalization step (using Regex, NLP, or a small LLM API) to determine what task 
    the system should perform and what clean prompt should be sent to the actual VLM 
    (detector/segmenter). The VLM receives the clean `prompt`, not the `raw_query`.
    """

    @abstractmethod
    def parse(self, raw_query: str) -> dict:
        """
        Parses a raw natural language query.

        Args:
            raw_query (str): The raw input string from the user (e.g., "Find the red car's license plate").

        Returns:
            dict: A structured dictionary representing the parsed task, with the following keys:
                - task (str): One of "detect", "segment", "track", "ocr", "describe".
                - prompt (str): A cleaned, model-ready version of the target description 
                                (e.g., "red car").
                - attribute (str | None): What to read or extract, null if not applicable 
                                          (e.g., "license plate").
                - conf_threshold (float): Default confidence threshold, typically 0.35.
        """
        pass
