import redis
import json
import logging
import hashlib
import time
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class RedisCache:
    def __init__(self):
        self.mem_client = {}  # In-memory fallback: key -> (json_str, expires_at)
        try:
            self.client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=0,
                decode_responses=True,
                socket_timeout=1.0,
                socket_connect_timeout=1.0
            )
            # Test connection
            self.client.ping()
            self.available = True
            logger.info(f"Connected to Redis cache at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Falling back to in-memory cache.")
            self.client = None
            self.available = False

    def _mem_get(self, key: str) -> Optional[str]:
        if key in self.mem_client:
            val, expires_at = self.mem_client[key]
            if time.time() < expires_at:
                return val
            else:
                del self.mem_client[key]
        return None

    def _mem_set(self, key: str, val: str, ttl: int):
        self.mem_client[key] = (val, time.time() + ttl)

    def get_track_cache(self, track_id: int, task: str, bucket_size: int = 5) -> Optional[dict]:
        bucket = int(time.time() / bucket_size) * bucket_size
        key = f"insightvision:track_cache:{track_id}:{task}:{bucket}"
        if not self.available:
            val = self._mem_get(key)
            return json.loads(val) if val else None

        try:
            val = self.client.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.warning(f"Redis error getting track cache: {e}")
        return None

    def set_track_cache(self, track_id: int, task: str, data: dict, ttl: int = 5, bucket_size: int = 5):
        bucket = int(time.time() / bucket_size) * bucket_size
        key = f"insightvision:track_cache:{track_id}:{task}:{bucket}"
        if not self.available:
            self._mem_set(key, json.dumps(data), ttl)
            return

        try:
            self.client.setex(key, ttl, json.dumps(data))
        except Exception as e:
            logger.warning(f"Redis error setting track cache: {e}")

    def get_static_cache(self, image_bytes: bytes, query: str, backend: str = "dino", conf_threshold: float = 0.35) -> Optional[dict]:
        image_hash = hashlib.sha256(image_bytes).hexdigest()
        key = f"insightvision:static_cache:{image_hash}:{query}:{backend}:{conf_threshold}"
        if not self.available:
            val = self._mem_get(key)
            return json.loads(val) if val else None

        try:
            val = self.client.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.warning(f"Redis error getting static cache: {e}")
        return None

    def set_static_cache(self, image_bytes: bytes, query: str, data: dict, backend: str = "dino", conf_threshold: float = 0.35, ttl: int = 3600):
        image_hash = hashlib.sha256(image_bytes).hexdigest()
        key = f"insightvision:static_cache:{image_hash}:{query}:{backend}:{conf_threshold}"
        if not self.available:
            self._mem_set(key, json.dumps(data), ttl)
            return

        try:
            self.client.setex(key, ttl, json.dumps(data))
        except Exception as e:
            logger.warning(f"Redis error setting static cache: {e}")

    def clear(self):
        self.mem_client.clear()
        if self.available:
            try:
                self.client.flushdb()
                logger.info("Redis cache cleared successfully")
            except Exception as e:
                logger.error(f"Failed to clear Redis database: {e}")

cache = RedisCache()
