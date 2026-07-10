import numpy as np
import cv2
from boxmot.trackers.bbox.botsort.botsort import BotSort

tracker = BotSort(with_reid=False, frame_rate=25)
img = np.zeros((480, 640, 3), dtype=np.uint8)

dets = np.array([[100, 100, 200, 200, 0.9, 0]], dtype=np.float32)
for _ in range(3):
    res = tracker.update(dets, img)

print("Active stracks:", len(tracker.tracked_stracks))
print("Lost stracks:", len(tracker.lost_stracks))
print("Removed stracks:", len(tracker.removed_stracks))

img2 = np.zeros((480, 640, 3), dtype=np.uint8)
empty_dets = np.empty((0, 6), dtype=np.float32)
res2 = tracker.update(empty_dets, img2)

print("\nAfter empty update:")
print("Active stracks:", len(tracker.tracked_stracks))
print("Lost stracks:", len(tracker.lost_stracks))
print("Removed stracks:", len(tracker.removed_stracks))

