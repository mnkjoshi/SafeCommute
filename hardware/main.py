from PIL import Image, ImageDraw
from base64 import b64encode
from json import load
import numpy as np
import grequests
import requests
import time
import cv2
import io
from datetime import datetime

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
	return False
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

vc = cv2.VideoCapture(2)

# Resize image to 360p for sending over network
def compress_to_360p(image):
    # Resize to 640x360 (16:9 aspect ratio for 360p)
    resized_image = image.resize((640, 360), Image.Resampling.LANCZOS)
    # Convert to bytes using JPEG compression
    img_byte_arr = io.BytesIO()
    resized_image.save(img_byte_arr, format='JPEG', quality=85)
    img_byte_arr.seek(0)
    return img_byte_arr.getvalue()

while True:
	# Clear buffer and grab the latest frame
	for _ in range(5):  # Skip buffered frames
		vc.grab()
	ret, im = vc.retrieve()  # Get only the latest frame
	if not ret:
		continue
		
	cv2.imwrite("tmp.jpg", im)

	im = Image.open("tmp.jpg")

	# Annotate fighting
	if len(frameBuffer) < 16:
		fighting = False
		frameBuffer.append(im)
	else:
		frameBuffer[pos] = im
		pos = (pos + 1) & 15
		# fighting = isFighting()

	# Annotate weapons
	weapons = findWeapons(im)

	fighting = False
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
		# generate random location
		# def generate_random_location():
		#	return f'{np.random.uniform(1, 100):.2f}, {np.random.uniform(1, 100):.2f}'
		def generate_random_location():
			# random location in edmonton
			return f'{np.random.uniform(53.5, 53.6):.6f}, {np.random.uniform(-113.5, -113.4):.6f}'
		config["location"] = generate_random_location()
		# print(datetime.now().strftime("%Y-%m-%d %H:%M:%S"), msg + config["location"])
		print(datetime.now().strftime("%Y-%m-%d %H:%M:%S"), msg + generate_random_location())
		b = None
		if config["alertEndpoint"]:
			# Compress image to 360p before sending
			compressed_image = compress_to_360p(im)
			b = grequests.post(config["alertEndpoint"], json={
				"type": "weapon" if weapons else "fighting",
				"location": config["location"],
				"capture": b64encode(compressed_image).decode("utf-8"),
			})
		if time.time() - lastAlert > 5:
			lastAlert = time.time()
			if config["smsEndpoint"]:
				a = grequests.post(config["smsEndpoint"], json={
					"recipient": config["smsRecipient"],
					"message": msg + config["location"] + ". Please check dashboard for more information.",
				})
				if b is not None:
					grequests.map([a, b])
				else:
					grequests.map([a])
		else:
			if b is not None:
				grequests.map([b])

	cv2.imshow("Camera", np.asarray(im)[:, :, ::-1])
	key = cv2.waitKey(1)
	if key == 27:
		break
