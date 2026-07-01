# InsightVision Unified Frontend-Backend API Contract

This document defines the unified API contract to support both the **Vercel Web Frontend (React/Vite)** and the **Flutter Mobile App** under a single FastAPI/Python backend. 

---

## 1. Network Requests & Routing Overview

To unify the visual inference capabilities of the web client with the database persistence, history, and authentication layers of the mobile client, the backend will expose the following endpoint registry:

| Endpoint Path | HTTP Method | Auth Required | Description / Client Target |
|---|---|---|---|
| `/api/auth/register` | `POST` | No | Registers a new user (Mobile / future Web) |
| `/api/auth/login` | `POST` | No | Authenticates user, returns JWT (Mobile / future Web) |
| `/api/auth/me` | `GET` | Yes | Retrieves authenticated user profile (Mobile / Web) |
| `/api/detections` | `GET` | Yes | Fetches historical log of security detections (Mobile) |
| `/api/detections` | `POST` | Yes | Saves a detection event manually or automatically (Mobile) |
| `/api/queries` | `GET` | Yes | Fetches historical VLM natural language query logs (Mobile) |
| `/api/queries` | `POST` | Yes | Saves a VLM query event manually or automatically (Mobile) |
| `/api/analytics/summary`| `GET` | Yes | Fetches dashboard summary charts and node statuses (Mobile) |
| `/api/vision/query` | `POST` | Yes | Runs real-time VLM inference on uploaded image/video (Web) |
| `/api/vision/detect` | `POST` | Yes | Runs object detection pipeline on uploaded image (Web) |

---

## 2. Client Conflicts & Proposed Resolutions

The web client (React/Vite) and mobile client (Flutter) were developed independently and present key interface disagreements. Below is the list of conflicts and their resolutions:

### A. VLM Queries: Property Naming Disagreement
The web mock data and mobile database models use different keys to represent VLM prompts and answers.

| Conflict Dimension | Vercel Web Client | Flutter Mobile Client | Propose Resolution |
|---|---|---|---|
| **Prompt Field** | `query` (String) | `prompt` (String) | **Dual-Compatibility Response**: Return both `query` and `prompt` pointing to the same string value. |
| **Response Field** | `answer` (String) | `result` (String) | **Dual-Compatibility Response**: Return both `answer` and `result` pointing to the same VLM response string. |
| **Time Field** | `timestamp` (String, e.g. "Just now") | `time` (String, e.g. "14:46 PM") | **Dual-Compatibility Response**: Return both `timestamp` and `time` with appropriately formatted strings. |
| **Identifier** | `id` (Integer/Timestamp) | `id` (String / MongoDB ObjectId) | **DECISION NEEDED**: Mobile expects `id` to be a string MongoDB hex ID (e.g. `60d0fe4f53...`). Web parses `id` as a Unix timestamp number. Propose returning `id` as a String (for Mobile) and adding an `id_int` or `timestamp_id` field for Web, or update the Web frontend to parse string IDs. |

---

### B. Bounding Box Coordinate System
The web client draws overlay boxes on a React canvas and expects specific absolute coordinates. The mobile client does not draw overlays yet but will need a responsive coordinate system.

| Dimension | Web Client Expectation | Mobile/ML Model Output | Proposed Resolution |
|---|---|---|---|
| **Coordinate Type** | Absolute pixels | Absolute pixels (`[x1, y1, x2, y2]`) | FastAPI converts `[x1, y1, x2, y2]` to `[x, y, w, h]` (top-left X, top-left Y, width, height) to match the Web client's drawing canvas. |
| **Responsiveness** | Hardcoded box dimension (`w-20 h-28` in tracking) or absolute pixel coordinates. | Normalized 0-1 decimals or dynamic pixel sizes. | **DECISION NEEDED**: Absolute coordinates break when a video feed changes size responsively. We propose returning both: `bbox` (absolute `[x,y,w,h]` for web) and a new `normalized_bbox` (`[x_min, y_min, x_max, y_max]` in 0.0 - 1.0 range) to future-proof responsive layouts on both Web and Mobile. |

---

### C. Real-Time Tracking vs. Event History
The web client tracks objects across video frames in real-time, whereas the mobile client lists static, aggregated history logs.

| Dimension | Web Client Tracker (`ObjectTracking.tsx`) | Mobile Client History (`HistorySession`) | Proposed Resolution |
|---|---|---|---|
| **Tracked Items** | List of `TrackedObject`: `{ id, type, status, path: [[x,y], ...], currentPos: [x,y] }` | List of `HistorySession`: `{ id, title, summary, time, source, status, trackedObjects: ["Person", "Vehicle"] }` | When a real-time detection event is completed or flagged, the backend will use its **Composer** module to auto-generate a `title` and `summary` from the detected classes. It saves this as a `Detection` database document which fits the mobile client's history endpoints, while leaving the live coordinates for the immediate web WebSocket/HTTP socket feed. |

---

### D. Image Upload & Transmission
*   **Web Request**: Transmits image data via `multipart/form-data` as a binary file alongside form string parameters.
*   **Mobile Request**: Currently has no image transmission code.
*   **Resolution**: Standardize both clients on `multipart/form-data` with `image` (binary file) and `prompt`/`query` (string) as form-data parameters. This ensures high-performance binary transmission without the overhead of Base64 JSON wrapping.

---

## 3. Detailed Request/Response Schemas

### A. Authentication Schemas

#### 1. User Register (`POST /api/auth/register`)
*   **Request Body (`application/json`):**
    ```json
    {
      "name": "User Name",
      "email": "user@insightvision.ai",
      "password": "securepassword123"
    }
    ```
