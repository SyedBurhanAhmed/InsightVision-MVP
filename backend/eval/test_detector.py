import os
import sys
import time
import logging
import cv2
from pathlib import Path

# Ensure app module can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
from app.core.config import settings
from app.services.detector import GroundingDINODetector
from groundingdino.util.inference import load_model

logging.basicConfig(level=logging.ERROR)

def run_eval():
    print("Loading Grounding DINO model...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = load_model(
        settings.GROUNDING_DINO_CONFIG_PATH,
        settings.GROUNDING_DINO_WEIGHTS_PATH,
        device=device
    )
    
    detector = GroundingDINODetector(model)
    
    test_dir = Path("../data/images/test").resolve()
    out_dir = test_dir / "output"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # We will test 5 images with 3 prompts each
    test_images = sorted([f for f in os.listdir(test_dir) if f.endswith(".jpg")])
    if not test_images:
        print(f"No test images found in {test_dir}")
        return
        
    # Mapping of image name to prompts to test
    # (Since we downloaded random unsplash images, we'll try generic prompts)
    prompts = [
        "person",
        "car",
        "building"
    ]
    
    print(f"{'IMAGE':<20} | {'PROMPT':<20} | {'NUM_BOXES':<10} | {'LATENCY (ms)'}")
    print("-" * 70)
    
    for img_name in test_images:
        img_path = str(test_dir / img_name)
        image_bgr = cv2.imread(img_path)
        if image_bgr is None:
            continue
            
        # Grounding DINO usually expects RGB for inference (PIL handles it, but we pass the raw array)
        # Our detector converts from array -> PIL RGB. So we should pass RGB.
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        
        for prompt in prompts:
            # Inference
            res = detector.detect(image_rgb, prompt)
            
            num_boxes = len(res["boxes"])
            latency = res["inference_ms"]
            
            print(f"{img_name:<20} | {prompt:<20} | {num_boxes:<10} | {latency:.2f}")
            
            # Draw boxes on a copy of the BGR image
            img_draw = image_bgr.copy()
            for box, score, label in zip(res["boxes"], res["scores"], res["labels"]):
                x1, y1, x2, y2 = map(int, box)
                cv2.rectangle(img_draw, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(img_draw, f"{label} {score:.2f}", (x1, max(y1 - 10, 0)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
            
            out_name = f"{img_name.split('.')[0]}_{prompt.replace(' ', '_')}.jpg"
            cv2.imwrite(str(out_dir / out_name), img_draw)

if __name__ == "__main__":
    run_eval()
