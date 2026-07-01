# InsightVision Flutter Mobile Backend Contract

## 1. Network Requests Overview

**CRITICAL FINDING:**  
Fatima's Flutter mobile frontend uses the Dart **`http` package** to call authentication, history, and analytics database endpoints on the backend. However, for **actual visual inference (image/video uploading, object detection, and VLM querying)**, it makes **zero** network requests. These features are fully mocked locally in the screens using hardcoded state lists and static delays (`Future.delayed`).

There is no endpoint or network layer code implemented for sending media files or prompt strings to get real-time vision inferences.

---

## 2. Expected Data Shapes (Based on Mock Data and Database Models)

Even though no real-time inference API calls are made, the mobile app expects standard JSON schemas for fetching historical records and dashboard statistics.

### A. Detections History (`HistorySession`)

The application fetches the history list from `/api/detections` (in [data_service.dart](file:///home/burhan/projects/InsightVision-MVP/lib/core/services/data_service.dart)).

*   **Format:**
    ```json
    {
      "id": "60d0fe4f5311236168a109ca",     // String: Mongoose ObjectId
      "title": "Spatial Anomaly Detection",   // String: Event heading
      "summary": "Security breach detected",  // String: Description of event
      "time": "14:42 PM",                   // String: Time description
      "source": "Vision AI v4.2",            // String: Processing model/sensor identifier
      "status": "Flagged",                  // String: Current state ('Flagged', 'Completed', 'Review')
      "trackedObjects": ["Person", "Backpack"] // Array of Strings: Detected labels/objects
    }
    ```
*   **Drawing Overlays:** The application **does not draw any bounding box or path overlays** over the video or image feeds. It only renders the detected object labels in list views and textual status cards.

### B. Vision-Language Queries History (`VlmQueryRecord`)

The application fetches query history from `/api/queries` (in [data_service.dart](file:///home/burhan/projects/InsightVision-MVP/lib/core/services/data_service.dart)).

*   **Format:**
    ```json
    {
      "id": "60d0fe4f5311236168a109cb",     // String: Mongoose ObjectId
      "prompt": "How many people?",         // String: User's visual prompt
      "result": "3 people detected",         // String: AI's returned text response
      "time": "14:46 PM"                    // String: Timestamp string
    }
    ```

### C. Analytics Summary (`AnalyticsSummary`)

The application fetches dashboard stats from `/api/analytics/summary` (in [data_service.dart](file:///home/burhan/projects/InsightVision-MVP/lib/core/services/data_service.dart)).

*   **Format:**
    ```json
    {
      "summary": {
        "totalDetections": 12,              // Number: Total count
        "flaggedCount": 2,                  // Number: Flagged count
        "completedCount": 8,                // Number: Completed count
        "totalQueries": 15,                 // Number: Total VLM queries
        "systemStatus": "ALERT",            // String: Status indicator ('ALERT' or 'STABLE')
        "avgLatencyMs": 14                  // Number: System processing latency metric
      }
    }
    ```

---

## 3. Missing / Broken Features & Backend Assumptions

1.  **NO INFERENCE NETWORK LAYER:** The mobile app lacks any networking implementation for sending image/video media files or prompts to an ML inference pipeline.
2.  **NO OVERLAY ENGINE IMPLEMENTED:** Unlike the original web frontend (`FRONTEND_CONTRACT.md`), which attempted to render SVG/HTML dynamic bounding box overlays based on coordinates, the Flutter app has absolutely **no coordinate drawing logic**. It does not expect bounding box rectangles `[x, y, w, h]` or segmentation masks, and it does not draw them.
3.  **STATIC HUD DECORATION:** The vision viewport is decorated with custom canvas painters (`_HudCornersPainter`, `_HudScanlinePainter`, and `_GridPainter` in [vision_screen.dart](file:///home/burhan/projects/InsightVision-MVP/lib/screens/vision_screen.dart)), but these are entirely static HUD graphics.
4.  **SEPARATE DATA AND INFERENCE RESPONSIBILITIES:** The app is successfully connected to the auth and database CRUD API of Fatima's Express backend. The database seed data matches what the Flutter screens expect to see for logs, analytics, and history, but the system is purely a database CRUD container.
