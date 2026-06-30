from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "InsightVision API"
    
    # Grounding DINO configs
    GROUNDING_DINO_CONFIG_PATH: str = "models/GroundingDINO_SwinT_OGC.py"
    GROUNDING_DINO_WEIGHTS_PATH: str = "models/groundingdino_swint_ogc.pth"
    BOX_THRESHOLD: float = 0.35
    TEXT_THRESHOLD: float = 0.25

settings = Settings()
