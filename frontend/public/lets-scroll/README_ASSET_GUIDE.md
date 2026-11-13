# 🎬 Payviro BD — lets-scroll AI Asset Generation Guide

This directory contains pre-configured prompts for each scenario of the **lets-scroll** feature on your Payviro landing page.

## Directory Contents:
1. `still_01_checkout.txt` / `still_01_checkout_mobile.txt` (Scene 1 Image Prompts)
2. `still_02_relay.txt` / `still_02_relay_mobile.txt` (Scene 2 Image Prompts)
3. `still_03_engine.txt` / `still_03_engine_mobile.txt` (Scene 3 Image Prompts)
4. `still_04_fulfilled.txt` / `still_04_fulfilled_mobile.txt` (Scene 4 Image Prompts)
5. `dive_01_checkout.txt` to `dive_04_fulfilled.txt` (Dive-In Camera Video Prompts)
6. `conn_01_to_02.txt` to `conn_03_to_04.txt` (Seamless Connector Video Prompts)
7. `manifest.json` (lets-scroll engine configuration)

---

## How to Generate and Use:

### Step 1: Generate Scene Stills
* Copy prompts starting from `still_01_checkout.txt` across all 4 files into **Midjourney (v6)**, **Flux.1 Schnell/Dev**, **Kling AI**, or **DALL-E 3**.
* Aspect Ratio:
  - Desktop: `--ar 3:2`
  - Mobile: `--ar 9:16`
* Generate the images and save them in this folder as:
  - `still_01.png` (or `.webp`)
  - `still_02.png`
  - `still_03.png`
  - `still_04.png`

### Step 2: Generate Dive-In Clips
* Use each generated still image as the First Frame (Start Image) in **Kling AI (1.5)**, **Luma Dream Machine**, **Runway Gen-3**, **Seedance 2.0**, or **Hailuo (Minimax)**.
* Prompt files: `dive_01_checkout.txt` through `dive_04_fulfilled.txt`.
* Save as:
  - `dive_01.mp4`
  - `dive_02.mp4`
  - `dive_03.mp4`
  - `dive_04.mp4`

### Step 3: Generate Seamless Connector Clips
* Create connector transitions using the last frame of one scene and the first frame of the next scene.
* Prompt files: `conn_01_to_02.txt`, `conn_02_to_03.txt`, `conn_03_to_04.txt`.
* Save as:
  - `conn_01_to_02.mp4`
  - `conn_02_to_03.mp4`
  - `conn_03_to_04.mp4`

👉 Once the MP4 video files are placed into this `frontend/public/lets-scroll/` directory, the website will automatically transform into an interactive video scrub experience!
