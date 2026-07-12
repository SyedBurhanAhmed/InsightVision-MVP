import cv2
import numpy as np
import time
from app.core.state import ml_models
from sam3.model_builder import build_sam3_image_model
from sam3.model.sam3_image_processor import Sam3Processor
from PIL import Image
import torch

model = build_sam3_image_model()
processor = Sam3Processor(model)

cap = cv2.VideoCapture("../images/inisghtvision_testing_video.mp4")
# read the 50th frame
for _ in range(50):
    ret, frame = cap.read()
cap.release()

if ret:
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(frame_rgb)
    with torch.no_grad(), torch.amp.autocast("cuda", dtype=torch.bfloat16):
        inference_state = processor.set_image(pil_img)
        processor.reset_all_prompts(inference_state)
        output = processor.set_text_prompt(prompt="person wearing orange vest", state=inference_state)
        print("Raw scores:", output.get("scores"))
else:
    print("Could not read video")
