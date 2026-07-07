import os
import sys
import cv2
import time
import numpy as np

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.track_manager import TrackManager
from app.services.segmenter import SAM3Segmenter

def run_sam3_test():
    print("=== InsightVision SAM 3 Segmenter Verification ===")
    
    # 1. Initialize services
    track_manager = TrackManager(method="botsort")
    
    try:
        segmenter = SAM3Segmenter()
    except Exception as e:
        print(f"Failed to instantiate SAM3: {e}")
        print("Please ensure you are inside the python 3.12 environment with 'sam3' installed.")
        return
        
    # 2. Load test image
    img_path = "images/ocr_check1.png"
    if not os.path.exists(img_path):
        print(f"Error: Test image '{img_path}' not found in workspace.")
        return
        
    img = cv2.imread(img_path)
    
    session_id = "eval_session_sam3"
    track_id = 1
    
    # Simulated vehicle coordinates
    dets = np.array([[676.0, 180.0, 742.0, 206.0, 0.95, 0]], dtype=np.float32)
    
    # Simulate track update on frame
    track_manager.update_track(session_id, dets, img, ["vehicle"])
    print(f"Registered track_id={track_id} in registry with coordinates [676.0, 180.0, 742.0, 206.0]")
    
    # 3. Call track-aware segmenter
    print(f"\nRunning SAM3 segment_track for track_id={track_id}...")
    start_time = time.time()
    try:
        res = segmenter.segment_track(session_id, track_id, track_manager, img)
        latency = (time.time() - start_time) * 1000
        mask = res.get("mask")
        
        # 4. Save visual output overlay
        if mask is not None:
            print("Mask generated successfully by SAM 3!")
            print(f"  Shape: {mask.shape}")
            print(f"  Pixel count: {np.sum(mask)}")
            
            # Create a colored overlay on the image
            overlay = img.copy()
            # Green color overlay: BGR (39, 255, 20)
            overlay[mask == 1] = [39, 255, 20]
            
            # Merge overlay with 50% opacity
            blended = cv2.addWeighted(img, 0.5, overlay, 0.5, 0)
            
            # Save output image
            out_dir = "outputs"
            os.makedirs(out_dir, exist_ok=True)
            out_path = os.path.join(out_dir, "result_sam3_segment.png")
            cv2.imwrite(out_path, blended)
            print(f"  Saved annotated segment overlay to: {out_path}")
        else:
            print("Error: No mask returned from SAM3.")
            
        print("\n" + "=" * 50)
        print("SAM3 EVALUATION RESULTS:")
        print("=" * 50)
        print(f"Inference Latency:    {latency:.1f}ms")
        print("=" * 50)
        
    except Exception as e:
        print(f"\nExecution failed: {e}")
        print("Verify your HuggingFace token and access permissions for Segment Anything 3.")
    
    # Cleanup session
    track_manager.clear_session(session_id)

if __name__ == "__main__":
    run_sam3_test()
