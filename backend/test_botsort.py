import numpy as np
import cv2
from boxmot.trackers.bbox.botsort.botsort import BotSort

tracker = BotSort(with_reid=False, frame_rate=30)
img = np.zeros((480, 640, 3), dtype=np.uint8)

print("Frame 1: lock on")
dets = np.array([[100, 100, 200, 200, 0.9, 0]])
for _ in range(3):
    res = tracker.update(dets, img)
print("Confirmed tracks:", res)

print("\nFrame 2: empty")
res2 = tracker.update(np.empty((0,6)), img)
print("Returned tracks:", res2)

print("\nLost stracks:", len(tracker.lost_stracks))
for t in tracker.lost_stracks:
    print(dir(t))
    try:
        print("xyxy:", t.xyxy)
    except Exception as e:
        print("xyxy Error:", e)
    try:
        print("tlbr:", t.tlbr)
    except Exception as e:
        print("tlbr Error:", e)

