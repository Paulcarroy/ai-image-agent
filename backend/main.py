from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import replicate
import time
import uuid
import threading
from collections import deque

# ======================
# LOAD ENV
# ======================
load_dotenv()

REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

# ======================
# APP INIT
# ======================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================
# REQUEST MODEL
# ======================
class GenerateRequest(BaseModel):
    prompt: str
    style: str

# ======================
# REPLICATE CLIENT
# ======================
client = replicate.Client(api_token=REPLICATE_API_TOKEN)

# ======================
# SIMPLE QUEUE SYSTEM (PHASE 2)
# ======================
job_queue = deque()
job_results = {}

queue_lock = threading.Lock()

# ======================
# WORKER (runs in background)
# ======================
def worker():
    while True:
        if len(job_queue) == 0:
            time.sleep(0.5)
            continue

        queue_lock.acquire()
        job = job_queue.popleft()
        queue_lock.release()

        job_id = job["id"]
        prompt = job["prompt"]
        style = job["style"]

        try:
            print(f"🚀 Processing job {job_id}")

            model = "stability-ai/stable-diffusion-3"

            output = client.run(
                model,
                input={
                    "prompt": f"{prompt}, {style} style"
                }
            )

            image_url = output[0] if isinstance(output, list) else output

            job_results[job_id] = {
                "status": "done",
                "image_url": image_url,
                "prompt": prompt,
                "style": style
            }

        except Exception as e:
            job_results[job_id] = {
                "status": "error",
                "error": str(e)
            }

# Start worker thread
threading.Thread(target=worker, daemon=True).start()

# ======================
# CREATE JOB (ASYNC)
# ======================
@app.post("/generate")
def generate_image(req: GenerateRequest):

    job_id = str(uuid.uuid4())

    job_queue.append({
        "id": job_id,
        "prompt": req.prompt,
        "style": req.style
    })

    job_results[job_id] = {
        "status": "processing"
    }

    return {
        "success": True,
        "job_id": job_id,
        "status": "processing"
    }

# ======================
# GET JOB STATUS
# ======================
@app.get("/status/{job_id}")
def get_status(job_id: str):

    result = job_results.get(job_id)

    if not result:
        return {
            "success": False,
            "error": "Job not found"
        }

    return {
        "success": True,
        "job": result
    }