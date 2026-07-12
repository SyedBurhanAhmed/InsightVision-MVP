import os
import sys
import cv2
import time
import numpy as np

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.track_manager import TrackManager
from app.services.reader import Gemma4Reader

def run_reader_voting_test():
    print("=== InsightVision Multi-Frame OCR Voting Test ===")
    
    # 1. Initialize services
    track_manager = TrackManager(method="botsort")
    reader = Gemma4Reader()
    
    # 2. Load test images
    img1_path = "images/ocr_check1.png"
    img2_path = "images/ocr_check2.png"
    
    if not os.path.exists(img1_path) or not os.path.exists(img2_path):
        print(f"Error: Test images '{img1_path}' and/or '{img2_path}' not found in workspace.")
        return
        
    img1 = cv2.imread(img1_path)
    img2 = cv2.imread(img2_path)
    
    h1, w1 = img1.shape[:2]
    h2, w2 = img2.shape[:2]
    
    session_id = "eval_session_voting"
    track_id = 1
    
    # Simulate a sequence of 6 frames to accumulate in TrackManager sliding window
    # BBox values are mock detections [x1, y1, x2, y2, score, class_id]
    # For vehicle license plate region
    print("\nSimulating track updates over 6 frames...")
    
    # Frame 0 to 2: use ocr_check1.png
    dets1 = np.array([[676.0, 180.0, 742.0, 206.0, 0.95, 0]], dtype=np.float32)
    for f in range(3):
        track_manager.update_track(session_id, dets1, img1, ["vehicle"])
        print(f"  Frame {f}: Registered track_id={track_id} on ocr_check1")
        
    # Frame 3 to 5: use ocr_check2.png
    dets2 = np.array([[676.0, 180.0, 742.0, 206.0, 0.95, 0]], dtype=np.float32)
    for f in range(3, 6):
        track_manager.update_track(session_id, dets2, img2, ["vehicle"])
        print(f"  Frame {f}: Registered track_id={track_id} on ocr_check2")
        
    # 3. Call multi-frame OCR voting
    print(f"\nRunning Gemma4Reader.read_track for track_id={track_id}...")
    start_time = time.time()
    vote_res = reader.read_track(session_id, track_id, track_manager)
    latency = (time.time() - start_time) * 1000
    
    # 4. Report results
    print("\n" + "=" * 50)
    print("VOTING EVALUATION RESULTS:")
    print("=" * 50)
    print(f"Winner Text Output:   '{vote_res['text']}'")
    print(f"Vote Count:           {vote_res['vote_count']}")
    print(f"Total Valid Samples:  {vote_res['total_samples']}")
    print(f"Vote Confidence:      {vote_res['confidence'] * 100:.1f}%")
    print(f"Low Confidence Flag:  {vote_res['low_confidence']}")
    print(f"Inference Latency:    {latency:.1f}ms")
    print("=" * 50)
    
    # Save visual crop of the license plate with winning OCR text overlayed
    if session_id in track_manager.history_buffers:
        found_crop = False
        for last_item in reversed(track_manager.history_buffers[session_id]):
            for t in last_item["tracks"]:
                if t["track_id"] == track_id:
                    bx, by, bw, bh = t["bbox"]
                    tx1, ty1, tx2, ty2 = int(bx), int(by), int(bx + bw), int(by + bh)
                    
                    last_frame = last_item["frame"]
                    h_f, w_f = last_frame.shape[:2]
                    pad = 20
                    cy1, cy2 = max(0, ty1 - pad), min(h_f, ty2 + pad)
                    cx1, cx2 = max(0, tx1 - pad), min(w_f, tx2 + pad)
                    crop = last_frame[cy1:cy2, cx1:cx2].copy()
                    
                    # Draw text tag
                    cv2.putText(crop, f"Voting OCR: {vote_res['text']}", (10, 25),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                                
                    out_path = "outputs/voting_ocr_result.png"
                    os.makedirs("outputs", exist_ok=True)
                    cv2.imwrite(out_path, crop)
                    print(f"✔ Saved visual OCR voting crop to: {out_path}")
                    found_crop = True
                    break
            if found_crop:
                break
                
    # Cleanup session
    track_manager.clear_session(session_id)

if __name__ == "__main__":
    run_reader_voting_test()
