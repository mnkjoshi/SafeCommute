from typing import List
import os
import cv2
import tempfile
import torch
import torchvision
import numpy as np
import albumentations as A
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from lang_sam import LangSAM
from PIL import Image
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =======================
# LangSAM-based Detection
# =======================

class IdentifyResponse(BaseModel):
    product: str
    thumbnail: str

class Point(BaseModel):
    x: int
    y: int

class Box(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int

class DetectResponse(BaseModel):
    center: Point
    box: Box
    contour: List[List[int]]

# Initialize the LangSAM model
lang_sam_model = LangSAM(sam_type="sam2.1_hiera_large")

@app.post("/api/detect")
async def detect(
    image: UploadFile = File(...),
    text_prompt: str = Form("object"),
    box_threshold: float = Form(0.3),
    text_threshold: float = Form(0.25),
) -> List[DetectResponse]:
    image_pil = Image.open(image.file).convert("RGB")
    results = lang_sam_model.predict([image_pil], [text_prompt], box_threshold, text_threshold)
    results = results[0]

    masks = results["masks"]
    boxes = results["boxes"]
    centers = (boxes[:, :2] + boxes[:, 2:]) / 2
    boxes = boxes.astype(int)
    centers = centers.astype(int)

    contours = []
    for mask in masks:
        mask = mask.astype('uint8')
        cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        biggest = max(cs, key=cv2.contourArea) if cs else None
        contour = biggest[:, 0, :].tolist() if biggest is not None else []
        contours.append(contour)

    responses = []
    for box, center, contour in zip(boxes, centers, contours):
        center_x, center_y = center
        x1, y1, x2, y2 = box
        response = DetectResponse(
            center=Point(x=center_x, y=center_y),
            box=Box(x1=x1, y1=y1, x2=x2, y2=y2),
            contour=contour
        )
        responses.append(response)
    return responses

# =======================
# Fight Detection Endpoint
# =======================

# Global parameters for fight detection
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
FIGHT_SEQUENCE_LENGTH = 16
FIGHT_CLASSES_LIST = ['fight', 'noFight']

def fight_transform():
    """Define a transformation pipeline for fight detection frames."""
    return A.Compose([
        A.Resize(128, 171, always_apply=True),
        A.CenterCrop(112, 112, always_apply=True),
        A.Normalize(mean=[0.43216, 0.394666, 0.37645],
                    std=[0.22803, 0.22145, 0.216989],
                    always_apply=True)
    ])

def extract_frames(video_path: str, sequence_length: int = FIGHT_SEQUENCE_LENGTH):
    """
    Extract a fixed number of frames from the video.
    Frames are sampled uniformly across the video's duration.
    """
    frames_list = []
    cap = cv2.VideoCapture(video_path)
    try:
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        skip = max(int(frame_count / sequence_length), 1)
        transform = fight_transform()
        for i in range(sequence_length):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i * skip)
            ret, frame = cap.read()
            if not ret:
                break
            # Convert frame from BGR to RGB and apply transformation
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            transformed = transform(image=frame_rgb)['image']
            frames_list.append(transformed)
    finally:
        cap.release()
    return frames_list

def load_fight_model():
    """
    Load the pretrained fight detection model.
    Assumes the model file 'model_16_m3_0.8888.pth' is present in the working directory.
    """
    model_path = 'model_16_m3_0.8888.pth'
    model_ft = torchvision.models.video.mc3_18(pretrained=True, progress=False)
    num_ftrs = model_ft.fc.in_features
    model_ft.fc = torch.nn.Linear(num_ftrs, 2)
    model_ft.load_state_dict(torch.load(model_path, map_location=device))
    model_ft.to(device)
    model_ft.eval()
    return model_ft

# Load the fight detection model once during app startup.
fight_model = load_fight_model()

def predict_fight(clips: List[np.ndarray]) -> str:
    """
    Perform inference on the processed frames and return the predicted class.
    """
    with torch.no_grad():
        input_frames = np.array(clips)  # shape: [sequence_length, H, W, C]
        input_frames = np.expand_dims(input_frames, axis=0)  # shape: [1, sequence_length, H, W, C]
        input_frames = np.transpose(input_frames, (0, 4, 1, 2, 3))  # shape: [1, C, sequence_length, H, W]
        input_tensor = torch.tensor(input_frames, dtype=torch.float32).to(device)
        outputs = fight_model(input_tensor)
        softmax = torch.nn.Softmax(dim=1)
        probs = softmax(outputs)
        _, predicted_idx = torch.max(probs, 1)
    return FIGHT_CLASSES_LIST[predicted_idx.item()]

class FightDetectionResponse(BaseModel):
    predicted_class: str

@app.post("/api/fight", response_model=FightDetectionResponse)
async def fight_detect(video: UploadFile = File(...)):
    """
    Endpoint for fight detection.
    Upload a video file; the API extracts frames and returns whether a 'fight' is detected.
    """
    # Save uploaded video to a temporary file securely.
    suffix = os.path.splitext(video.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        contents = await video.read()
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        frames = extract_frames(tmp_path, FIGHT_SEQUENCE_LENGTH)
        if len(frames) < FIGHT_SEQUENCE_LENGTH:
            return FightDetectionResponse(predicted_class="Error: Not enough frames in video.")
        prediction = predict_fight(frames)
    finally:
        os.remove(tmp_path)

    return FightDetectionResponse(predicted_class=prediction)

# =======================
# App Entry Point
# =======================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7070)
