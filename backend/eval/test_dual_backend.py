import os
import sys
import time
import cv2
import torch
import numpy as np

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Add GroundingDINO source to path
_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

from app.core.config import settings

def test_dual_backends():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Running dual backend test on: {device}")

    # Use first frame of the temp frames directory
    image_path = "images/temp_sam3_frames/00000.jpg"
    if not os.path.exists(image_path):
        # Fallback extraction of 1 frame from long_output3.mp4
        video_path = "images/long_output3.mp4"
        if os.path.exists(video_path):
            os.makedirs("images/temp_sam3_frames", exist_ok=True)
            cap = cv2.VideoCapture(video_path)
            ret, frame = cap.read()
            if ret:
                cv2.imwrite(image_path, frame)
            cap.release()
        else:
            print("❌ No test image or video available.")
            return

    img = cv2.imread(image_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    prompt = "person"

    print("\n--- 1. Loading Grounding DINO ---")
    try:
        from groundingdino.util.inference import load_model
        dino_model = load_model(
            settings.GROUNDING_DINO_CONFIG_PATH,
            settings.GROUNDING_DINO_WEIGHTS_PATH,
            device=device,
        )
        from app.services.detector import GroundingDINODetector
        dino_detector = GroundingDINODetector(dino_model)
        
        print("Running Grounding DINO detection...")
        t0 = time.time()
        dino_res = dino_detector.detect(img_rgb, prompt, conf_threshold=0.35)
        dino_ms = (time.time() - t0) * 1000
        print(f"DINO found {len(dino_res['boxes'])} objects in {dino_ms:.1f}ms")
        for i, (box, score, label) in enumerate(zip(dino_res['boxes'], dino_res['scores'], dino_res['labels'])):
            print(f"  [{i}] {label}: {score:.2f} @ {[round(x, 1) for x in box]}")
    except Exception as e:
        print(f"❌ DINO failed: {e}")

    print("\n--- 2. Loading SAM 3 ---")
    try:
        from sam3.model_builder import build_sam3_image_model
        sam3_model = build_sam3_image_model()
        from app.services.detector import SAM3Detector
        sam3_detector = SAM3Detector(sam3_model)
        
        print("Running SAM 3 detection...")
        t0 = time.time()
        sam3_res = sam3_detector.detect(img_rgb, prompt, conf_threshold=0.35)
        sam3_ms = (time.time() - t0) * 1000
        print(f"SAM 3 found {len(sam3_res['boxes'])} objects in {sam3_ms:.1f}ms")
        for i, (box, score, label) in enumerate(zip(sam3_res['boxes'], sam3_res['scores'], sam3_res['labels'])):
            print(f"  [{i}] {label}: {score:.2f} @ {[round(x, 1) for x in box]}")
    except Exception as e:
        print(f"❌ SAM 3 failed: {e}")

if __name__ == "__main__":
    test_dual_backends()
