from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import os
import time
import uuid
import threading
import replicate

from dotenv import load_dotenv
from pathlib import Path
from collections import deque

# ======================
# ENV LOAD
# ======================
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

if not REPLICATE_API_TOKEN:
    raise Exception("Missing REPLICATE_API_TOKEN")

# ======================
# APP
# ======================
app = FastAPI()
@app.get("/")
def home():
    return {"message": "API is working"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================
# MODEL
# ======================
class GenerateRequest(BaseModel):
    prompt: str
    style: str

# ======================
# CLIENT (FIX IS HERE)
# ======================
client = replicate.Client(api_token=REPLICATE_API_TOKEN)

# ======================
# APP INIT
# ======================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================
# MODEL
# ======================
class GenerateRequest(BaseModel):
    prompt: str
    style: str

# ======================
# MEMORY STORAGE
# ======================
job_queue = deque()
job_status = {}
job_results = {}

# ======================
# WORKER
# ======================
def worker():
    while True:
        if not job_queue:
            time.sleep(0.5)
            continue

        job = job_queue.popleft()
        job_id = job["id"]

        job_status[job_id] = "processing"

        try:
            output = client.run(
                "black-forest-labs/flux-schnell",
                input={
                    "prompt": f"{job['prompt']}, {job['style']} style"
                }
            )

            image_url = output[0] if isinstance(output, list) else output

            job_results[job_id] = {
                "image_url": image_url,
                "prompt": job["prompt"],
                "style": job["style"]
            }

            job_status[job_id] = "done"

        except Exception as e:
            job_status[job_id] = "error"
            job_results[job_id] = {"error": str(e)}

# start worker
threading.Thread(target=worker, daemon=True).start()

# ======================
# GENERATE ENDPOINT
# ======================
@app.post("/generate")
def generate(req: GenerateRequest):

    job_id = str(uuid.uuid4())

    job_queue.append({
        "id": job_id,
        "prompt": req.prompt,
        "style": req.style
    })

    job_status[job_id] = "queued"

    return {
        "success": True,
        "job_id": job_id
    }

# ======================
# STATUS ENDPOINT
# ======================
@app.get("/status/{job_id}")
def get_status(job_id: str):

    if job_id not in job_status:
        return {
            "success": False,
            "error": "not_found"
        }

    return {
        "success": True,
        "status": job_status[job_id],
        "result": job_results.get(job_id)
    }