*   **Response Body (`application/json` - HTTP 201):**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "60d0fe4f5311236168a109ca",
        "name": "User Name",
        "email": "user@insightvision.ai",
        "region": "NORTH_CLUSTER_01",
        "accessLevel": "SECURE_LINK / ACTIVE"
      }
    }
    ```

#### 2. User Login (`POST /api/auth/login`)
*   **Request Body (`application/json`):**
    ```json
    {
      "email": "user@insightvision.ai",
      "password": "securepassword123"
    }
    ```
*   **Response Body (`application/json` - HTTP 200):**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "60d0fe4f5311236168a109ca",
        "name": "User Name",
        "email": "user@insightvision.ai",
        "region": "NORTH_CLUSTER_01",
        "accessLevel": "SECURE_LINK / ACTIVE"
      }
    }
    ```

---

### B. Visual Inference Schemas

#### 1. Real-Time VLM Query (`POST /api/vision/query`)
*   **Request Headers:** `Authorization: Bearer <token>`
*   **Request Body (`multipart/form-data`):**
    *   `image`: Binary file (image/jpeg or image/png)
    *   `prompt` (or `query`): String (e.g. *"Is there suspicious movement?"*)
    *   `conf_threshold`: Float (default `0.35`)
*   **Response Body (`application/json` - HTTP 200) [Unified QueryResult + VlmQueryRecord]:**
    ```json
    {
      "id": "60d0fe4f5311236168a109cb",          // String MongoDB ID (Mobile)
      "id_int": 1719163234512,                     // Integer Timestamp (Web)
      "query": "Is there suspicious movement?",    // Web field name
      "prompt": "Is there suspicious movement?",   // Mobile field name
      "answer": "Yes, 1 person breaches gate.",    // Web VLM result
      "result": "Yes, 1 person breaches gate.",    // Mobile VLM result
      "timestamp": "Just now",                     // Web formatted timestamp
      "time": "14:46 PM",                          // Mobile clock time
      "objects": [
        {
          "type": "Person",
          "id": "P001",
          "bbox": [150, 120, 80, 200],            // Absolute absolute coords [x, y, w, h] (Web)
          "normalized_bbox": [0.15, 0.12, 0.23, 0.32] // Normalized coords [x1, y1, x2, y2]
        }
      ],
      "inference_ms": 142.5,
      "total_ms": 168.2
    }
    ```

#### 2. Live Object Detection (`POST /api/vision/detect`)
*   **Request Headers:** `Authorization: Bearer <token>`
*   **Request Body (`multipart/form-data`):**
    *   `image`: Binary file
    *   `prompt`: String (e.g. *"Person"*)
    *   `conf_threshold`: Float (default `0.35`)
*   **Response Body (`application/json` - HTTP 200):**
    ```json
    {
      "objects": [
        {
          "id": "P001",
          "class": "Person",
          "type": "Person",                        // Alias for web compatibility
          "confidence": 0.94,
          "score": 0.94,                           // Alias
          "bbox": [120, 80, 200, 350],            // [x, y, w, h] in absolute pixels
          "normalized_bbox": [0.12, 0.08, 0.32, 0.43],
          "color": "#FF0040"
        }
      ],
      "inference_ms": 32.1,
      "total_ms": 54.7
    }
    ```

---

### C. History & Database Storage Schemas

#### 1. Detections History List (`GET /api/detections`)
*   **Request Headers:** `Authorization: Bearer <token>`
*   **Response Body (`application/json` - HTTP 200):**
    ```json
    {
      "detections": [
        {
          "id": "60d0fe4f5311236168a109ca",
          "title": "Spatial Anomaly Detection",
          "summary": "Security perimeter breach detected in Zone 4. Identification of unauthorized signatures.",
          "time": "14:42 PM",
          "source": "Vision AI v4.2",
          "status": "Flagged",
          "trackedObjects": ["Person", "Backpack"]
        }
      ]
    }
    ```

#### 2. Create Detection Log (`POST /api/detections`)
*   **Request Headers:** `Authorization: Bearer <token>`
*   **Request Body (`application/json`):**
    ```json
    {
      "title": "Spatial Anomaly Detection",
      "summary": "Security perimeter breach detected in Zone 4. Identification of unauthorized signatures.",
      "time": "14:42 PM",
      "source": "Vision AI v4.2",
      "status": "Flagged",
      "trackedObjects": ["Person", "Backpack"]
    }
    ```
*   **Response Body (`application/json` - HTTP 201):**
    ```json
    {
      "detection": {
        "id": "60d0fe4f5311236168a109ca",
        "title": "Spatial Anomaly Detection",
        "summary": "Security perimeter breach detected in Zone 4. Identification of unauthorized signatures.",
        "time": "14:42 PM",
        "source": "Vision AI v4.2",
        "status": "Flagged",
        "trackedObjects": ["Person", "Backpack"]
      }
    }
    ```

#### 3. Analytics Dashboard Summary (`GET /api/analytics/summary`)
*   **Request Headers:** `Authorization: Bearer <token>`
*   **Response Body (`application/json` - HTTP 200):**
    ```json
    {
      "summary": {
        "totalDetections": 12,
        "flaggedCount": 2,
        "completedCount": 8,
        "totalQueries": 15,
        "activeNodes": 4,
        "avgLatencyMs": 14,
        "systemStatus": "ALERT"
      },
      "statusBreakdown": [
        { "status": "Flagged", "count": 2 },
        { "status": "Completed", "count": 8 },
        { "status": "Review", "count": 2 }
      ],
      "recentActivity": [
        {
          "id": "60d0fe4f5311236168a109ca",
          "title": "Spatial Anomaly Detection",
          "status": "Flagged",
          "time": "14:42 PM"
        }
      ]
    }
    ```
