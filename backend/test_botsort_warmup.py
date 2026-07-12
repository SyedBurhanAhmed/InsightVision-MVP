import cv2, numpy as np
from app.services.track_manager import TrackManager

cap = cv2.VideoCapture("../images/insightvision_orange_vest_testing_video.mp4")
ret, frame = cap.read()
cap.release()

if ret:
    print("Frame read successfully.")
    manager = TrackManager(method="botsort", frame_rate=25)
    dets_np = np.array([[100, 100, 200, 200, 0.9, 0.0]], dtype=np.float32)
    
    print("Starting warmup loop...")
    for i in range(3):
        print(f"Iteration {i}...")
        tracks = manager.update_track("test-session", dets_np, frame, ["person"])
        print(f"Iteration {i} done, tracks: {tracks}")
else:
    print("Failed to read frame.")
