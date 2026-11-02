import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Volume2, VolumeX, ArrowRight, ShieldCheck, Zap, Sliders,
  Cpu, BatteryCharging, Bluetooth, Radio, Sparkles, Check, ChevronDown,
  Layers, Headphones, Disc, Play, Pause, RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';

const TOTAL_FRAMES = 120;
const BG_COLOR = '#050505';

export const SonyXM6Page: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isNavScrolled, setIsNavScrolled] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<'matte-black' | 'silver' | 'midnight-blue'>('matte-black');

  // Preload all 120 frames
  useEffect(() => {
    let count = 0;
    const images: HTMLImageElement[] = [];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = String(i).padStart(3, '0');
      img.src = `/sony-xm6/sequence/frame_${frameNum}.jpg`;

      img.onload = () => {
        count++;
        setLoadedCount(count);
        if (count >= TOTAL_FRAMES) {
          setIsLoaded(true);
        }
      };

      img.onerror = () => {
        count++;
        setLoadedCount(count);
        if (count >= TOTAL_FRAMES) {
          setIsLoaded(true);
        }
      };

      images.push(img);
    }

    imagesRef.current = images;
  }, []);

  // Draw frame to canvas
  const drawFrame = useCallback((frameIdx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[frameIdx];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;

    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Deep void background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, cw, ch);

    // Subtle radial glow behind product
    const radial = ctx.createRadialGradient(
      cw / 2, ch / 2, 50,
      cw / 2, ch / 2, Math.max(cw, ch) * 0.6
    );
    radial.addColorStop(0, 'rgba(0, 80, 255, 0.08)');
    radial.addColorStop(0.5, 'rgba(0, 214, 255, 0.02)');
    radial.addColorStop(1, 'rgba(5, 5, 5, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, cw, ch);

    // Calculate aspect ratio containment
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = cw / ch;

    let drawW: number;
    let drawH: number;

    if (canvasRatio > imgRatio) {
      drawH = ch * 0.88;
      drawW = drawH * imgRatio;
    } else {
      drawW = cw * 0.92;
      drawH = drawW / imgRatio;
    }

    const drawX = (cw - drawW) / 2;
    const drawY = (ch - drawH) / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }, []);

  // Scroll tracking and smooth frame mapping
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const currentY = -rect.top;
      const progress = Math.max(0, Math.min(1, currentY / totalScrollable));
      setScrollProgress(progress);

      setIsNavScrolled(window.scrollY > 60);

      const targetFrame = Math.min(
        TOTAL_FRAMES - 1,
        Math.floor(progress * (TOTAL_FRAMES - 1))
      );
      setCurrentFrameIndex(targetFrame);
      drawFrame(targetFrame);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', () => drawFrame(currentFrameIndex));
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', () => drawFrame(currentFrameIndex));
    };
  }, [drawFrame, currentFrameIndex]);

  // Initial draw once loaded
  useEffect(() => {
    if (isLoaded) {
      drawFrame(currentFrameIndex);
    }
  }, [isLoaded, drawFrame, currentFrameIndex]);

  // Auto-play loop
  useEffect(() => {
    let animId: number;
    if (isAutoPlaying && containerRef.current) {
      const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
      const startTop = containerRef.current.offsetTop;
      let startTime: number | null = null;
      const duration = 14000; // 14 seconds full tour

      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const p = (elapsed % duration) / duration;
        window.scrollTo({ top: startTop + p * totalScrollable, behavior: 'auto' });
        animId = requestAnimationFrame(step);
      };

      animId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animId);
  }, [isAutoPlaying]);

  const scrollToPhase = (targetProgress: number) => {
    if (!containerRef.current) return;
    const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
    const targetY = containerRef.current.offsetTop + targetProgress * totalScrollable;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  return (
    <div className="bg-[#050505] text-white selection:bg-[#0050FF] selection:text-white font-sans antialiased min-h-screen">
      {/* 
        ========================================================================
        APPLE-INSPIRED MINIMAL GLASS NAVIGATION BAR
        ========================================================================
      */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          isNavScrolled
            ? 'bg-[#050505]/75 backdrop-blur-xl border-b border-white/5 py-3 shadow-2xl'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Left: Brand / Model Logo */}
          <div className="flex items-center space-x-3">
            <Link to="/sony-xm6" className="flex items-center space-x-2 group">
              <span className="text-xl font-bold tracking-tighter text-white/90 group-hover:text-white transition-colors">
                SONY
              </span>
              <span className="text-xs font-mono font-medium tracking-widest text-[#00D6FF] uppercase px-2 py-0.5 rounded-full bg-[#00D6FF]/10 border border-[#00D6FF]/20">
                WH-1000XM6
              </span>
            </Link>
          </div>

          {/* Center: Minimalist Links */}
          <div className="hidden md:flex items-center space-x-8 text-xs tracking-wider uppercase font-medium text-white/60">
            <button
              onClick={() => scrollToPhase(0.0)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Overview
            </button>
            <button
              onClick={() => scrollToPhase(0.28)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Engineering
            </button>
            <button
              onClick={() => scrollToPhase(0.52)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Noise Cancelling
            </button>
            <button
              onClick={() => scrollToPhase(0.74)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Acoustics
            </button>
            <a href="#specs" className="hover:text-white transition-colors">
              Specs
            </a>
          </div>

          {/* Right: Pre-order CTA & Switcher */}
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="hidden sm:inline-flex text-xs text-white/40 hover:text-white/80 transition-colors pr-2"
            >
              Payviro
            </Link>

            <a
              href="#preorder"
              className="relative group px-5 py-2 rounded-full text-xs font-semibold tracking-wide uppercase overflow-hidden transition-all duration-300 shadow-lg shadow-[#0050FF]/20"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#0050FF] to-[#00D6FF] transition-transform duration-300 group-hover:scale-105" />
              <span className="relative text-white drop-shadow">
                Pre-order $449
              </span>
            </a>
          </div>
        </div>
      </nav>

      {/* 
        ========================================================================
        CORE SCROLLYTELLING STAGE (~480vh Scroll Canvas Track)
        ========================================================================
      */}
      <div
        ref={containerRef}
        className="relative w-full h-[480vh] bg-[#050505]"
      >
        {/* Sticky Pinned Canvas Viewport */}
        <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center pointer-events-none">
          {/* HTML5 Canvas Rendering 120-frame image sequence */}
          <canvas
            ref={canvasRef}
            className="w-full h-full block object-contain"
          />

          {/* Loading Overlay */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center space-y-4 z-40 pointer-events-auto">
              <div className="w-16 h-16 rounded-full border-2 border-white/10 border-t-[#00D6FF] animate-spin" />
              <div className="text-xs font-mono text-white/60 tracking-widest uppercase">
                Buffering Photorealistic 8K Sequence ({loadedCount} / {TOTAL_FRAMES})
              </div>
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0050FF] to-[#00D6FF] transition-all duration-150"
                  style={{ width: `${(loadedCount / TOTAL_FRAMES) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Top & Bottom Subtle Radial Atmosphere */}
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#050505] via-[#050505]/60 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent pointer-events-none" />
        </div>

        {/* 
          ======================================================================
          STORYTELLING BEATS OVERLAYS (SYNCHRONIZED WITH IMAGE SEQUENCE)
          ======================================================================
        */}
        <div className="sticky top-0 w-full h-screen -mt-[100vh] pointer-events-none z-10 flex flex-col justify-between p-6 sm:p-12">
          {/* Top HUD Telemetry */}
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
            <div className="inline-flex items-center space-x-2 text-[11px] font-mono uppercase tracking-widest text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#00D6FF] animate-pulse" />
              <span>Frame {String(currentFrameIndex).padStart(3, '0')} / 119</span>
              <span className="text-white/20">|</span>
              <span className="text-white/80">3D Disassembly Engine</span>
            </div>

            {/* Quick Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`p-2 rounded-full border transition-all text-xs flex items-center space-x-1.5 backdrop-blur-md ${
                  isAutoPlaying
                    ? 'bg-[#00D6FF] text-black border-[#00D6FF] font-bold shadow-lg shadow-[#00D6FF]/40'
                    : 'bg-white/5 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Auto Flight"
              >
                {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="text-[11px] font-mono hidden sm:inline">
                  {isAutoPlaying ? 'PAUSE' : 'AUTO-TOUR'}
                </span>
              </button>
            </div>
          </div>

          {/* 
            DYNAMIC STORY CONTENT PANELS:
            1. HERO / INTRO (0 - 18% scroll)
            2. ENGINEERING REVEAL (18 - 42% scroll)
            3. NOISE CANCELLING & MICS (42 - 68% scroll)
            4. SOUND & UPSCALING (68 - 86% scroll)
            5. REASSEMBLY & FINAL HERO (86 - 100% scroll)
          */}
          <div className="w-full max-w-7xl mx-auto relative flex-1 flex items-center">
            {/* BEAT 1: HERO (0 - 18%) */}
            <div
              className={`absolute inset-x-0 mx-auto text-center max-w-3xl pointer-events-auto transition-all duration-700 ${
                scrollProgress <= 0.18
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 -translate-y-8 pointer-events-none'
              }`}
            >
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#00D6FF] mb-4 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-[#00D6FF]" />
                <span>Next-Generation Flagship Architecture</span>
              </div>

              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white/95 leading-none mb-4 drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                Sony WH-1000XM6
              </h1>

              <p className="text-xl sm:text-2xl font-light text-white/80 tracking-wide mb-3">
                Silence, perfected.
              </p>

              <p className="text-sm sm:text-base text-white/50 max-w-xl mx-auto font-normal leading-relaxed">
                Flagship wireless noise cancelling, re-engineered for a world that never stops.
              </p>

              <div className="mt-8 flex items-center justify-center space-x-4">
                <button
                  onClick={() => scrollToPhase(0.25)}
                  className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold uppercase tracking-wider backdrop-blur-md transition-all flex items-center space-x-2 group cursor-pointer"
                >
                  <span>Explore Engineering</span>
                  <ChevronDown className="w-4 h-4 text-[#00D6FF] group-hover:translate-y-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* BEAT 2: ENGINEERING REVEAL (18 - 42%) */}
            <div
              className={`absolute left-0 max-w-lg pointer-events-auto transition-all duration-700 text-left ${
                scrollProgress > 0.18 && scrollProgress <= 0.42
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-12 pointer-events-none'
              }`}
            >
              <span className="text-xs font-mono font-bold tracking-widest text-[#00D6FF] uppercase block mb-2">
                01 // Internal Architecture
              </span>

              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white/90 leading-[1.08] mb-4 drop-shadow-lg">
                Precision-engineered for silence.
              </h2>

              <p className="text-base text-white/60 leading-relaxed mb-4">
                Custom drivers, sealed acoustic chambers, and optimized airflow deliver studio-grade clarity.
              </p>

              <p className="text-sm text-white/40 leading-relaxed border-l-2 border-[#0050FF] pl-4 mb-6">
                Every component is tuned for balance, power, and comfort—hour after hour.
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                  Airflow Porting
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                  Floating Driver Cage
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                  Damped Chambers
                </span>
              </div>
            </div>

            {/* BEAT 3: NOISE CANCELLING & MICS (42 - 68%) */}
            <div
              className={`absolute right-0 max-w-lg pointer-events-auto transition-all duration-700 text-right ${
                scrollProgress > 0.42 && scrollProgress <= 0.68
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-12 pointer-events-none'
              }`}
            >
              <span className="text-xs font-mono font-bold tracking-widest text-[#00D6FF] uppercase block mb-2">
                02 // Intelligent ANC
              </span>

              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white/90 leading-[1.08] mb-4 drop-shadow-lg">
                Adaptive noise cancelling, redefined.
              </h2>

              <ul className="space-y-3 text-sm text-white/60 text-right inline-block max-w-md">
                <li className="flex items-center justify-end space-x-2">
                  <span>Multi-microphone array listens in every direction.</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D6FF]" />
                </li>
                <li className="flex items-center justify-end space-x-2">
                  <span>Real-time noise analysis adjusts to your environment.</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D6FF]" />
                </li>
                <li className="flex items-center justify-end space-x-2">
                  <span>Your music stays pure—planes, trains, and crowds fade away.</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D6FF]" />
                </li>
              </ul>

              <div className="mt-6 flex justify-end gap-2">
                <span className="px-3 py-1 rounded-full bg-[#0050FF]/15 border border-[#0050FF]/30 text-xs text-[#00D6FF]">
                  HD Processor QN3
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                  8 Beamforming Mics
                </span>
              </div>
            </div>

            {/* BEAT 4: SOUND & UPSCALING (68 - 86%) */}
            <div
              className={`absolute left-0 max-w-lg pointer-events-auto transition-all duration-700 text-left ${
                scrollProgress > 0.68 && scrollProgress <= 0.86
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-12 pointer-events-none'
              }`}
            >
              <span className="text-xs font-mono font-bold tracking-widest text-[#00D6FF] uppercase block mb-2">
                03 // Acoustic Core
              </span>

              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white/90 leading-[1.08] mb-4 drop-shadow-lg">
                Immersive, lifelike sound.
              </h2>

              <p className="text-base text-white/60 leading-relaxed mb-4">
                High-performance 40mm carbon-composite drivers unlock detail, depth, and texture in every track.
              </p>

              <p className="text-sm text-white/40 leading-relaxed border-l-2 border-[#00D6FF] pl-4 mb-6">
                AI-enhanced DSEE Ultimate upscaling restores clarity to compressed audio, so every note feels alive.
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                  Hi-Res Audio Wireless
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                  LDAC 990kbps
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                  360 Reality Audio
                </span>
              </div>
            </div>

            {/* BEAT 5: REASSEMBLY & CLIMAX CTA (86 - 100%) */}
            <div
              className={`absolute inset-x-0 mx-auto text-center max-w-2xl pointer-events-auto transition-all duration-700 ${
                scrollProgress > 0.86
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-8 pointer-events-none'
              }`}
            >
              <span className="text-xs font-mono font-bold tracking-widest text-[#00D6FF] uppercase block mb-3">
                04 // Ready for the World
              </span>

              <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4 drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                Hear everything. Feel nothing else.
              </h2>

              <p className="text-lg text-white/70 font-light mb-2">
                WH-1000XM6. Designed for focus, crafted for comfort.
              </p>

              <p className="text-xs text-white/40 mb-8">
                Engineered for airports, offices, and everything in between.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="#preorder"
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-[#0050FF] to-[#00D6FF] hover:opacity-90 text-white font-bold text-sm tracking-wide shadow-xl shadow-[#0050FF]/30 transition-all hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <span>Experience WH-1000XM6</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href="#specs"
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-semibold text-sm transition-all"
                >
                  <span>See full specs</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Scrubber Indicator Line */}
          <div className="w-full max-w-7xl mx-auto pointer-events-auto space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-white/40">
              <span className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D6FF]" />
                <span className="hidden sm:inline">Interactive Scroll Sequence</span>
              </span>
              <span>{Math.round(scrollProgress * 100)}% Complete</span>
            </div>

            {/* Apple-style Progress Rail */}
            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-[#0050FF] via-[#00D6FF] to-white rounded-full transition-all duration-75"
                style={{ width: `${scrollProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        EDITORIAL TECHNOLOGY SHOWCASE & DEEP-DIVE
        ========================================================================
      */}
      <section id="technology" className="py-32 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-xs font-mono text-[#00D6FF] tracking-widest uppercase block mb-3">
            Audiophile Innovation
          </span>
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-white/95 mb-6">
            The science of absolute quiet.
          </h2>
          <p className="text-base sm:text-lg text-white/60 leading-relaxed">
            By analyzing external noise at over 70,000 times per second, the newly developed HD Noise Cancelling Processor QN3 creates an acoustic inverted soundwave with imperceptible delay.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-[#0A0A0C] border border-white/5 relative overflow-hidden group hover:border-[#0050FF]/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-[#0050FF]/15 border border-[#0050FF]/30 flex items-center justify-center mb-6 text-[#00D6FF]">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Dual HD QN3 Processors
            </h3>
            <p className="text-sm text-white/60 leading-relaxed mb-6">
              Twin dedicated chipsets process high and low frequency bands independently, eliminating cabin hum and human conversation equally.
            </p>
            <div className="text-xs font-mono text-[#00D6FF]">
              +45% Processing Throughput
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-[#0A0A0C] border border-white/5 relative overflow-hidden group hover:border-[#00D6FF]/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-[#00D6FF]/15 border border-[#00D6FF]/30 flex items-center justify-center mb-6 text-[#00D6FF]">
              <Disc className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Carbon Fiber 40mm Driver
            </h3>
            <p className="text-sm text-white/60 leading-relaxed mb-6">
              Ultra-lightweight dome with high-compliance edge reproduces frequencies up to 40kHz with zero cone distortion at peak volumes.
            </p>
            <div className="text-xs font-mono text-[#00D6FF]">
              4Hz – 40,000Hz Hi-Res Certified
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-[#0A0A0C] border border-white/5 relative overflow-hidden group hover:border-[#0050FF]/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-[#0050FF]/15 border border-[#0050FF]/30 flex items-center justify-center mb-6 text-[#00D6FF]">
              <BatteryCharging className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              42-Hour Ultra Endurance
            </h3>
            <p className="text-sm text-white/60 leading-relaxed mb-6">
              Redesigned high-density battery cell with USB-C PD quick charging gives you 5 hours of playback from a mere 3-minute charge.
            </p>
            <div className="text-xs font-mono text-[#00D6FF]">
              3 min charge = 5 hr play
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        TECHNICAL SPECIFICATIONS TABLE
        ========================================================================
      */}
      <section id="specs" className="py-24 px-6 max-w-5xl mx-auto border-t border-white/5">
        <div className="mb-12">
          <span className="text-xs font-mono text-[#00D6FF] tracking-widest uppercase block mb-2">
            Detailed Data
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Technical Specifications
          </h2>
        </div>

        <div className="divide-y divide-white/5 text-sm">
          <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-white/40 font-mono">Driver Unit</span>
            <span className="sm:col-span-2 text-white/90 font-medium">40mm, dome type (CCAW Voice Coil, Carbon Composite Diaphragm)</span>
          </div>

          <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-white/40 font-mono">Frequency Response</span>
            <span className="sm:col-span-2 text-white/90 font-medium">4 Hz – 40,000 Hz (JEITA Standard / Hi-Res Audio)</span>
          </div>

          <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-white/40 font-mono">Bluetooth Version</span>
            <span className="sm:col-span-2 text-white/90 font-medium">Version 5.4 (LE Audio, LC3, LDAC, AAC, SBC)</span>
          </div>

          <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-white/40 font-mono">Battery Life</span>
            <span className="sm:col-span-2 text-white/90 font-medium">Max. 42 hrs (NC ON), Max. 55 hrs (NC OFF)</span>
          </div>

          <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-white/40 font-mono">Weight</span>
            <span className="sm:col-span-2 text-white/90 font-medium">Approx. 242 g (Synthetic Soft-Fit Protein Leather)</span>
          </div>

          <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-white/40 font-mono">Sensors</span>
            <span className="sm:col-span-2 text-white/90 font-medium">Capacitive Wearing Sensor, Atmospheric Pressure Optimizing Sensor</span>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        PRE-ORDER & FINISH PICKER SECTION
        ========================================================================
      */}
      <section id="preorder" className="py-32 px-6 max-w-4xl mx-auto text-center border-t border-white/5">
        <span className="text-xs font-mono text-[#00D6FF] tracking-widest uppercase block mb-3">
          Reserve Yours Today
        </span>
        <h2 className="text-4xl sm:text-6xl font-extrabold text-white mb-4">
          Experience WH-1000XM6
        </h2>
        <p className="text-base text-white/60 mb-10 max-w-lg mx-auto">
          Complimentary priority express shipping, 2-year Sony Elite warranty, and 30-day risk-free listening trial.
        </p>

        {/* Colorway Pill Selector */}
        <div className="flex items-center justify-center space-x-3 mb-10">
          <button
            onClick={() => setSelectedColor('matte-black')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-2 border transition-all ${
              selectedColor === 'matte-black'
                ? 'bg-white/15 text-white border-[#00D6FF]'
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-[#111] border border-white/20" />
            <span>Matte Black</span>
          </button>

          <button
            onClick={() => setSelectedColor('silver')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-2 border transition-all ${
              selectedColor === 'silver'
                ? 'bg-white/15 text-white border-[#00D6FF]'
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-[#E5E5E5] border border-white/20" />
            <span>Platinum Silver</span>
          </button>

          <button
            onClick={() => setSelectedColor('midnight-blue')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-2 border transition-all ${
              selectedColor === 'midnight-blue'
                ? 'bg-white/15 text-white border-[#00D6FF]'
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-[#0A1931] border border-white/20" />
            <span>Midnight Blue</span>
          </button>
        </div>

        {/* Final CTA Box */}
        <div className="p-10 rounded-3xl bg-[#0A0A0C] border border-white/10 max-w-md mx-auto shadow-2xl">
          <div className="text-3xl font-extrabold text-white mb-2">
            $449.99
          </div>
          <div className="text-xs text-emerald-400 font-mono mb-6">
            In Stock • Ships within 24 hours
          </div>

          <button
            onClick={() => alert('Sony WH-1000XM6 added to bag! Experience the world of silence.')}
            className="w-full py-4 rounded-full bg-gradient-to-r from-[#0050FF] to-[#00D6FF] hover:opacity-90 text-white font-bold text-sm tracking-wide shadow-xl shadow-[#0050FF]/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Pre-order Now
          </button>

          <p className="text-[11px] text-white/40 mt-4">
            Free shipping & returns within 30 days. Includes custom hard travel case and audio cable.
          </p>
        </div>
      </section>

      {/* 
        ========================================================================
        APPLE / SONY STYLE MINIMAL FOOTER
        ========================================================================
      */}
      <footer className="py-16 px-6 border-t border-white/5 text-center text-xs text-white/40 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white/80">SONY</span>
            <span>WH-1000XM6 Concept Showcase</span>
          </div>

          <div className="flex items-center space-x-6">
            <a href="#overview" className="hover:text-white transition-colors">Privacy</a>
            <a href="#technology" className="hover:text-white transition-colors">Terms of Use</a>
            <Link to="/" className="text-[#00D6FF] hover:underline">Payviro Platform</Link>
          </div>

          <div>
            © 2026 Sony Corporation of America. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
