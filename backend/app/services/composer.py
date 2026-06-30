from app.services.composer_base import ComposerBase

class NLComposer(ComposerBase):
    def __init__(self):
        pass

    def compose(self, task: str, result: dict, original_query: str) -> str:
        """
        Simple template-based composer.
        """
        if task == "detect":
            boxes = result.get("boxes", [])
            count = len(boxes)
            if count == 0:
                return f"I could not find any objects matching '{original_query}'."
            return f"I found {count} instances matching '{original_query}'."
            
        elif task == "ocr":
            text = result.get("text", "")
            return f"The extracted text is: '{text}'."
            
        return "Task completed successfully."
