"""
InsightVision — Unified API Schemas (Pydantic v2)

Unified contract serving both the Vercel web frontend (React/Vite)
AND the Flutter mobile app under one backend.

Resolution decisions applied:
  - bbox: absolute pixels [x, y, w, h]  (web canvas)
  - normalized_bbox: [x1, y1, x2, y2]  0-1 floats (mobile / responsive)
  - id: string (MongoDB style)
  - id_int: Unix timestamp integer (web mock compat)
  - query + prompt: same string, both keys returned
  - answer + result: same string, both keys returned
  - timestamp + time: same moment, both keys returned (different format)
"""

from __future__ import annotations

import time
from typing import List, Optional

from pydantic import BaseModel, Field, computed_field


# ─────────────────────────────────────────────────────────────────────────────
# REQUEST MODELS
# ─────────────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    """
    Body for POST /api/vision/query
    Note: image is sent as multipart UploadFile — not part of this model.
    This model covers the text fields only.
    """
    query: str = Field(..., description="Natural language query from the user")
    conf_threshold: float = Field(0.35, ge=0.0, le=1.0)


# ─────────────────────────────────────────────────────────────────────────────
# SHARED SUB-MODELS
# ─────────────────────────────────────────────────────────────────────────────

class DetectedObject(BaseModel):
    """
    A single detected object — used in both /detect and /vision/query responses.
    """
    id: str = Field(..., description="Object ID e.g. 'P001'")
    # Web field: 'class' / 'type' — return both
    type: str = Field(..., description="Detected class label e.g. 'person'")
    # confidence / score — return both field names
    confidence: float = Field(..., description="Detection confidence [0, 1]")
    score: float = Field(..., description="Alias for confidence (web compat)")

    # Absolute pixel bbox [x, y, w, h] — web canvas draws with this
    bbox: List[float] = Field(
        ...,
        description="Bounding box [x, y, width, height] in absolute pixels"
    )
    # Normalized bbox [x1, y1, x2, y2] in 0-1 — for mobile/responsive overlays
    normalized_bbox: List[float] = Field(
        ...,
        description="Bounding box [x1_norm, y1_norm, x2_norm, y2_norm] in 0-1 range"
    )

    color: str = Field(default="#00D4FF", description="Hex color for overlay rendering")

    @computed_field(alias="class")
    @property
    def class_name(self) -> str:
        """Alias for frontend 'obj.class' expectation."""
        return self.type

    @classmethod
    def from_xyxy(
        cls,
        obj_id: str,
        label: str,
        score: float,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        img_w: int,
        img_h: int,
        color: str = "#00D4FF",
    ) -> "DetectedObject":
        """
        Build a DetectedObject from raw [x1, y1, x2, y2] absolute pixel coords
        plus image dimensions for normalization.
        """
        w = x2 - x1
        h = y2 - y1
        # Clamp normalized values to [0, 1]
        nx1 = max(0.0, min(1.0, x1 / img_w))
        ny1 = max(0.0, min(1.0, y1 / img_h))
        nx2 = max(0.0, min(1.0, x2 / img_w))
        ny2 = max(0.0, min(1.0, y2 / img_h))
        return cls(
            id=obj_id,
            type=label,
            confidence=round(score, 4),
            score=round(score, 4),
            bbox=[round(x1, 1), round(y1, 1), round(w, 1), round(h, 1)],
            normalized_bbox=[round(nx1, 4), round(ny1, 4), round(nx2, 4), round(ny2, 4)],
            color=color,
        )


# ─────────────────────────────────────────────────────────────────────────────
# DETECT ENDPOINT  —  POST /api/detect
# ─────────────────────────────────────────────────────────────────────────────

class DetectResponse(BaseModel):
    """Response for POST /api/detect (ObjectDetection.tsx page)."""
    objects: List[DetectedObject]
    inference_ms: float
    total_ms: float
    device: str = "cpu"


# ─────────────────────────────────────────────────────────────────────────────
# VLM QUERY ENDPOINT  —  POST /api/vision/query
# ─────────────────────────────────────────────────────────────────────────────

class QueryResponse(BaseModel):
    """
    Response for POST /api/vision/query.
    Dual-fields for web (query/answer/timestamp/id_int)
    and mobile (prompt/result/time/id) compatibility.
    """
    # Dual IDs
    id: str = Field(..., description="String ID (MongoDB hex style for mobile)")
    id_int: int = Field(..., description="Unix timestamp integer (web mock compat)")

    # Dual prompt fields
    query: str = Field(..., description="User's original query (web key)")
    prompt: str = Field(..., description="User's original query (mobile key)")

    # Dual answer fields
    answer: str = Field(..., description="NL answer from the Composer (web key)")
    result: str = Field(..., description="NL answer from the Composer (mobile key)")

    # Dual time fields
    timestamp: str = Field(..., description="Human-readable time e.g. 'Just now' (web)")
    time: str = Field(..., description="Clock time e.g. '14:46 PM' (mobile)")

    # Detected objects with dual bbox
    objects: List[DetectedObject] = Field(default_factory=list)

    # Task routing metadata
    task: str = Field(..., description="Routed task: detect|ocr|segment|describe|count")

    # Latency breakdown
    inference_ms: float = Field(0.0)
    parser_ms: float = Field(0.0)
    total_ms: float = Field(0.0)
    device: str = "cpu"

    @classmethod
    def build(
        cls,
        query_text: str,
        answer_text: str,
        task: str,
        objects: List[DetectedObject],
        inference_ms: float,
        parser_ms: float,
        total_ms: float,
        device: str = "cpu",
    ) -> "QueryResponse":
        import datetime
        now = datetime.datetime.now()
        ts_int = int(now.timestamp() * 1000)
        hex_id = format(ts_int, "024x")         # 24-char hex, MongoDB-ish
        clock_time = now.strftime("%I:%M %p")   # e.g. "02:46 PM"
        return cls(
            id=hex_id,
            id_int=ts_int,
            query=query_text,
            prompt=query_text,
            answer=answer_text,
            result=answer_text,
            timestamp="Just now",
            time=clock_time,
            objects=objects,
            task=task,
            inference_ms=round(inference_ms, 1),
            parser_ms=round(parser_ms, 1),
            total_ms=round(total_ms, 1),
            device=device,
        )


# ─────────────────────────────────────────────────────────────────────────────
# STREAM LOG  (unchanged — kept for completeness)
# ─────────────────────────────────────────────────────────────────────────────

class StreamSegment(BaseModel):
    text: str
    color: Optional[str] = None


class StreamLog(BaseModel):
    frame: str
    opacity: float
    segments: List[StreamSegment]
