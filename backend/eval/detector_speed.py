import os
import sys
import time
import json
import torch
import gc
import numpy as np
from PIL import Image
import cv2
import httpx

# Add GroundingDINO and backend source to path
_DINO_ROOT = os.path.expanduser("~/insightvision_benchmarks/GroundingDINO")
if _DINO_ROOT not in sys.path:
    sys.path.insert(0, _DINO_ROOT)

_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from app.core.config import settings
from app.core.state import ml_models
from app.services.detector import GroundingDINODetector

# Image configuration
IMAGE_PATH = "images/frame_24.jpg"
DUMMY_PROMPT = "person"
OCR_PROMPT = "Read the text in the image"

def print_table(title, headers, rows):
    print(f"\n=== {title} ===")
    col_widths = [max(len(str(x)) for x in col) for col in zip(headers, *rows)]
    row_format = " | ".join([f"{{:<{w}}}" for w in col_widths])
    print(row_format.format(*headers))
    print("-+-".join(["-" * w for w in col_widths]))
    for row in rows:
        print(row_format.format(*[str(x) for x in row]))
    print()

def get_vram_usage():
    if torch.cuda.is_available():
        # Get allocated and reserved VRAM in MB
        allocated = torch.cuda.memory_allocated() / (1024 ** 2)
        reserved = torch.cuda.memory_reserved() / (1024 ** 2)
        # Query total system VRAM usage via nvidia-smi
        try:
            import subprocess
            res = subprocess.check_output(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,nounits,noheader"])
            system_used = int(res.decode().strip())
        except Exception:
            system_used = reserved
        return allocated, reserved, system_used
    return 0, 0, 0

def benchmark_grounding_dino():
    print("Loading GroundingDINO...")
    t0 = time.time()
    from groundingdino.util.inference import load_model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Load model
    model = load_model(
        settings.GROUNDING_DINO_CONFIG_PATH,
        settings.GROUNDING_DINO_WEIGHTS_PATH,
        device=device,
    )
    load_time = (time.time() - t0) * 1000
    print(f"GroundingDINO loaded in {load_time:.1f}ms")
    
    detector = GroundingDINODetector(model)
    
    # Prepare image
    if os.path.exists(IMAGE_PATH):
        img = cv2.imread(IMAGE_PATH)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    else:
        img = np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
        
    # Warmup
    print("Warming up GroundingDINO...")
    detector.detect(img, DUMMY_PROMPT, conf_threshold=0.35)
    
    # Benchmark
    print("Benchmarking GroundingDINO (20 runs)...")
    latencies = []
    for i in range(20):
        t_start = time.time()
        res = detector.detect(img, DUMMY_PROMPT, conf_threshold=0.35)
        latencies.append((time.time() - t_start) * 1000)
        
    avg_lat = np.mean(latencies)
    min_lat = np.min(latencies)
    max_lat = np.max(latencies)
    
    alloc, res_mem, sys_mem = get_vram_usage()
    
    return {
        "load_time_ms": load_time,
        "avg_ms": avg_lat,
        "min_ms": min_lat,
        "max_ms": max_lat,
        "vram_allocated_mb": alloc,
        "vram_system_mb": sys_mem
    }

def benchmark_florence2_ocr():
    print("Loading Florence-2...")
    t0 = time.time()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    from transformers import AutoProcessor, AutoModelForCausalLM
    processor = AutoProcessor.from_pretrained("microsoft/Florence-2-base", trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        "microsoft/Florence-2-base", 
        trust_remote_code=True,
        attn_implementation="eager"
    ).to(device)
    load_time = (time.time() - t0) * 1000
    print(f"Florence-2 loaded in {load_time:.1f}ms")
    
    # Prepare image
    if os.path.exists(IMAGE_PATH):
        image_pil = Image.open(IMAGE_PATH).convert("RGB")
    else:
        image_pil = Image.fromarray(np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8))
        
    task_prompt = "<OCR>"
    inputs = processor(text=task_prompt, images=image_pil, return_tensors="pt").to(device)
    
    # Warmup
    print("Warming up Florence-2 OCR...")
    with torch.no_grad():
        _ = model.generate(
            input_ids=inputs["input_ids"],
            pixel_values=inputs["pixel_values"],
            max_new_tokens=100,
            do_sample=False
        )
        
    # Benchmark
    print("Benchmarking Florence-2 OCR (20 runs)...")
    latencies = []
    for i in range(20):
        t_start = time.time()
        with torch.no_grad():
            generated_ids = model.generate(
                input_ids=inputs["input_ids"],
                pixel_values=inputs["pixel_values"],
                max_new_tokens=100,
                early_stopping=False,
                do_sample=False,
                num_beams=3,
            )
        generated_text = processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
        _ = processor.post_process_generation(generated_text, task=task_prompt, image_size=image_pil.size)
        latencies.append((time.time() - t_start) * 1000)
        
    avg_lat = np.mean(latencies)
    min_lat = np.min(latencies)
    max_lat = np.max(latencies)
    
    alloc, res_mem, sys_mem = get_vram_usage()
    
    return {
        "load_time_ms": load_time,
        "avg_ms": avg_lat,
        "min_ms": min_lat,
        "max_ms": max_lat,
        "vram_allocated_mb": alloc,
        "vram_system_mb": sys_mem
    }

