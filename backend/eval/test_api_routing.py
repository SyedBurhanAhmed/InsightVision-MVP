import os
import sys
import torch
import cv2
import numpy as np

# Ensure GroundingDINO_sam3 is in sys.path
_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

# Ensure app directory is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient

def test_api_routing():
    print("=== Testing FastAPI Lifespan & API Routing (DINO vs SAM 3) ===")
    
    # We will import the app after setting up the paths
    from app.main import app
    
    # Start lifespan explicitly using TestClient
    with TestClient(app) as client:
        print("✔ App lifespan loaded and models initialized.")
        
        # Resolve paths relative to project root
        eval_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(eval_dir, "..", ".."))
        image_dir = os.path.join(project_root, "images", "temp_sam3_frames")
        image_path = os.path.join(image_dir, "00000.jpg")
        video_path = os.path.join(project_root, "images", "long_output3.mp4")
        
        if not os.path.exists(image_path):
            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video file not found at {video_path}. Please make sure you are running from the workspace or the files exist.")
            # Fallback extraction
            cap = cv2.VideoCapture(video_path)
            ret, frame = cap.read()
            if ret:
                os.makedirs(image_dir, exist_ok=True)
                cv2.imwrite(image_path, frame)
            cap.release()

        with open(image_path, "rb") as img_file:
            files = {"image": ("test.jpg", img_file, "image/jpeg")}
            data = {
                "query": "person",
                "conf_threshold": 0.35,
                "detector_backend": "dino"
            }
            
            print("\n--- Testing POST /api/vision/query with Grounding DINO ---")
            t0 = time.time() if 'time' in sys.modules else os.times()[4]
            response = client.post("/api/vision/query", files=files, data=data)
            t1 = time.time() if 'time' in sys.modules else os.times()[4]
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                res_data = response.json()
                print(f"Answer: {res_data.get('answer_text')}")
                print(f"Found {len(res_data.get('objects', []))} objects in {(t1-t0)*1000:.1f}ms")
            else:
                print(f"Error: {response.text}")
                
        # Re-open the image file descriptor for the next request
        with open(image_path, "rb") as img_file:
            files = {"image": ("test.jpg", img_file, "image/jpeg")}
            data = {
                "query": "person",
                "conf_threshold": 0.35,
                "detector_backend": "sam3"
            }
            
            print("\n--- Testing POST /api/vision/query with SAM 3 ---")
            t0 = time.time() if 'time' in sys.modules else os.times()[4]
            response = client.post("/api/vision/query", files=files, data=data)
            t1 = time.time() if 'time' in sys.modules else os.times()[4]
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                res_data = response.json()
                print(f"Answer: {res_data.get('answer_text')}")
                print(f"Found {len(res_data.get('objects', []))} objects in {(t1-t0)*1000:.1f}ms")
            else:
                print(f"Error: {response.text}")

        # Test POST /api/detect with SAM3
        with open(image_path, "rb") as img_file:
            files = {"image": ("test.jpg", img_file, "image/jpeg")}
            data = {
                "prompt": "person",
                "conf_threshold": 0.35,
                "model": "sam3",
                "masks": "true"
            }
            
            print("\n--- Testing POST /api/detect with SAM 3 + Masks ---")
            t0 = time.time() if 'time' in sys.modules else os.times()[4]
            response = client.post("/api/detect", files=files, data=data)
            t1 = time.time() if 'time' in sys.modules else os.times()[4]
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                res_data = response.json()
                print(f"Found {len(res_data.get('objects', []))} objects with masks in {(t1-t0)*1000:.1f}ms")
            else:
                print(f"Error: {response.text}")

if __name__ == "__main__":
    import time
    test_api_routing()
