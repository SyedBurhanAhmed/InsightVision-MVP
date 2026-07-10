import os
from pydantic_settings import BaseSettings

# Path to the GroundingDINO source (already cloned + working in benchmarks dir)
_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO")

class Settings(BaseSettings):
    PROJECT_NAME: str = "InsightVision API"

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # GroundingDINO — paths to the already-downloaded weights and config
    GROUNDING_DINO_CONFIG_PATH: str = os.path.join(
        _DINO_ROOT, "groundingdino/config/GroundingDINO_SwinT_OGC.py"
    )
    GROUNDING_DINO_WEIGHTS_PATH: str = os.path.join(
        _DINO_ROOT, "weights/groundingdino_swint_ogc.pth"
    )
    BOX_THRESHOLD: float = 0.35
    TEXT_THRESHOLD: float = 0.25

    # Groq LLM
    GROQ_API_KEY: str = ""

    class Config:
        env_file = os.path.join(os.path.dirname(__file__), "../../../../.env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
