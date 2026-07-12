import os
import sys
import cv2
import time
import numpy as np

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.track_manager import TrackManager
from app.services.segmenter import SAM3Segmenter

def run_segmenter_test():
    print("=== InsightVision SAM3 Segmenter Verification ===")
    
    # 1. Initialize services
    track_manager = TrackManager(method="botsort")
    segmenter = SAM3Segmenter()
    
    # 2. Load test image
    img_path = "images/ocr_check1.png"
    if not os.path.exists(img_path):
        print(f"Error: Test image '{img_path}' not found in workspace.")
        return
        
    img = cv2.imread(img_path)
    
    session_id = "eval_session_segment"
    track_id = 1
    
    # BBox values are real plate box coordinates [x1, y1, x2, y2, score, class_id]
    dets = np.array([[676.0, 180.0, 742.0, 206.0, 0.95, 0]], dtype=np.float32)
    
    # Simulate track update on frame
    track_manager.update_track(session_id, dets, img, ["vehicle"])
    print(f"Registered track_id={track_id} in registry with coordinates [676.0, 180.0, 742.0, 206.0]")
    
    # 3. Call track-aware segmenter
    print(f"\nRunning SAM2 segment_track for track_id={track_id}...")
    start_time = time.time()
    res = segmenter.segment_track(session_id, track_id, track_manager, img)
    latency = (time.time() - start_time) * 1000
    
    mask = res.get("mask")
    
    # 4. Save visual output overlay
    if mask is not None:
        print("Mask generated successfully!")
        print(f"  Shape: {mask.shape}")
        print(f"  Pixel count: {np.sum(mask)}")
        
        # Create a colored overlay on the image
        overlay = img.copy()
        # Cyan color overlay: BGR (200, 211, 34)
        overlay[mask == 1] = [200, 211, 34]
        
        # Merge overlay with 50% opacity
        blended = cv2.addWeighted(img, 0.5, overlay, 0.5, 0)
        
        # Save output image
        out_dir = "outputs"
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, "result_segment_track.png")
        cv2.imwrite(out_path, blended)
        print(f"  Saved annotated segment overlay to: {out_path}")
    else:
        print("Error: No mask returned from segmenter.")
        
    print("\n" + "=" * 50)
    print("SEGMENTER EVALUATION RESULTS:")
    print("=" * 50)
    print(f"Inference Latency:    {latency:.1f}ms")
    print(f"Model Path:           {segmenter.model_path}")
    print("=" * 50)
    
    # Cleanup session
    track_manager.clear_session(session_id)

if __name__ == "__main__":
    run_segmenter_test()
