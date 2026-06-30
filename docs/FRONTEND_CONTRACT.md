# InsightVision Frontend Backend Contract

## 1. Network Requests Overview

**CRITICAL FINDING:** 
Currently, the frontend makes **zero** actual network requests. There are no `fetch()`, `axios`, or any other HTTP client calls implemented. 

All interactions with the "backend" are fully mocked using `setTimeout` and hardcoded state objects. Because of this, the frontend does not send any HTTP methods, endpoints, `Content-Type` headers, FormData, or JSON bodies. 

The frontend behaves purely as a UI mockup, assuming data magically appears in the shape of its local states.

---

## 2. Expected Data Shapes (Based on Mock Data)

Even though no API calls are made, we can reverse-engineer the expected backend response shapes from the hardcoded mock objects in the frontend components.

### A. Object Tracking (`ObjectTracking.tsx`)

**How it expects tracking data:**
The frontend expects an array of objects representing tracked entities.

*   **Format:**
    ```json
    {
      "id": "P001",                 // String: Unique identifier for the tracked object across frames
      "type": "Person",             // String: Class/Label of the object (e.g., Person, Vehicle)
      "status": "Active",           // String: Tracking status (e.g., 'Active', 'Lost')
      "timeInFrame": "45s",         // String: How long the object has been tracked
      "path": [[100, 300], [150, 280]], // Array of [x, y]: Trajectory history in absolute pixel coordinates
      "color": "#FF0040",           // String (Hex): Color assigned to the bounding box/path
      "currentPos": [300, 220],     // Array [x, y]: Current center/position in absolute pixel coordinates
      "promptMatch": "person in red shirt" // String: If tracking via VLM prompt, the matching description
    }
    ```
*   **Drawing Overlays:** The frontend **draws the overlays itself**! It uses the absolute pixel coordinates `[x, y]` to dynamically position `<svg>` paths and `<div>` bounding boxes over the video feed. It expects pixel coordinates, not normalized 0-1 values.
*   **Bounding Boxes:** Interestingly, `ObjectTracking.tsx` currently only uses `currentPos` (center points `[x, y]`) and a fixed CSS dimension (`w-20 h-28`) for the bounding box. It doesn't use dynamic width/height for bounding boxes here, but rather just a center point.

### B. Vision-Language Queries (`VisionLanguage.tsx`)

**How it expects query results:**
When a user submits a natural language query, it fakes a 1.5s processing delay and returns a result object.

*   **Format:**
    ```json
    {
      "id": 1719163234512,          // Number/Timestamp: Unique ID for the query result
      "query": "How many people?",  // String: The original prompt sent
      "answer": "3 people detected",// String: The natural language summary/answer
      "timestamp": "Just now",      // String: Time indicator
      "objects": [                  // Array: Objects relevant to the answer
        { 
          "type": "Person",         // String: Object class
          "id": "P001",             // String: Object ID
          "bbox": [150, 120, 80, 200] // Array [x, y, w, h]: Bounding box in absolute pixel coordinates
        }
      ]
    }
    ```
*   **Bounding Boxes:** Here, it uses the `[x, y, w, h]` format (top-left X, top-left Y, width, height) in absolute pixels. 
*   **NL Summary:** Extracted directly as the `answer` string.
*   **Masks:** There is no implementation for masks (base64 PNG or RLE) in the mock data, even though the UI has a "segmented" View Mode dropdown.

### C. Live VLM Stream Logs (`VisionLanguage.tsx`)

**How it expects streaming text output:**
The frontend simulates a raw terminal feed with highlighted segments.

*   **Format:**
    ```json
    {
      "frame": "0312",              // String: Frame number
      "opacity": 0.78,              // Number: Fading effect for older logs
      "segments": [                 // Array: Rich text chunks
        { "text": "Detected " },
        { "text": "8 people", "color": "#FFFFFF" }
      ]
    }
    ```

---

## 3. Missing / Broken Features & Backend Assumptions

1.  **NO NETWORK LAYER:** The most critical missing piece is an actual API client (e.g., `axios` or native `fetch`). The frontend lacks API context providers, loading states connected to real HTTP requests, and error boundary handling.
2.  **IMAGE/FRAME TRANSMISSION MISSING:** There is absolutely no logic for capturing frames from a `<video>` or webcam and sending them to the backend. We will need to decide if the frontend sends Base64 images via WebSockets, JPEG Blobs via HTTP POST, or if the backend processes an RTSP stream directly.
3.  **COORDINATE SYSTEM MISMATCH:** `ObjectTracking.tsx` uses a fixed-size CSS box (`w-20 h-28`) positioned at `currentPos: [x, y]`. `VisionLanguage.tsx` correctly uses `bbox: [x, y, w, h]`. The backend will need to supply consistent `[x, y, w, h]` or `[x1, y1, x2, y2]`, and `ObjectTracking.tsx` will need to be refactored to use dynamic bounding box dimensions instead of CSS fixed sizes.
4.  **MASKS NOT IMPLEMENTED:** Despite having a "Segmented" view mode in the UI, there is no logic to render segmentation masks (e.g., Canvas rendering of Base64 mask overlays or polygon rendering).
5.  **PIXEL vs NORMALIZED COORDINATES:** The frontend assumes absolute pixel coordinates. If the video feed size changes responsively, these overlays will break. The backend should ideally send normalized coordinates (0.0 to 1.0), and the frontend should multiply them by the current video container dimensions.
