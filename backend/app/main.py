from fastapi import FastAPI
import torch
import logging
from contextlib import asynccontextmanager
from app.core.config import settings
from groundingdino.util.inference import load_model

logger = logging.getLogger(__name__)

from app.core.state import ml_models

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading Grounding DINO model...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu":
        logger.warning("Running Grounding DINO on CPU — latency will be high, for integration testing only")
        
    try:
        model = load_model(
            settings.GROUNDING_DINO_CONFIG_PATH, 
            settings.GROUNDING_DINO_WEIGHTS_PATH,
            device=device
        )
        ml_models["detector"] = model
        logger.info("Grounding DINO loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load Grounding DINO: {e}")
        ml_models["detector"] = None
        
    yield
    
    ml_models.clear()
    logger.info("Models unloaded.")

from app.routers import vision

app = FastAPI(title="InsightVision API", version="0.1.0", lifespan=lifespan)

# CORS middleware for frontend integration
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vision.router, prefix="/api")

@app.get("/api/chat")
def dummy_chat():
    # Dummy endpoint to prevent 404 spam from browser extensions or old tabs polling for a chat API
    return {"status": "ignored"}

@app.get("/health")
def health_check():
    has_gpu = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if has_gpu else "cpu"
    vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2) if has_gpu else 0.0

    return {
        "status": "ok",
        "gpu": has_gpu,
        "device": device_name,
        "vram_gb": vram_gb
    }
