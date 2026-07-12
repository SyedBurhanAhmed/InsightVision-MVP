import numpy as np
import cv2
from app.services.tracker import ConcreteTracker

tracker = ConcreteTracker(method="botsort", frame_rate=25)
img = np.zeros((480, 640, 3), dtype=np.uint8)

dets = np.array([[100, 100, 200, 200, 0.9, 0]], dtype=np.float32)
for _ in range(3):
    res = tracker.update(dets, img)

print("Active stracks ID vs TRACK_ID:")
for t in getattr(tracker.tracker, 'active_stracks', getattr(tracker.tracker, 'tracked_stracks', [])):
    print(f"Tracked: id={getattr(t, 'id', None)}, track_id={getattr(t, 'track_id', None)}")

empty_dets = np.empty((0, 6), dtype=np.float32)
res = tracker.update(empty_dets, img)

print("Lost stracks ID vs TRACK_ID:")
for t in getattr(tracker.tracker, 'lost_stracks', []):
    print(f"Lost: id={getattr(t, 'id', None)}, track_id={getattr(t, 'track_id', None)}")

