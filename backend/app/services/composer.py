import numpy as np
import logging
import cv2
from PIL import Image

from app.services.composer_base import ComposerBase

logger = logging.getLogger(__name__)

class NLComposer(ComposerBase):
    """
    Enhanced track-aware VQA and template-based natural language composer.
    Converts structured detection/OCR/segment results or active track crop images
    into a natural language response using local LLM/VLM (Gemma 4).
    """

    def compose(self, task: str, result: dict, original_query: str) -> str:
        # Check for active track context for track-aware summaries
        track_id = result.get("track_id")
        crop_image = result.get("crop_image")
        active_context = result.get("active_track_context")

        if track_id is not None and crop_image is not None:
            logger.info(f"Composer: Routing active track query to local LLM/VLM (Gemma 4) for track_id={track_id}")
            try:
                # Prepare visual VQA prompt for Gemma 4
                prompt_text = (
                    f"Analyze this cropped image region of the tracked object.\n"
                    f"User Query: {original_query}\n"
                    f"Active Track ID: {track_id}\n"
                )
                if active_context:
                    prompt_text += f"Prior Context/OCR details: {active_context}\n"
                prompt_text += "\nProvide a short, direct, one-sentence answer describing the visual attributes (e.g., color, text, shape) of the object."

                # Convert crop image to RGB PIL image if needed
                if isinstance(crop_image, np.ndarray):
                    crop_rgb = cv2.cvtColor(crop_image, cv2.COLOR_BGR2RGB)
                    crop_pil = Image.fromarray(crop_rgb)
                else:
                    crop_pil = crop_image

                from app.services.gemma4 import Gemma4Service
                gemma_svc = Gemma4Service()
                res = gemma_svc.process(crop_pil, prompt_text)
                text_out = res.get("text", "").strip()
                if text_out:
                    return text_out
            except Exception as e:
                logger.error(f"Composer local LLM VQA failed: {e}. Falling back to template-based compose.")

        # Fallback to standard rule-based templates
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
            try:
                from app.services.gemma4 import Gemma4Service
                gemma_svc = Gemma4Service()
                composed_ans = gemma_svc.compose_text_response(original_query, text)
                if composed_ans:
                    return composed_ans
            except Exception as e:
                logger.error(f"Failed to dynamically compose OCR response: {e}")
            q_lower = original_query.lower()
            if "plate" in q_lower or "license" in q_lower:
                return f"The number on the number plate is: {text}!"
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

        # General Fallback
        return f"Processing complete. {count} result(s) found for query: '{original_query}'."
