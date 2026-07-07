import os
import sys
import time
import logging
import cv2
import numpy as np
import torch
from PIL import Image, ImageDraw
from pathlib import Path
from transformers import AutoProcessor, AutoModelForCausalLM

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

logging.basicConfig(level=logging.ERROR)

def test_ocr_images():
    print("=== InsightVision Florence-2 OCR Image Test ===")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading Florence-2-base on device: {device}...")
    processor = AutoProcessor.from_pretrained("microsoft/Florence-2-base", trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        "microsoft/Florence-2-base", 
        trust_remote_code=True,
        attn_implementation="eager"
    ).to(device)
    
    images_dir = Path("images")
    output_dir = images_dir / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    test_files = ["ocr_check1.png", "ocr_check2.png"]
    
    for filename in test_files:
        img_path = images_dir / filename
        if not img_path.exists():
            print(f"\nImage not found: {img_path}")
            continue
            
        print(f"\nProcessing {filename}...")
        
        # Load image with PIL
        image_pil = Image.open(img_path).convert("RGB")
        w_pil, h_pil = image_pil.size
        
        # Format input for Florence-2 OCR with Region
        task_prompt = "<OCR_WITH_REGION>"
        inputs = processor(text=task_prompt, images=image_pil, return_tensors="pt").to(device)
        
        t0 = time.time()
        with torch.no_grad():
            generated_ids = model.generate(
                input_ids=inputs["input_ids"],
                pixel_values=inputs["pixel_values"],
                max_new_tokens=512,
                early_stopping=False,
                do_sample=False,
                num_beams=3,
            )
        latency = (time.time() - t0) * 1000
        
        generated_text = processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
        results = processor.post_process_generation(
            generated_text,
            task=task_prompt,
            image_size=image_pil.size
        )
        
        # Extract values
        ocr_data = results.get("<OCR_WITH_REGION>", {})
        quad_boxes = ocr_data.get("quad_boxes", [])
        labels = ocr_data.get("labels", [])
        
        print(f"  OCR Inference Latency: {latency:.1f}ms")
        print(f"  Found {len(labels)} text regions:")
        
        # Create CV2 version to draw on
        img_cv = cv2.imread(str(img_path))
        
        for idx, (quad, label) in enumerate(zip(quad_boxes, labels)):
            # Clean label (some tags contain </s> prefixes)
            clean_label = label.replace("</s>", "").strip()
            print(f"    Region #{idx+1}: '{clean_label}'")
            
            # Florence-2 quad_boxes format is [x1, y1, x2, y2, x3, y3, x4, y4]
            # Convert quad-box coordinates into a bounding box [xmin, ymin, xmax, ymax]
            xs = [quad[i] for i in range(0, len(quad), 2)]
            ys = [quad[i] for i in range(1, len(quad), 2)]
            xmin, ymin = int(min(xs)), int(min(ys))
            xmax, ymax = int(max(xs)), int(max(ys))
            
            # Draw bbox on CV2 image
            cv2.rectangle(img_cv, (xmin, ymin), (xmax, ymax), (200, 211, 34), 2)
            cv2.putText(img_cv, clean_label, (xmin, ymin - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 211, 34), 2)
            
        out_path = output_dir / f"result_{filename}"
        cv2.imwrite(str(out_path), img_cv)
        print(f"  Saved annotated output to: {out_path}")
        
    print("\n=== OCR verification test completed successfully! ===")

if __name__ == "__main__":
    test_ocr_images()
