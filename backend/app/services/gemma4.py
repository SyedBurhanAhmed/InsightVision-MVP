import time
import logging
import re
import torch
from PIL import Image
from typing import Dict, Any
from transformers import AutoProcessor
import transformers
if hasattr(transformers, "AutoModelForImageTextToText"):
    from transformers import AutoModelForImageTextToText as VisionModelClass
else:
    from transformers import AutoModelForVision2Seq as VisionModelClass

logger = logging.getLogger(__name__)

class Gemma4Service:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(Gemma4Service, cls).__new__(cls, *args, **kwargs)
            cls._instance.model = None
            cls._instance.processor = None
            cls._instance.model_id = "google/gemma-4-E2B-it"
        return cls._instance

    def load_model(self):
        if self.model is not None:
            return
            
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading Gemma 4 model '{self.model_id}' on {device}...")
        t0 = time.time()
        try:
            self.processor = AutoProcessor.from_pretrained(self.model_id)
            self.model = VisionModelClass.from_pretrained(
                self.model_id,
                torch_dtype=torch.bfloat16,
                device_map="auto",
                attn_implementation="sdpa"
            )
            logger.info(f"Gemma 4 model loaded in {time.time() - t0:.1f}s.")
        except Exception as e:
            logger.error(f"Failed to load Gemma 4 model: {e}")
            raise e

    def process(self, image: Image.Image, prompt: str) -> Dict[str, Any]:
        """
        Processes image and query through the Gemma 4 multimodal model.
        Returns:
            dict containing parsed bounding boxes or text strings.
        """
        self.load_model()
        
        # Determine prompt suffix for local model structure instructions
        prompt_lower = prompt.lower()
        is_ocr = any(k in prompt_lower for k in ["read", "ocr", "text", "plate", "license"])
        
        if is_ocr:
            prompt_instruction = f"{prompt}. Return ONLY the text you see."
        else:
            prompt_instruction = f"{prompt}. Return coordinates as [ymin, xmin, ymax, xmax] if detecting objects."

        # Build chat template format
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image"},
                    {"type": "text", "text": prompt_instruction},
                ]
            },
        ]
        text_prompt = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        
        inputs = self.processor(
            images=image,
            text=text_prompt,
            return_tensors="pt"
        ).to(self.model.device, torch.bfloat16)
        
        with torch.no_grad():
            generated_ids = self.model.generate(
                **inputs,
                max_new_tokens=150,
                do_sample=False,
            )
            
        input_len = inputs["input_ids"].shape[1]
        generated_text = self.processor.decode(generated_ids[0][input_len:], skip_special_tokens=True).strip()
        
        # Parse coordinates format like: [ymin, xmin, ymax, xmax]
        box_matches = re.findall(r'\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]', generated_text)
        
        boxes = []
        w_img, h_img = image.size
        
        if box_matches and not is_ocr:
            # Grounding detection mode
            for match in box_matches:
                ymin, xmin, ymax, xmax = map(float, match)
                # Map 1000-based scale back to image dimensions
                x1 = (xmin / 1000.0) * w_img
                y1 = (ymin / 1000.0) * h_img
                x2 = (xmax / 1000.0) * w_img
                y2 = (ymax / 1000.0) * h_img
                boxes.append([x1, y1, x2, y2])
            return {
                "type": "grounding",
                "boxes": boxes,
                "text": None
            }
        else:
            # OCR / Text extraction mode
            return {
                "type": "ocr",
                "boxes": [],
                "text": generated_text
            }

    def parse_query_text(self, raw_query: str, active_tracks: list = None) -> str:
        """
        Uses local Gemma 4 in text-only mode to act as our query routing parser.
        """
        self.load_model()
        active_tracks = active_tracks or []
        import json
        tracks_context = json.dumps(active_tracks)
        
        from app.core.prompts import CONTEXT_ROUTER_SYSTEM_PROMPT
        
        prompt_instruction = (
            f"You are the visual router assistant. Use the following instructions to parse the user query:\n"
            f"{CONTEXT_ROUTER_SYSTEM_PROMPT}\n\n"
            f"Active Tracks: {tracks_context}\n"
            f"Query: {raw_query}\n\n"
            f"Output ONLY a raw valid JSON block."
        )
        
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_instruction}
                ]
            }
        ]
        
        text_prompt = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        
        inputs = self.processor(
            text=text_prompt,
            return_tensors="pt"
        ).to(self.model.device)
        
        with torch.no_grad():
            generated_ids = self.model.generate(
                **inputs,
                max_new_tokens=256,
                do_sample=False,
            )
            
        input_len = inputs["input_ids"].shape[1]
        generated_text = self.processor.decode(generated_ids[0][input_len:], skip_special_tokens=True).strip()
        return generated_text

    def compose_text_response(self, original_query: str, extracted_result: str) -> str:
        """
        Uses local Gemma 4 in text-only mode to compose a natural, professional response
        answering the user's query using the raw extracted information.
        """
        self.load_model()
        
        prompt_instruction = (
            f"You are the visual assistant answering a user's question about an object in a video stream.\n"
            f"User Question: '{original_query}'\n"
            f"Raw Extracted/Read Text from Object: '{extracted_result}'\n\n"
            f"Generate a professional, concise, one-sentence response that directly answers the user's question using the raw extracted information.\n"
            f"Do not include any extra explanation or introductory/conversational filler. Just output the final sentence."
        )
        
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_instruction}
                ]
            }
        ]
        
        text_prompt = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.processor(
            text=text_prompt,
            return_tensors="pt"
        ).to(self.model.device)
        
        with torch.no_grad():
            generated_ids = self.model.generate(
                **inputs,
                max_new_tokens=100,
                do_sample=False,
            )
            
        input_len = inputs["input_ids"].shape[1]
        generated_text = self.processor.decode(generated_ids[0][input_len:], skip_special_tokens=True).strip()
        return generated_text
