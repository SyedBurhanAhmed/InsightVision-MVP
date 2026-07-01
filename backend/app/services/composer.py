from app.services.composer_base import ComposerBase


class NLComposer(ComposerBase):
    """
    Template-based natural language composer.
    Converts structured detection/OCR/segment results into one clear sentence.
    One template per task type, per Prompt 7 requirements.
    """

    def compose(self, task: str, result: dict, original_query: str) -> str:
        boxes = result.get("boxes", [])
        labels = result.get("labels", [])
        scores = result.get("scores", [])
        count = len(boxes)

        if task == "detect":
            if count == 0:
                return f"No objects matching '{original_query}' were detected in this image."
            label_list = ", ".join(
                f"{lbl} ({sc:.0%})" for lbl, sc in zip(labels[:5], scores[:5])
            )
            suffix = f" and {count - 5} more" if count > 5 else ""
            return (
                f"Detected {count} object(s) matching '{original_query}': "
                f"{label_list}{suffix}."
            )

        elif task == "count":
            if count == 0:
                return f"Zero objects matching '{original_query}' found in the scene."
            return f"There {'is' if count == 1 else 'are'} {count} {original_query}(s) visible in this image."

        elif task == "ocr":
            text = result.get("text", "").strip()
            if not text:
                return "No readable text was found in the specified region."
            return f"The extracted text reads: \"{text}\"."

        elif task == "segment":
            if count == 0:
                return f"Could not isolate a pixel mask for '{original_query}' — no matching region detected."
            return (
                f"Segmentation complete. {count} region(s) matching '{original_query}' "
                f"have been masked in the output."
            )

        elif task == "track":
            if count == 0:
                return f"No trackable object matching '{original_query}' found in this frame."
            return (
                f"Tracking initiated for {count} object(s) matching '{original_query}'. "
                f"Object IDs assigned for cross-frame tracking."
            )

        elif task == "describe":
            if count > 0:
                unique_labels = list(dict.fromkeys(labels))[:6]
                obj_str = ", ".join(unique_labels)
                return (
                    f"The scene contains {count} detected object(s) including: {obj_str}. "
                    f"Scene analysis complete."
                )
            return (
                "Scene captured. No specific objects were detected at the current "
                "confidence threshold. Adjust threshold or query for more detail."
            )

        # Fallback
        return f"Processing complete. {count} result(s) found for query: '{original_query}'."
