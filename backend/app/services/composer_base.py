from abc import ABC, abstractmethod

class ComposerBase(ABC):
    """
    Base class for generating natural language responses based on vision outputs.
    """

    @abstractmethod
    def compose(self, task: str, result: dict, original_query: str) -> str:
        """
        Composes a natural language sentence answering the user's original query.

        Args:
            task (str): The task that was executed (e.g., "detect", "ocr").
            result (dict): The result dictionary from the pipeline execution.
            original_query (str): The raw query originally provided by the user.

        Returns:
            str: A single natural language sentence summarizing the result.
        """
        pass
