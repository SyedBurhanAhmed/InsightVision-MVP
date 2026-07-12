import cv2
import numpy as np
from app.services.detector import GroundingDINODetector
from app.core.config import settings
from groundingdino.util.inference import load_model

model = load_model(settings.GROUNDING_DINO_CONFIG_PATH, settings.GROUNDING_DINO_WEIGHTS_PATH, device="cuda")
detector = GroundingDINODetector(model)

cap = cv2.VideoCapture("../images/inisghtvision_testing_video.mp4")
ret, frame0 = cap.read()

det = detector.detect(cv2.cvtColor(frame0, cv2.COLOR_BGR2RGB), "person in orange vest", 0.35)
print("Scores:", det["scores"])

