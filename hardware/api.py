from typing import List

import cv2
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from lang_sam import LangSAM
from PIL import Image
from pydantic import BaseModel

model = LangSAM()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.post("/api/detect")
async def detect(
    image: UploadFile = File(...),
    text_prompt: str = Form("object"),
    box_threshold: float = Form(0.3),
    text_threshold: float = Form(0.25),
) -> List[DetectResponse]:
    image_pil = Image.open(image.file).convert("RGB")
    results = model.predict([image_pil], [text_prompt], box_threshold, text_threshold)
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
        contour = biggest[:, 0, :] if biggest is not None else []
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7070)
