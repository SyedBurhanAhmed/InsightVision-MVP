"""
backend/eval/test_cache_performance.py
======================================
Performance evaluation script for Redis Caching.
Compares cache-miss vs cache-hit latencies for:
1. Static Image VLM query (Analyze Image screen)
2. Live WebSocket Session follow-up tasks (OCR and Segmentation)
"""

import os
import sys
import time
import base64
import json
import cv2
import numpy as np
from fastapi.testclient import TestClient

# Bootstrap paths
_REPO_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_DINO_ROOT    = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
for p in (_REPO_BACKEND, _DINO_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.patch_transformers import patch_transformers
patch_transformers()

from app.main import app

def encode_frame(img_bgr: np.ndarray) -> str:
    _, buf = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buf.tobytes()).decode("utf-8")

def load_video_frames(path: str, max_frames: int = 50) -> list:
    cap = cv2.VideoCapture(path)
    frames = []
    while len(frames) < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
    cap.release()
    return frames

def test_cache_performance():
    print("=====================================================================")
    print("            INSIGHTVISION REDIS CACHING EVALUATION TEST")
    print("=====================================================================")

    # Use a real test image & video
    image_path = os.path.join(_REPO_BACKEND, "../images/ocr_check1.png")
    video_path = os.path.join(_REPO_BACKEND, "../images/long_output3.mp4")
    
    if not os.path.exists(image_path):
        print(f"Error: {image_path} not found.")
        sys.exit(1)
    if not os.path.exists(video_path):
        print(f"Error: {video_path} not found.")
        sys.exit(1)

    with TestClient(app) as client:
        # ────────────────────────────────────────────────────────────────────────
        # PART 1: Static Image Mode Cache (Analyze Image Screen)
        # ────────────────────────────────────────────────────────────────────────
        print("\n--- 1. Testing Static Image Caching (/api/vision/query) ---")
        query = "read the text on the sign"
        
        with open(image_path, "rb") as f:
            image_bytes = f.read()

        # Request 1 (Cache Miss)
        t0 = time.time()
        response1 = client.post(
            "/api/vision/query",
            files={"image": ("ocr_check1.png", image_bytes, "image/png")},
            data={"query": query, "conf_threshold": "0.35", "detector_backend": "dino"}
        )
        t1 = (time.time() - t0) * 1000
        assert response1.status_code == 200, f"Req 1 failed: {response1.text}"
        resp1_data = response1.json()
        print(f"Cache Miss Latency: {t1:.1f} ms | Answer: '{resp1_data.get('answer', '')}'")

        # Request 2 (Cache Hit)
        t0 = time.time()
        response2 = client.post(
            "/api/vision/query",
            files={"image": ("ocr_check1.png", image_bytes, "image/png")},
            data={"query": query, "conf_threshold": "0.35", "detector_backend": "dino"}
        )
        t2 = (time.time() - t0) * 1000
        assert response2.status_code == 200, f"Req 2 failed: {response2.text}"
        resp2_data = response2.json()
        print(f"Cache Hit Latency:  {t2:.1f} ms | Answer: '{resp2_data.get('answer', '')}'")
        
        static_speedup = t1 / t2 if t2 > 0 else float('inf')
        print(f"Static Query Speedup Factor: {static_speedup:.2f}x")

        # ────────────────────────────────────────────────────────────────────────
        # PART 2: WebSocket Live Session Follow-up Tasks (OCR & Segment)
        # ────────────────────────────────────────────────────────────────────────
        print("\n--- 2. Testing WS Session Follow-up Task Caching (/ws/session) ---")
        
        # Load real video frames to confirm lock-on and tracking
        frames = load_video_frames(video_path, 30)
        assert len(frames) >= 30, f"Failed to load enough frames from {video_path}"

        with client.websocket_connect("/ws/session") as ws:
            # Init
            ws.send_json({
                "type": "init",
                "source": "upload",
                "localizer": "grounding_dino",
                "conf": 0.35
            })
            init_resp = ws.receive_json()
            assert init_resp["type"] == "session_ready", f"Init failed: {init_resp}"
            session_id = init_resp["session_id"]
            print(f"WS Session initialized: {session_id}")

            # Send first 10 frames
            for i in range(10):
                ws.send_json({"type": "frame", "data": encode_frame(frames[i]), "seq": i})
                fu = ws.receive_json()
                assert fu["type"] == "frame_update"

            # Send track command to lock-on to "person"
            ws.send_json({"type": "command", "text": "track the person"})
            
            # Recv until lock_on
            lock_on_msg = None
            for _ in range(50):
                msg = ws.receive_json()
                if msg["type"] == "lock_on":
                    lock_on_msg = msg
                    break
            
            assert lock_on_msg is not None, "Failed to lock-on during test"
            track_id = lock_on_msg['track_id']
            print(f"Locked on: track_id={track_id}")

            # Send remaining 20 frames to propagate track and confirm it
            for i in range(10, 30):
                ws.send_json({"type": "frame", "data": encode_frame(frames[i]), "seq": i})
                ws.receive_json() # frame_update

            # --- Test OCR Task Cache ---
            print("\nFiring first OCR command (Cache Miss)...")
            t0 = time.time()
            ws.send_json({"type": "command", "text": "read the text on the sign"})
            
            ocr_resp1 = None
            for _ in range(100):
                msg = ws.receive_json()
                if msg["type"] == "response":
                    ocr_resp1 = msg
                    break
            ocr_t1 = (time.time() - t0) * 1000
            assert ocr_resp1 is not None, "OCR 1 failed to return response"
            print(f"OCR Miss Latency: {ocr_t1:.1f} ms | Summary: '{ocr_resp1.get('summary', '')}'")

            print("Firing duplicate OCR command immediately (Cache Hit)...")
            t0 = time.time()
            ws.send_json({"type": "command", "text": "read the text on the sign"})
            
            ocr_resp2 = None
            for _ in range(100):
                msg = ws.receive_json()
                if msg["type"] == "response":
                    ocr_resp2 = msg
                    break
            ocr_t2 = (time.time() - t0) * 1000
            assert ocr_resp2 is not None, "OCR 2 failed to return response"
            print(f"OCR Hit Latency:  {ocr_t2:.1f} ms | Summary: '{ocr_resp2.get('summary', '')}'")
            
            ocr_speedup = ocr_t1 / ocr_t2 if ocr_t2 > 0 else float('inf')
            print(f"OCR Speedup Factor: {ocr_speedup:.2f}x")

            # --- Test Segment Task Cache ---
            print("\nFiring first segment command (Cache Miss)...")
            t0 = time.time()
            ws.send_json({"type": "command", "text": "segment the tracked object"})
            
            seg_resp1 = None
            for _ in range(100):
                msg = ws.receive_json()
                if msg["type"] == "response":
                    seg_resp1 = msg
                    break
            seg_t1 = (time.time() - t0) * 1000
            assert seg_resp1 is not None, "Segment 1 failed"
            print(f"Segment Miss Latency: {seg_t1:.1f} ms | Summary: '{seg_resp1.get('summary', '')}'")

            print("Firing duplicate segment command immediately (Cache Hit)...")
            t0 = time.time()
            ws.send_json({"type": "command", "text": "segment the tracked object"})
            
            seg_resp2 = None
            for _ in range(100):
                msg = ws.receive_json()
                if msg["type"] == "response":
                    seg_resp2 = msg
                    break
            seg_t2 = (time.time() - t0) * 1000
            assert seg_resp2 is not None, "Segment 2 failed"
            print(f"Segment Hit Latency:  {seg_t2:.1f} ms | Summary: '{seg_resp2.get('summary', '')}'")
            
            seg_speedup = seg_t1 / seg_t2 if seg_t2 > 0 else float('inf')
            print(f"Segment Speedup Factor: {seg_speedup:.2f}x")

        print("\n=====================================================================")
        print("                     EVALUATION REPORT SUMMARY")
        print("=====================================================================")
        print(f"Static VLM Query:   Miss = {t1:8.1f} ms | Hit = {t2:6.1f} ms | Speedup = {static_speedup:7.2f}x")
        print(f"Track OCR Followup:  Miss = {ocr_t1:8.1f} ms | Hit = {ocr_t2:6.1f} ms | Speedup = {ocr_speedup:7.2f}x")
        print(f"Track Segment:       Miss = {seg_t1:8.1f} ms | Hit = {seg_t2:6.1f} ms | Speedup = {seg_speedup:7.2f}x")
        print("=====================================================================")
        print("ALL CACHING PERFORMANCE EVALUATIONS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    test_cache_performance()
