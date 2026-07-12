import cv2
import numpy as np
import time
from app.core.state import ml_models
from app.services.detector import SAM3Detector

# Load SAM3
from sam3.model_builder import build_sam3_image_model
from sam3.model.sam3_image_processor import Sam3Processor
print("Loading model...")
model = build_sam3_image_model()
print("Model loaded.")

detector = SAM3Detector(model)

cap = cv2.VideoCapture("../images/inisghtvision_testing_video.mp4")
ret, frame = cap.read()
cap.release()

if ret:
    res = detector.detect(frame, "person wearing orange vest", conf_threshold=0.1)
    print("Scores found:", res["scores"])
    print("Boxes found:", res["boxes"])
else:
    print("Could not read video")
