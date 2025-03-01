from PIL import Image, ImageDraw
from base64 import b64encode
from json import load
import numpy as np
import grequests
import requests
import time
import cv2

config = None
frameBuffer = []
pos = 0
lastAlert = 0


# Annotates the image with the detected weapons
# Returns True if weapons were detected
def findWeapons(im):
	try:
		res = requests.post(config["weaponEndpoint"], files={
			"image": open("tmp.jpg", "rb"),
			"text_prompt": (None, config["weaponPrompt"])
		}).json()
	except Exception as e:
		print("Failed to query weapon AI")
		print(e)
		return []

	return res


# Returns True if fighting is detected
def isFighting():
	fourcc = cv2.VideoWriter_fourcc(*"mp4v")
	height, width = np.asarray(frameBuffer[0]).shape[:2]
	out = cv2.VideoWriter("temp_fight.mp4", fourcc, 10.0, (width, height))
	for i in range(len(frameBuffer)):
		idx = (pos + i) & 15
		frame_array = np.asarray(frameBuffer[idx])
		out.write(cv2.cvtColor(frame_array, cv2.COLOR_RGB2BGR))
	res = grequests.post(config["fightEndpoint"], files={
		"video": open("temp_fight.mp4", "rb")
	})
	out.release()
	return res


try:
	with open("config.json") as f:
		config = load(f)
except Exception as e:
	print("Failed to load secrets.json")
	print(e)
	exit(1)

vc = cv2.VideoCapture(0)

while True:
	# Pull a frame from the camera
	im = vc.read()[1]
	cv2.imwrite("tmp.jpg", im)

	im = Image.open("tmp.jpg")

	# Annotate fighting
	if len(frameBuffer) < 16:
		fighting = False
		frameBuffer.append(im)
	else:
		frameBuffer[pos] = im
		pos = (pos + 1) & 15
		fighting = isFighting()

	# Annotate weapons
	weapons = findWeapons(im)

	if fighting is not False:
		if type(weapons) == list:
			fighting, = grequests.map([fighting])
		else:
			fighting, weapons = grequests.map([fighting, weapons])
		fighting = fighting.json()["predicted_class"] == "fight"
	elif type(weapons) != list:
		weapons = grequests.map([weapons])

	annotated = ImageDraw.Draw(im)
	for obj in weapons:
		annotated.polygon([tuple(x) for x in obj["contour"]], outline="red", width=2)

	weapons = len(weapons) > 0

	if fighting or weapons:
		if fighting and weapons:
			msg = "Fighting and person with weapon detected at "
		elif fighting:
			msg = "Fighting detected at "
		else:
			msg = "Person with weapon detected at "
		print(msg + config["location"])
		b = grequests.post(config["alertEndpoint"], json={
			"type": "weapon" if weapons else "fighting",
			"location": config["location"],
			"capture": b64encode(im.tobytes()).decode("utf-8"),
		})
		if time.time() - lastAlert > 5:
			lastAlert = time.time()
			a = grequests.post(config["smsEndpoint"], json={
				"recipient": config["smsRecipient"],
				"message": msg + config["location"] + ". Please check dashboard for more information.",
			})

	cv2.imshow("Camera", np.asarray(im)[:, :, ::-1])
	key = cv2.waitKey(1)
	if key == 27:
		break
