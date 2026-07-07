import os
import sys
import time
import re
import torch
import cv2
import numpy as np
from PIL import Image
from pathlib import Path
from transformers import AutoProcessor, AutoModelForImageTextToText

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def test_gemma4():
    print("=== InsightVision Gemma 4 Local Inference Verification ===")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu":
        print("⚠️ Warning: CUDA device not detected! Exiting.")
        return
        
    model_id = "google/gemma-4-E2B-it"
    print(f"Loading {model_id} onto GPU...")
    
    t0 = time.time()
    try:
        processor = AutoProcessor.from_pretrained(model_id)
        model = AutoModelForImageTextToText.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            attn_implementation="sdpa"
        )
        print(f"Gemma 4 loaded successfully in {time.time() - t0:.1f} seconds!")
    except Exception as e:
        print(f"❌ Error loading Gemma 4: {e}")
        return

    images_dir = Path("images")
    output_dir = images_dir / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    test_files = ["ocr_check1.png", "ocr_check2.png"]
    
    # Prompt for OCR
    nl_prompt = "Read the characters on the license plate. Return ONLY the text you see."
    
    for filename in test_files:
        img_path = images_dir / filename
        if not img_path.exists():
            print(f"Image not found: {img_path}")
            continue
            
        print(f"\nProcessing {filename} with prompt: '{nl_prompt}'")
        pil_image = Image.open(img_path).convert("RGB")
        
        # Build chat template structure
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image"},
                    {"type": "text", "text": nl_prompt},
                ]
            },
        ]
        text_prompt = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        
        inputs = processor(
            images=pil_image,
            text=text_prompt,
            return_tensors="pt"
        ).to(model.device, torch.bfloat16)
        
        t_inf_start = time.time()
        with torch.no_grad():
            generated_ids = model.generate(
                **inputs,
                max_new_tokens=100,
                do_sample=False,
            )
        latency = time.time() - t_inf_start
        
        input_len = inputs["input_ids"].shape[1]
        generated_text = processor.decode(generated_ids[0][input_len:], skip_special_tokens=True).strip()
        
        print(f"  Latency: {latency:.2f} seconds")
        print(f"  Gemma 4 OCR output: '{generated_text}'")

if __name__ == "__main__":
    test_gemma4()
