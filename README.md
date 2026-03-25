# 🛡️ InsightVision: Vision-Language Empowered Object Tracking & Detection

[](https://www.google.com/search?q=https://github.com/syed-burhan/InsightVision)
[](https://www.google.com/search?q=)
[](https://www.google.com/search?q=)

**InsightVision** is an advanced AI platform that bridges the gap between high-speed object detection (**YOLOv11**) and deep semantic understanding (**Vision-Language Models**). Designed as a "Talk-to-Camera" system, it allows users to track, detect, and query visual data using natural language.

-----

## 🚀 Key Features

  * **Hybrid Detection Engine:** Toggle between **YOLOv11** for real-time speed and **VLMs (Florence-2, Grounding DINO)** for semantic precision.
  * **"Talk-to-Camera" Queries:** Ask complex questions like *"Is the worker wearing a safety vest?"* or *"Track the blue backpack"* using natural language.
  * **Multi-Object Tracking (MOT):** Persistent ID tracking with trajectory visualization using **ByteTrack** and **DeepSORT**.
  * **Few-Shot / One-Shot Learning:** Adapt the system to recognize new, custom objects with as few as 1–5 sample images.
  * **Performance Benchmarking:** Real-time monitoring of **FPS, VRAM usage (TensorRT optimized), and Inference Latency**.

-----

## 🛠️ Tech Stack

| Category | Technologies |
| :--- | :--- |
| **AI & Vision** | YOLOv11, Florence-2, YOLO-World, Grounding DINO, Qwen2.5-VL |
| **Tracking** | ByteTrack, DeepSORT, OpenCV |
| **Backend** | Python, FastAPI, PyTorch 2.5.0, CUDA 12.1 |
| **Frontend** | React, Antigravity UI Components, Tailwind CSS |
| **Optimization** | TensorRT 8.6.1, FP16 Quantization |

-----

## 📂 Project Structure

```text
InsightVision/
├── frontend/           # React App (Vite)
│   ├── src/            # Components, Hooks, Context
│   └── public/         # Static Assets
├── backend/            # FastAPI Microservice
│   ├── api/            # Route Handlers
│   ├── models/         # VLM & YOLO Weights (GIT IGNORED)
│   ├── core/           # Tracking & Inference Logic
│   └── main.py         # Entry Point
├── data/               # Local Storage for Session History
└── .gitignore          # Crucial: Excludes heavy .pt and node_modules
```

-----

## 📊 Research Goals (FYP Objectives)

1.  **Comparative Analysis:** Evaluate the trade-offs between classical CV (YOLO) and modern VLMs in terms of accuracy vs. resource utilization.
2.  **Natural Language Interface:** Develop an intuitive query system for non-technical users to interact with live surveillance feeds.
3.  **Real-world Utility:** Demonstrate few-shot adaptability for industrial safety and retail analytics.

-----

## 👥 Project Team

  * **Syed Burhan Ahmed Hassan Shah** – *Lead AI Engineer*
  * **Waleed Ahmed** – *AI/ML Engineer*
  * **Fatima Surraya Islam** – *Computer Vision Specialist*

**Supervisor:** Dr. Muhammad Azeem Javed  
**Institution:** University of Management and Technology (UMT), Lahore.

-----

## ⚙️ Installation (For Group Members)

1.  **Clone the Repo:**
    ```bash
    git clone https://github.com/SyedBurhanAhmed/InsightVision-MVP.git
    ```
2.  **Backend Setup:**
    ```bash
    cd backend
    pip install -r requirements.txt
    python main.py
    ```
3.  **Frontend Setup:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

-----

## 🔐 Privacy & Ethics

*InsightVision processes all data locally. No personal or sensitive data is collected or sent to external servers. This project is developed strictly for academic and research purposes.*

