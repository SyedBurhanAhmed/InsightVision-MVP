import os
import sys
import time
import json
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app

def run_tests():
    print("=== InsightVision API Router Verification Test ===")
    
    # Use TestClient as context manager to trigger async lifespan (which loads models)
    with TestClient(app) as client:
        image_path = "images/ocr_check1.png"
        if not os.path.exists(image_path):
            print(f"Error: Test image '{image_path}' not found.")
            return

        # ----------------------------------------------------
        # 1. TEST: Object Detection (detect task)
        # ----------------------------------------------------
        print("\n--- Sending request for Object Detection (detect) ---")
        with open(image_path, "rb") as f:
            response = client.post(
                "/api/detect",
                files={"image": ("ocr_check1.png", f, "image/png")},
                data={
                    "prompt": "license plate",
                    "conf_threshold": "0.3",
                    "model": "groundingdino",
                    "masks": "false"
                }
            )
        print("Status Code:", response.status_code)
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))

        # ----------------------------------------------------
        # 2. TEST: Object Detection with SAM3 Segmenter (segment)
        # ----------------------------------------------------
        print("\n--- Sending request for Detection + SAM3 Masks (segment) ---")
        with open(image_path, "rb") as f:
            response = client.post(
                "/api/detect",
                files={"image": ("ocr_check1.png", f, "image/png")},
                data={
                    "prompt": "license plate",
                    "conf_threshold": "0.3",
                    "model": "groundingdino",
                    "masks": "true"
                }
            )
        print("Status Code:", response.status_code)
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))

        # ----------------------------------------------------
        # 3. TEST: Vision Language Query (OCR task via Gemma 4)
        # ----------------------------------------------------
        print("\n--- Sending request for Vision Language Query (OCR via Gemma 4) ---")
        with open(image_path, "rb") as f:
            response = client.post(
                "/api/vision/query",
                files={"image": ("ocr_check1.png", f, "image/png")},
                data={
                    "query": "what is the number on license plate",
                    "conf_threshold": "0.3"
                }
            )
        print("Status Code:", response.status_code)
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    run_tests()
