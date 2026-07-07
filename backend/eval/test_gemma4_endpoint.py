import os
import sys
import time
from fastapi.testclient import TestClient

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app

def test_endpoint():
    print("=== Testing Gemma 4 API Endpoint via TestClient ===")
    
    # Initialize TestClient using context manager lifespan
    with TestClient(app) as client:
        image_path = "images/ocr_check1.png"
        if not os.path.exists(image_path):
            print(f"Error: Image {image_path} not found.")
            return
            
        print(f"\nSending '{image_path}' to /api/detect with model='gemma4'...")
        t0 = time.time()
        
        with open(image_path, "rb") as img_file:
            response = client.post(
                "/api/detect",
                files={"image": ("ocr_check1.png", img_file, "image/png")},
                data={
                    "prompt": "read the license plate",
                    "conf_threshold": 0.35,
                    "model": "gemma4",
                    "masks": "false"
                }
            )
            
        latency = (time.time() - t0) * 1000
        print(f"Status Code: {response.status_code}")
        print(f"Latency: {latency:.1f}ms")
        
        if response.status_code == 200:
            res_json = response.json()
            print("Response Data:")
            for obj in res_json.get("objects", []):
                print(f"  Detected Label/Text: '{obj.get('type')}' | BBox: {obj.get('box')}")
        else:
            print(f"Failed: {response.text}")

if __name__ == "__main__":
    test_endpoint()
