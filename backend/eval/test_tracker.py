import os
import sys
import numpy as np

# Ensure app path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.track_manager import TrackManager

def run_tracker_test():
    print("=== InsightVision Tracking Verification Test ===")
    manager = TrackManager(method="botsort")
    session_id = "test-session-001"
    labels_map = ["person", "car"]

    # Create dummy BGR canvas frame
    img = np.zeros((480, 640, 3), dtype=np.uint8)

    # Frame 1: Target starts at [100, 100, 150, 200]
    dets_f1 = np.array([[100.0, 100.0, 150.0, 200.0, 0.95, 0.0]], dtype=np.float32)
    tracks_f1 = manager.update_track(session_id, dets_f1, img, labels_map)
    print("\nFrame 1 Detections:", dets_f1[:, :4].tolist())
    print("Frame 1 Track Outputs:")
    for t in tracks_f1:
        print(f"  ID: {t['track_id']} | Label: {t['label']} | BBox: {t['bbox']} | Conf: {t['confidence']:.2f}")

    # Frame 2: Target moves slightly to [105, 102, 155, 202]
    dets_f2 = np.array([[105.0, 102.0, 155.0, 202.0, 0.94, 0.0]], dtype=np.float32)
    tracks_f2 = manager.update_track(session_id, dets_f2, img, labels_map)
    print("\nFrame 2 Detections:", dets_f2[:, :4].tolist())
    print("Frame 2 Track Outputs:")
    for t in tracks_f2:
        print(f"  ID: {t['track_id']} | Label: {t['label']} | BBox: {t['bbox']} | Conf: {t['confidence']:.2f}")

    # Frame 3: Target moves slightly to [110, 104, 160, 204]
    dets_f3 = np.array([[110.0, 104.0, 160.0, 204.0, 0.96, 0.0]], dtype=np.float32)
    tracks_f3 = manager.update_track(session_id, dets_f3, img, labels_map)
    print("\nFrame 3 Detections:", dets_f3[:, :4].tolist())
    print("Frame 3 Track Outputs:")
    for t in tracks_f3:
        print(f"  ID: {t['track_id']} | Label: {t['label']} | BBox: {t['bbox']} | Conf: {t['confidence']:.2f}")

    # Assert track ID consistency
    if len(tracks_f1) > 0 and len(tracks_f2) > 0 and len(tracks_f3) > 0:
        id1 = tracks_f1[0]['track_id']
        id2 = tracks_f2[0]['track_id']
        id3 = tracks_f3[0]['track_id']
        if id1 == id2 == id3:
            print("\n✅ Verification Success: Track ID remains consistent across moving frames!")
        else:
            print(f"\n❌ Verification Failed: Track IDs split (IDs: {id1} -> {id2} -> {id3})")
    else:
        print("\n❌ Verification Failed: Active tracks were not registered by the tracker.")

    # Cleanup session
    manager.clear_session(session_id)

if __name__ == "__main__":
    run_tracker_test()
