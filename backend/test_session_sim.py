import cv2
import numpy as np
from app.services.tracker import ConcreteTracker
from app.services.detector import GroundingDINODetector
from app.core.config import settings
from groundingdino.util.inference import load_model

print("Loading DINO...")
model = load_model(settings.GROUNDING_DINO_CONFIG_PATH, settings.GROUNDING_DINO_WEIGHTS_PATH, device="cuda")
detector = GroundingDINODetector(model)

tracker = ConcreteTracker(method="botsort", frame_rate=25)

cap = cv2.VideoCapture("../images/inisghtvision_testing_video.mp4")
ret, frame0 = cap.read()

# Lock-on
print("Detecting...")
det = detector.detect(cv2.cvtColor(frame0, cv2.COLOR_BGR2RGB), "person in orange vest", 0.35)
print("Detections:", len(det["boxes"]))

dets_np = np.array(
    [[b[0], b[1], b[2], b[3], s, 0.0]
     for b, s in zip(det["boxes"], det["scores"])],
    dtype=np.float32,
)

print("Lock-on update...")
for i in range(3):
    res = tracker.update(dets_np, frame0)
    print(f"Hit {i+1} tracks: {len(res)}")

ret, frame1 = cap.read()
print("Next frame empty update...")
empty = np.empty((0, 6), dtype=np.float32)
res = tracker.update(empty, frame1)
print(f"Empty tracks: {len(res)}")
if len(res) > 0:
    print(res)

