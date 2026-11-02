# 🎬 Payviro BD — lets-scroll AI Asset Generation Guide

এই ফোল্ডারে আপনার Payviro BD ল্যান্ডিং পেজের জন্য **lets-scroll**-এর প্রতিটি সিনারিওর প্রম্পট প্রস্তুত করা আছে।

## ফোল্ডারের ফাইল তালিকা:
1. `still_01_checkout.txt` / `still_01_checkout_mobile.txt` (Scene 1 Image Prompts)
2. `still_02_relay.txt` / `still_02_relay_mobile.txt` (Scene 2 Image Prompts)
3. `still_03_engine.txt` / `still_03_engine_mobile.txt` (Scene 3 Image Prompts)
4. `still_04_fulfilled.txt` / `still_04_fulfilled_mobile.txt` (Scene 4 Image Prompts)
5. `dive_01_checkout.txt` to `dive_04_fulfilled.txt` (Dive-In Camera Video Prompts)
6. `conn_01_to_02.txt` to `conn_03_to_04.txt` (Seamless Connector Video Prompts)
7. `manifest.json` (lets-scroll engine configuration)

---

## কিভাবে তৈরি করবেন ও ব্যবহার করবেন:

### ধাপ ১: স্টিল ইমেজ তৈরি (Scene Stills)
* `still_01_checkout.txt` থেকে শুরু করে ৪টি ফাইলের প্রম্পট কপি করে **Midjourney (v6)**, **Flux.1 Schnell/Dev**, **Kling AI**, বা **DALL-E 3**-তে দিন।
* রেশিও:
  - ডেস্কটপের জন্য: `--ar 3:2`
  - মোবাইলের জন্য: `--ar 9:16`
* ইমেজগুলো তৈরি করে এই ফোল্ডারে সেভ করুন:
  - `still_01.png` (বা `.webp`)
  - `still_02.png`
  - `still_03.png`
  - `still_04.png`

### ধাপ ২: ডাইভ-ইন ভিডিও তৈরি (Dive Clips)
* তৈরি করা প্রতিটি স্টিল ইমেজকে First Frame (Start Image) হিসেবে দিয়ে **Kling AI (1.5)**, **Luma Dream Machine**, **Runway Gen-3**, **Seedance 2.0**, বা **Hailuo (Minimax)**-তে দিন।
* প্রম্পট ফাইল: `dive_01_checkout.txt` থেকে `dive_04_fulfilled.txt`।
* সেভ করুন:
  - `dive_01.mp4`
  - `dive_02.mp4`
  - `dive_03.mp4`
  - `dive_04.mp4`

### ধাপ ৩: নিরবচ্ছিন্ন কানেক্টর ভিডিও তৈরি (Connectors)
* একটি দৃশ্যের শেষ ফ্রেম এবং পরবর্তী দৃশ্যের প্রথম ফ্রেম দিয়ে কানেক্টর ভিডিও তৈরি করুন।
* প্রম্পট ফাইল: `conn_01_to_02.txt`, `conn_02_to_03.txt`, `conn_03_to_04.txt`।
* সেভ করুন:
  - `conn_01_to_02.mp4`
  - `conn_02_to_03.mp4`
  - `conn_03_to_04.mp4`

👉 এমপি৪ ভিডিও ফাইলগুলো এই `frontend/public/lets-scroll/` ফোল্ডারে পেস্ট করা মাত্র পেভেরিফাই বিডি ওয়েবসাইট স্বয়ংক্রিয়ভাবে ভিডিও স্ক্রাব ইঞ্জিনে পরিণত হয়ে যাবে!
