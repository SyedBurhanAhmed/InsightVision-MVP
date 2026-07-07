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
    
    # Cleanup session
    track_manager.clear_session(session_id)

if __name__ == "__main__":
    run_reader_voting_test()
