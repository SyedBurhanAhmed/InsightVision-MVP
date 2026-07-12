import cv2
import numpy as np
import asyncio
import time
from app.services.tracker import ConcreteTracker
from app.services.detector import GroundingDINODetector
from app.core.config import settings
from groundingdino.util.inference import load_model

async def main():
    print("Loading DINO...")
    model = load_model(settings.GROUNDING_DINO_CONFIG_PATH, settings.GROUNDING_DINO_WEIGHTS_PATH, device="cuda")
    detector = GroundingDINODetector(model)

    tracker = ConcreteTracker(method="botsort", frame_rate=25)

    cap = cv2.VideoCapture("../images/insightvision_orange_vest_testing_video.mp4")
    ret, frame0 = cap.read()

    print("Lock-on...")
    det = detector.detect(cv2.cvtColor(frame0, cv2.COLOR_BGR2RGB), "person in orange vest", 0.4)
    print("Scores:", det["scores"])

    dets_np = np.array(
        [[b[0], b[1], b[2], b[3], s, 0.0]
         for b, s in zip(det["boxes"], det["scores"])],
        dtype=np.float32,
    )
    
    # 3-hit loop
    tracks = []
    for _ in range(3):
        tracks = tracker.update(dets_np, frame0)
    
    print(f"Lock-on tracks: {tracks}")

    print("\nSimulating frame updates...")
    for i in range(1, 10):
        ret, frame = cap.read()
        if not ret: break
        
        empty = np.empty((0, 6), dtype=np.float32)
        res = tracker.update(empty, frame)
        print(f"Frame {i} tracks: {res}")
        if len(res) == 0:
            print("LOST!")
            break
            
if __name__ == "__main__":
    asyncio.run(main())
