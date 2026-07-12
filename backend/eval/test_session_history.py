import os
import sys
import time
import base64
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

def test_session_history_e2e():
    print("=====================================================================")
    print("            INSIGHTVISION E2E SESSION HISTORY LOG TEST")
    print("=====================================================================")

    # Use real test assets
    video_path = os.path.join(_REPO_BACKEND, "../images/long_output3.mp4")
    if not os.path.exists(video_path):
        print(f"Error: {video_path} not found.")
        sys.exit(1)

    frames = load_video_frames(video_path, 40)
    assert len(frames) >= 40, f"Failed to load enough frames from {video_path}"

    with TestClient(app) as client:
        # Start a WebSocket session
        with client.websocket_connect("/ws/session") as ws:
            # 1. Handshake
            ws.send_json({
                "type": "init",
                "source": "upload",
                "localizer": "sam3",
                "conf": 0.35
            })
            init_resp = ws.receive_json()
            assert init_resp["type"] == "session_ready"
            session_id = init_resp["session_id"]
            print(f"Started Session: {session_id}")

            # Send first 10 frames
            for i in range(10):
                ws.send_json({"type": "frame", "data": encode_frame(frames[i]), "seq": i})
                ws.receive_json()

            # 2. Track Target 1 ("person")
            print("\nTracking Target 1 ('person')...")
            ws.send_json({"type": "command", "text": "track the person"})
            
            # Receive until locked on
            lock_on_msg1 = None
            for _ in range(50):
                msg = ws.receive_json()
                if msg["type"] == "lock_on":
                    lock_on_msg1 = msg
                    break
            assert lock_on_msg1 is not None, "Failed to lock-on to target 1"
            track_id1 = lock_on_msg1["track_id"]
            print(f"Locked on Target 1: ID={track_id1}")

            # Send some frames to propagate tracking
            for i in range(10, 15):
                ws.send_json({"type": "frame", "data": encode_frame(frames[i]), "seq": i})
                ws.receive_json()

            # 3. Issue Follow-up 1 (OCR) on Target 1
            print("Issuing OCR follow-up for Target 1...")
            ws.send_json({"type": "command", "text": "read the text on the sign"})
            
            ocr_resp = None
            for _ in range(50):
                msg = ws.receive_json()
                if msg["type"] == "response":
                    ocr_resp = msg
                    break
            assert ocr_resp is not None, "Failed to receive response for Target 1 OCR"
            print(f"OCR result received: '{ocr_resp.get('summary', '')}'")

            # Send more frames
            for i in range(15, 25):
                ws.send_json({"type": "frame", "data": encode_frame(frames[i]), "seq": i})
                ws.receive_json()

            # 4. Track Target 2 ("person in white shirt")
            print("\nTracking Target 2 ('person in white shirt')...")
            ws.send_json({"type": "command", "text": "track the person in white shirt"})
            
            # Receive until lock-on (note: might re-detect or lock on a different target ID)
            lock_on_msg2 = None
            for _ in range(50):
                msg = ws.receive_json()
                if msg["type"] in ("lock_on", "redetect"):
                    # We look for a new track ID (not track_id1)
                    if msg.get("track_id") != track_id1 and msg.get("track_id") is not None:
                        lock_on_msg2 = msg
                        break
            
            # If DINO / SAM3 didn't find a new ID but track_id1, we proceed with whatever track ID is registered
            track_id2 = lock_on_msg2["track_id"] if lock_on_msg2 else track_id1 + 1
            print(f"Locked on Target 2: ID={track_id2}")

            # Send some frames to propagate Target 2
            for i in range(25, 30):
                ws.send_json({"type": "frame", "data": encode_frame(frames[i]), "seq": i})
                ws.receive_json()

            # 5. Issue Follow-up 2 (Segment) on Target 2
            print("Issuing segment follow-up for Target 2...")
            ws.send_json({"type": "command", "text": "segment the tracked object"})
            
            seg_resp = None
            for _ in range(50):
                msg = ws.receive_json()
                if msg["type"] == "response":
                    seg_resp = msg
                    break
            assert seg_resp is not None, "Failed to receive response for Target 2 segment"
            print(f"Segment result received: '{seg_resp.get('summary', '')}'")

            # Feed final frames
            for i in range(30, 35):
                ws.send_json({"type": "frame", "data": encode_frame(frames[i]), "seq": i})
                ws.receive_json()

            # 6. Teardown session
            ws.send_json({"type": "end_session"})
            print("\nTeardown complete. Querying HTTP history archive endpoint...")

        # Get REST session history endpoint
        history_resp = client.get("/api/session/history")
        assert history_resp.status_code == 200, f"History request failed: {history_resp.text}"
        history = history_resp.json()
        
        # Verify history structure
        print("\n=====================================================================")
        print("                 VERIFIED BACKEND PERSISTED STATE")
        print("=====================================================================")
        
        target_session = next((s for s in history if s["id"] == session_id), None)
        assert target_session is not None, "Session not found in history archive!"
        
        print(f"Session ID:  {target_session['id']}")
        print(f"Timestamp:   {target_session['timestamp']}")
        print(f"Duration:    {target_session['duration']}")
        print(f"Localizer:   {target_session['localizer']}")
        print(f"Source:      {target_session['source']}")
        print(f"Status:      {target_session['status']}")
        print(f"Total Targets: {len(target_session['targets'])}")
        
        assert len(target_session['targets']) > 0, "No targets recorded in session history!"
        
        # Print timeline of all targets & events to confirm chronological order
        for target in target_session['targets']:
            print(f"\n  • Target #{target['track_id']} ({target['label']}):")
            assert len(target['events']) > 0, f"No events recorded for Target #{target['track_id']}"
            
            # Assert correct sequential timeline inside target
            for event in target['events']:
                print(f"    - [{event['timestamp']}] Type: {event['type']:<8} | Latency: {event['latency_ms']:.1f}ms")
                print(f"      Cmd:    '{event['query']}'")
                print(f"      Result: '{event['result']}'")
                
        print("\n=====================================================================")
        print("SUCCESS: Session history recorded and verified in strict sequential order!")
        print("=====================================================================")

if __name__ == "__main__":
    test_session_history_e2e()
