import sys
import os
import torch
import logging
import time

# Check config to patch CUDA if hardware acceleration is disabled
try:
    import json
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../outputs/config.json"))
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            cfg = json.load(f)
            if not cfg.get("hardware_acceleration", True):
                print("Hardware Acceleration is DISABLED in config.json. Overriding CUDA availability to False.")
                torch.cuda.is_available = lambda: False
except Exception as e:
    print(f"Error checking hardware acceleration in config: {e}")

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add GroundingDINO source to path
_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO_sam3")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

from app.core.config import settings
from app.core.state import ml_models

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


from app.core.patch_transformers import patch_transformers
patch_transformers()

@asynccontextmanager
async def lifespan(app: FastAPI):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    ml_models["device"] = device
    logger.info(f"Using device: {device}")

    # ── 1. Load GroundingDINO ───────────────────────────────────────────────
    logger.info("Loading GroundingDINO model...")
    t0 = time.time()
    try:
        from groundingdino.util.inference import load_model
        model = load_model(
            settings.GROUNDING_DINO_CONFIG_PATH,
            settings.GROUNDING_DINO_WEIGHTS_PATH,
            device=device,
        )
        ml_models["detector"] = model
        logger.info(f"GroundingDINO loaded in {(time.time()-t0)*1000:.0f} ms on {device}.")
    except Exception as e:
        logger.error(f"Failed to load GroundingDINO: {e}")
        ml_models["detector"] = None

    # ── 2. Load Florence-2 (Commented Out for Gemma 4 Pivot) ────────────────
    # logger.info("Loading Florence-2-base model...")
    # t_flo = time.time()
    # try:
    #     from transformers import AutoProcessor, AutoModelForCausalLM
    #     # Load local or auto-download base model
    #     processor = AutoProcessor.from_pretrained("microsoft/Florence-2-base", trust_remote_code=True)
    #     model_flo = AutoModelForCausalLM.from_pretrained(
    #         "microsoft/Florence-2-base",
    #         trust_remote_code=True,
    #         attn_implementation="eager"
    #     ).to(device)
    #     
    #     ml_models["florence_model"] = model_flo
    #     ml_models["florence_processor"] = processor
    #     logger.info(f"Florence-2 loaded in {(time.time()-t_flo)*1000:.0f} ms on {device}.")
    # except Exception as e:
    #     logger.error(f"Failed to load Florence-2: {e}")
    #     ml_models["florence_model"] = None
    #     ml_models["florence_processor"] = None
    ml_models["florence_model"] = None
    ml_models["florence_processor"] = None

    # ── 3. Load QueryParser (Groq) ──────────────────────────────────────────
    try:
        from app.services.query_parser import QueryParser
        ml_models["query_parser"] = QueryParser()
        logger.info("QueryParser (Groq/Llama3) ready.")
    except Exception as e:
        logger.error(f"Failed to init QueryParser: {e}")
        ml_models["query_parser"] = None

    # ── 4. Load SAM 3 Image Model ───────────────────────────────────────────
    logger.info("Loading SAM3 image model...")
    t_sam3 = time.time()
    try:
        from sam3.model_builder import build_sam3_image_model
        from sam3.model.sam3_image_processor import Sam3Processor
        model_sam3 = build_sam3_image_model()
        processor_sam3 = Sam3Processor(model_sam3)
        ml_models["sam3_model"] = model_sam3
        ml_models["sam3_processor"] = processor_sam3
        logger.info(f"SAM3 image model loaded in {(time.time()-t_sam3)*1000:.0f} ms.")
    except Exception as e:
        logger.error(f"Failed to load SAM3: {e}")
        ml_models["sam3_model"] = None
        ml_models["sam3_processor"] = None

    yield

    ml_models.clear()
    logger.info("Models unloaded.")


# ── App factory ─────────────────────────────────────────────────────────────
from app.routers import vision, query as query_router
from app.routers import session as session_router

app = FastAPI(title="InsightVision API", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vision.router, prefix="/api")
app.include_router(query_router.router, prefix="/api/vision")
app.include_router(session_router.router)   # WS /ws/session — live session endpoint


@app.get("/health")
def health_check():
    has_gpu = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if has_gpu else "cpu"
    vram_gb = (
        round(torch.cuda.get_device_properties(0).total_memory / (1024 ** 3), 2)
        if has_gpu
        else 0.0
    )
    return {
        "status": "ok",
        "gpu": has_gpu,
        "device": device_name,
        "vram_gb": vram_gb,
        "detector_loaded":      ml_models.get("detector") is not None,
        "sam3_loaded":           ml_models.get("sam3_model") is not None,
        "florence_loaded":       ml_models.get("florence_model") is not None,
        "query_parser_loaded":   ml_models.get("query_parser") is not None,
    }