def benchmark_ollama_llm(model_name="qwen2.5:7b", use_gpu=True):
    print(f"Benchmarking Ollama Model: {model_name} (GPU={use_gpu}) (10 runs)...")
    
    client = httpx.Client(timeout=30.0)
    url = "http://localhost:11434/api/generate"
    
    prompt = "Classify this command: 'track the person in white on a bike'. Return JSON format with fields: task, target, threshold."
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.0,
            "num_gpu": 1 if use_gpu else 0
        }
    }
    
    # Warmup
    try:
        client.post(url, json=payload)
    except Exception as e:
        print(f"Ollama connection error: {e}. Make sure Ollama daemon is running.")
        return None
        
    latencies = []
    for i in range(10):
        t_start = time.time()
        res = client.post(url, json=payload)
        latencies.append((time.time() - t_start) * 1000)
        
    avg_lat = np.mean(latencies)
    min_lat = np.min(latencies)
    max_lat = np.max(latencies)
    
    return {
        "avg_ms": avg_lat,
        "min_ms": min_lat,
        "max_ms": max_lat
    }

def main():
    print("=== InsightVision Speed Benchmarking Suite ===")
    
    # Check GPU availability
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"Device Name: {torch.cuda.get_device_name(0)}")
        
    # Initial VRAM
    _, _, init_vram = get_vram_usage()
    print(f"Initial System VRAM Usage: {init_vram} MB")
    
    # 1. Benchmark GroundingDINO
    gd_res = benchmark_grounding_dino()
    
    # Clear CUDA Cache
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        
    # 2. Benchmark Florence-2 OCR
    fl_res = benchmark_florence2_ocr()
    
    # 3. Benchmark Ollama LLM
    # We test Qwen2.5:7b as Qwen3:7b was not found in the registry.
    llm_gpu = benchmark_ollama_llm("qwen2.5:7b", use_gpu=True)
    llm_cpu = benchmark_ollama_llm("qwen2.5:7b", use_gpu=False)
    
    # Print results
    headers = ["Model/Component", "Load Time (ms)", "Avg Inference (ms)", "Min (ms)", "Max (ms)", "VRAM Allocated (MB)", "Sys VRAM (MB)"]
    rows = [
        ["GroundingDINO (Swin-T)", f"{gd_res['load_time_ms']:.1f}", f"{gd_res['avg_ms']:.1f}", f"{gd_res['min_ms']:.1f}", f"{gd_res['max_ms']:.1f}", f"{gd_res['vram_allocated_mb']:.1f}", f"{gd_res['vram_system_mb']}"],
        ["Florence-2 (Base)", f"{fl_res['load_time_ms']:.1f}", f"{fl_res['avg_ms']:.1f}", f"{fl_res['min_ms']:.1f}", f"{fl_res['max_ms']:.1f}", f"{fl_res['vram_allocated_mb']:.1f}", f"{fl_res['vram_system_mb']}"],
    ]
    if llm_gpu:
        rows.append(["Qwen2.5:7b (Ollama-GPU)", "N/A", f"{llm_gpu['avg_ms']:.1f}", f"{llm_gpu['min_ms']:.1f}", f"{llm_gpu['max_ms']:.1f}", "N/A", "N/A"])
    if llm_cpu:
        rows.append(["Qwen2.5:7b (Ollama-CPU)", "N/A", f"{llm_cpu['avg_ms']:.1f}", f"{llm_cpu['min_ms']:.1f}", f"{llm_cpu['max_ms']:.1f}", "N/A", "N/A"])
        
    print_table("Vision Language & Local LLM Latency", headers, rows)
    
    # 4. PART A & B & C: Placeholder warnings / checks for SAM 3.1 & Gemma 4
    # Since SAM3.1 and Gemma 4 weights access / local installations are gated,
    # we print placeholders so the script completes cleanly.
    print("=== SAM 3.1 & Gemma 4 E4B Benchmarking Status ===")
    print("Note: SAM 3.1 weights and Gemma 4 E4B are gated and require manual verification on Hugging Face.")
    print("Run `huggingface-cli login` and request access to Meta SAM 3.1 checkpoints.")

if __name__ == "__main__":
    main()
