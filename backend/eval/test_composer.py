import os
import sys
import cv2
import time
import numpy as np

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.composer import NLComposer

def run_composer_test():
    print("=== InsightVision Track-Aware Composer Verification ===")
    
    # 1. Load test image & crop region for simulated track
    img_path = "images/ocr_check1.png"
    if not os.path.exists(img_path):
        print(f"Error: Test image '{img_path}' not found in workspace.")
        return
        
    img = cv2.imread(img_path)
    h, w = img.shape[:2]
    
    # Simulated active track coordinates for the sedan/vehicle
    # Let's crop a slightly wider region around the plate to show the vehicle color!
    # BBox coordinates of the license plate region: [676, 180, 742, 206]
    # Let's expand this to capture the car body color: [550, 80, 850, 320]
    x1, y1, x2, y2 = 550, 80, 850, min(h, 320)
    crop = img[y1:y2, x1:x2]
    
    composer = NLComposer()
    
    # 2. Build track result dict
    # Including OCR details, track ID, and crop image
    result = {
        "track_id": 1,
        "crop_image": crop,
        "active_track_context": "Tracked Vehicle #1. Previously extracted OCR text reads 'AGY 128'."
    }
    
    query = "what color is it?"
    
    print(f"\nSending track-aware VQA query: '{query}'...")
    print(f"Using crop region coordinates: [{x1}, {y1}, {x2}, {y2}]")
    
    start_time = time.time()
    answer = composer.compose(task="describe", result=result, original_query=query)
    latency = (time.time() - start_time) * 1000
    
    print("\n" + "=" * 50)
    print("COMPOSER VQA EVALUATION RESULTS:")
    print("=" * 50)
    print(f"Answer Output:    \"{answer}\"")
    print(f"Latency:          {latency:.1f}ms")
    print("=" * 50)

if __name__ == "__main__":
    run_composer_test()
