import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SceneConfig {
  id: string;
  depthLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  quote?: string;
  bullets?: string[];
  tags: string[];
  desktopVideo: string;
  mobileVideo: string;
  poster: string;
  accent: string;
  glow: string;
}

// 4 Distinct 10.0-second videos calibrated across the scroll journey
const SECONDS_PER_SCENE = 10.0;

// Individual 10s video calibration ranges with smooth crossfading
const videoRanges = [
  { start: 0.00, end: 0.28 },
  { start: 0.22, end: 0.52 },
  { start: 0.46, end: 0.76 },
  { start: 0.70, end: 1.00 },
];

// Helper: Calculate trapezoidal reading plateau opacity (0 -> 1 -> 1 -> 0)
function getPlateauOpacity(
  p: number,
  fadeInStart: number,
  plateauStart: number,
  plateauEnd: number,
  fadeOutEnd: number
): number {
  if (p < fadeInStart || p > fadeOutEnd) return 0;
  if (p >= plateauStart && p <= plateauEnd) return 1;
  if (p < plateauStart) {
    return (p - fadeInStart) / Math.max(0.001, plateauStart - fadeInStart);
  }
  return 1 - (p - plateauEnd) / Math.max(0.001, fadeOutEnd - plateauEnd);
}

// Helper: Smooth vertical travel (slides up into resting position, stays solid, then slides up & away)
function getPlateauY(
  p: number,
  fadeInStart: number,
  plateauStart: number,
  plateauEnd: number,
  fadeOutEnd: number,
  travelPx: number = 28
): number {
  if (p < plateauStart) {
    const ratio = Math.max(0, (p - fadeInStart) / Math.max(0.001, plateauStart - fadeInStart));
    return (1 - ratio) * travelPx;
  }
  if (p > plateauEnd) {
    const ratio = Math.min(1, (p - plateauEnd) / Math.max(0.001, fadeOutEnd - plateauEnd));
    return -ratio * travelPx;
  }
  return 0;
}

export const LetsScrollJourney: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 860 : false;
  });
  const [smoothProgress, setSmoothProgress] = useState<number>(0);

  // Motion physics and video seek synchronization refs
  const targetProgressRef = useRef<number>(0);
  const smoothProgressRef = useRef<number>(0);
  const scrollVelocityRef = useRef<number>(0);
  const lastScrollYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  // Hardware video seek pipeline refs per video (4 x 10s streams)
  const targetTimesRef = useRef<number[]>([0, 0, 0, 0]);
  const seekingRef = useRef<boolean[]>([false, false, false, false]);
  const lastSeekTimesRef = useRef<number[]>([0, 0, 0, 0]);

  // 4 Scenes matching the 4 x 10-second videos in public/lets-scroll/
  const scenes: SceneConfig[] = [
    {
      id: 'checkout',
      depthLabel: 'LEVEL 01 // CHECKOUT',
      eyebrow: '01 // ZERO-FRICTION CHECKOUT',
      title: 'Zero-Friction Checkout. Total Automation.',
      body: 'Customers scan a dynamic QR code or send money via bKash, Nagad, or Rocket. The transaction is intercepted and verified in 0.2 seconds.',
      quote: 'Instant dynamic QR generation with automated reference tagging eliminates customer errors completely.',
      tags: ['bKash Send Money', 'Nagad Personal', 'Rocket DBBL', 'Dynamic QR Code'],
      desktopVideo: '/lets-scroll/dive_01.mp4',
      mobileVideo: '/lets-scroll/dive_01_mobile.mp4',
      poster: '/lets-scroll/dive_01_poster.webp',
      accent: '#10B981',
      glow: 'rgba(16, 185, 129, 0.25)',
    },
    {
      id: 'relay',
      depthLabel: 'LEVEL 02 // HARDWARE RELAY',
      eyebrow: '02 // TELCO SMS INTERCEPT',
      title: '0.1s Hardware Relay & Encrypted Local Buffer.',
      body: 'Runs silently on your Android device, capturing payment SMS directly into a secure local SQLite queue with zero drop-off.',
      quote: '4-tier device fingerprinting and end-to-end encryption relay transactions securely to your private cloud.',
      tags: ['Android 14/15 Ready', 'Offline SQLite Buffer', '0.03ms Read Latency', 'End-to-End Encrypted'],
      desktopVideo: '/lets-scroll/dive_02.mp4',
      mobileVideo: '/lets-scroll/dive_02_mobile.mp4',
      poster: '/lets-scroll/dive_02_poster.webp',
      accent: '#34D399',
      glow: 'rgba(52, 211, 153, 0.25)',
    },
    {
      id: 'vps',
      depthLabel: 'LEVEL 03 // CLOUD ENGINE',
      eyebrow: '03 // PRIVATE CLOUD CORE',
      title: 'Multi-Tier FraudGuard & Matching Engine.',
      body: 'High-throughput regex parsing validates transaction identifiers and ledger balances in under 10 milliseconds.',
      bullets: [
        'Sub-10ms regex parsing & duplicate TrxID detection.',
        'Automated ledger reconciliation with failover retry logic.',
        'Zero false-positives with audit-grade financial logs.'
      ],
      tags: ['Regex Parser Core', 'Anti-Fraud Engine', 'Zero False-Positive', 'Real-Time SSE Sync'],
      desktopVideo: '/lets-scroll/dive_03.mp4',
      mobileVideo: '/lets-scroll/dive_03_mobile.mp4',
      poster: '/lets-scroll/dive_03_poster.webp',
      accent: '#10B981',
      glow: 'rgba(16, 185, 129, 0.25)',
    },
    {
      id: 'webhook',
      depthLabel: 'LEVEL 04 // FULFILLMENT',
      eyebrow: '04 // INSTANT DELIVERY',
      title: 'Instant Webhooks & Real-Time Order Fulfillment.',
      body: 'The moment payment arrives, an HMAC-SHA256 signed webhook triggers instant fulfillment across your e-commerce or SaaS platform.',
      quote: 'Cryptographically signed payloads with millisecond checkout redirects.',
      tags: ['HMAC-SHA256 Signed', 'WooCommerce Plugin', 'Laravel / Node SDK', 'Instant Redirect'],
      desktopVideo: '/lets-scroll/dive_04.mp4',
      mobileVideo: '/lets-scroll/dive_04_mobile.mp4',
      poster: '/lets-scroll/dive_04_poster.webp',
      accent: '#059669',
      glow: 'rgba(5, 150, 105, 0.25)',
    }
  ];

  // Screen size detection
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth <= 860);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Pre-warm and buffer 10-second videos on mount
  useEffect(() => {
    videoRefs.current.forEach((v) => {
      if (v) {
        v.load();
      }
    });

    const primeDecoders = () => {
      videoRefs.current.forEach((v) => {
        if (v) {
          try {
            const p = v.play();
            if (p !== undefined) {
              p.then(() => v.pause()).catch(() => {});
            }
          } catch (e) {}
        }
      });
    };

    primeDecoders();
    window.addEventListener('touchstart', primeDecoders, { passive: true, once: true });
    window.addEventListener('scroll', primeDecoders, { passive: true, once: true });

    return () => {
      window.removeEventListener('touchstart', primeDecoders);
      window.removeEventListener('scroll', primeDecoders);
    };
  }, [isMobile]);

  // Execute non-blocking hardware seek with onSeeked chain guarantee
  const executeSeek = useCallback((idx: number, targetTime: number) => {
    const video = videoRefs.current[idx];
    if (!video || !video.duration) return;

    targetTimesRef.current[idx] = targetTime;

    if (seekingRef.current[idx] || video.seeking) {
      // Safety: only if decoder has truly hung for > 200ms
      if (performance.now() - lastSeekTimesRef.current[idx] > 200) {
        seekingRef.current[idx] = false;
      } else {
        return;
      }
    }

    if (Math.abs(video.currentTime - targetTime) > 0.03) {
      seekingRef.current[idx] = true;
      lastSeekTimesRef.current[idx] = performance.now();
      try {
        if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
          (video as any).fastSeek(targetTime);
        } else {
          video.currentTime = targetTime;
        }
      } catch (e) {
        seekingRef.current[idx] = false;
      }
    }
  }, []);

  // Callback when hardware decoder finishes a seek
  const handleSeeked = useCallback((idx: number) => {
    seekingRef.current[idx] = false;
    const video = videoRefs.current[idx];
    if (!video) return;

    const pending = targetTimesRef.current[idx];
    if (pending !== undefined && Math.abs(video.currentTime - pending) > 0.03) {
      seekingRef.current[idx] = true;
      lastSeekTimesRef.current[idx] = performance.now();
      try {
        if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
          (video as any).fastSeek(pending);
        } else {
          video.currentTime = pending;
        }
      } catch (e) {
        seekingRef.current[idx] = false;
      }
    }
  }, []);

  // Scroll listener for raw target progress & velocity calculation
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollable));
      targetProgressRef.current = progress;

      // Measure scroll velocity for dynamic downward speed lines and lerp responsiveness
      const now = performance.now();
      const dt = Math.max(1, now - lastTimeRef.current);
      const dy = Math.abs(window.scrollY - lastScrollYRef.current);
      const velocity = dy / dt;
      scrollVelocityRef.current = Math.min(12, velocity * 4);
      lastScrollYRef.current = window.scrollY;
      lastTimeRef.current = now;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Continuous RAF loop for spring physics, video seeking & particle speed dust
  useEffect(() => {
    let animFrame: number;
    let canvasIsDirty = false;

    // Setup speed streak particles in vibrant emerald green
    interface SpeedParticle {
      x: number;
      y: number;
      speed: number;
      length: number;
      opacity: number;
      width: number;
    }

    const particleCount = isMobile ? 10 : 22;
    const particles: SpeedParticle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.8 + Math.random() * 1.6,
      length: 15 + Math.random() * 45,
      opacity: 0.15 + Math.random() * 0.45,
      width: 0.8 + Math.random() * 1.5,
    }));

    const updateLoop = () => {
      // 1. Organic adaptive easing:
      // Slow scroll -> 0.20 (silky smooth glide)
      // Fast swipe / fling -> up to 0.60 (instantly tracks fast finger movements)
      const current = smoothProgressRef.current;
      const target = targetProgressRef.current;
      const diff = target - current;
      const absDiff = Math.abs(diff);

      if (absDiff > 0.00005) {
        const adaptiveFactor = Math.min(0.60, Math.max(0.20, 0.20 + absDiff * 1.6 + scrollVelocityRef.current * 0.04));
        smoothProgressRef.current += diff * adaptiveFactor;
        setSmoothProgress(smoothProgressRef.current);
      } else if (smoothProgressRef.current !== target) {
        smoothProgressRef.current = target;
        setSmoothProgress(target);
      }

      const p = smoothProgressRef.current;

      // Decay velocity
      scrollVelocityRef.current *= 0.90;

      // 2. Video seeking based on exact 10s video calibration
      // ONLY seeks visible/active videos, so mobile GPU stays cool and buttery smooth
      for (let idx = 0; idx < scenes.length; idx++) {
        const video = videoRefs.current[idx];
        if (!video || !video.duration) continue;

        const range = videoRanges[idx];
        if (p < range.start - 0.06 || p > range.end + 0.06) {
          continue;
        }

        const localRatio = Math.max(0, Math.min(1, (p - range.start) / (range.end - range.start)));
        const duration = video.duration || SECONDS_PER_SCENE;
        const targetTime = Math.min(duration - 0.02, localRatio * duration);

        executeSeek(idx, targetTime);
      }

      // 3. Draw Upward Speed Streaks on Canvas in Emerald Green (only when actively scrolling)
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cw = canvas.clientWidth;
          const ch = canvas.clientHeight;
          if (canvas.width !== cw || canvas.height !== ch) {
            canvas.width = cw;
            canvas.height = ch;
          }

          const vel = scrollVelocityRef.current;
          if (vel > 0.04) {
            ctx.clearRect(0, 0, cw, ch);
            const baseSpeedFactor = 0.6 + vel * 1.8;

            particles.forEach(pt => {
              pt.y -= (pt.speed * baseSpeedFactor) / ch;
              if (pt.y < 0) {
                pt.y = 1.05;
                pt.x = Math.random();
              }

              const px = pt.x * cw;
              const py = pt.y * ch;
              const dynamicLength = pt.length * (1 + vel * 1.2);

              const grad = ctx.createLinearGradient(px, py, px, py + dynamicLength);
              grad.addColorStop(0, `rgba(52, 211, 153, ${pt.opacity * 0.8})`);
              grad.addColorStop(0.5, `rgba(16, 185, 129, ${pt.opacity * 0.4})`);
              grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

              ctx.beginPath();
              ctx.strokeStyle = grad;
              ctx.lineWidth = pt.width;
              ctx.moveTo(px, py);
              ctx.lineTo(px, py + dynamicLength);
              ctx.stroke();
            });
            canvasIsDirty = true;
          } else if (canvasIsDirty) {
            ctx.clearRect(0, 0, cw, ch);
            canvasIsDirty = false;
          }
        }
      }

      animFrame = requestAnimationFrame(updateLoop);
    };

    animFrame = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animFrame);
  }, [isMobile, scenes.length, executeSeek]);

  const scrollToPhase = useCallback((targetProgress: number) => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.offsetTop;
    const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: containerTop + (targetProgress * totalScrollable),
      behavior: 'smooth'
    });
  }, []);

  // Precise video crossfade between the 4 scenes:
  // Maximizes GPU fill-rate on mobile by keeping only 1-2 videos rendered at a time
  const getSceneVideoOpacity = (idx: number, p: number): number => {
    if (idx === 0) {
      if (p <= 0.22) return 1;
      if (p >= 0.28) return 0;
      return 1 - (p - 0.22) / 0.06;
    }
    if (idx === 1) {
      if (p <= 0.22 || p >= 0.52) return 0;
      if (p < 0.28) return (p - 0.22) / 0.06;
      if (p <= 0.46) return 1;
      return 1 - (p - 0.46) / 0.06;
    }
    if (idx === 2) {
      if (p <= 0.46 || p >= 0.76) return 0;
      if (p < 0.52) return (p - 0.46) / 0.06;
      if (p <= 0.70) return 1;
      return 1 - (p - 0.70) / 0.06;
    }
    if (idx === 3) {
      if (p <= 0.70) return 0;
      if (p < 0.76) return (p - 0.70) / 0.06;
      return 1;
    }
    return 0;
  };

  // Camera calibration: seamless progressive push-in per video scene without snapping
  const getSceneCameraTransform = (idx: number, p: number) => {
    const range = videoRanges[idx];
    const localRatio = Math.max(0, Math.min(1, (p - range.start) / (range.end - range.start)));
    const scale = 1.01 + localRatio * 0.05;
    const translateY = localRatio * -14;
    return { scale, translateY };
  };

  const activeSceneIndex = Math.min(3, Math.max(0, Math.floor(smoothProgress * 4)));

  // ====================================================================
  // CALIBRATED STORYTELLING BEATS FOR THE 4 x 10s VIDEOS
  // ====================================================================

  // Scene 1 (Checkout: 0.00 - 0.28)
  // Intro Hero Title (0.00 - 0.07, Plateau: 0.00 - 0.04)
  const heroOpacity = smoothProgress <= 0.04 ? 1 : Math.max(0, 1 - (smoothProgress - 0.04) / 0.03);
  const heroY = smoothProgress <= 0.04 ? 0 : -(smoothProgress - 0.04) * 180;
  const heroScale = Math.max(0.92, 1 - Math.max(0, (smoothProgress - 0.04) * 0.35));

  // Scene 1 Details Card: 0.07 to 0.25 (Plateau: 0.10 to 0.21)
  const s1Opacity = getPlateauOpacity(smoothProgress, 0.07, 0.10, 0.21, 0.25);
  const s1Y = getPlateauY(smoothProgress, 0.07, 0.10, 0.21, 0.25, 24);

  // Scene 2 (Hardware Relay: 0.22 - 0.52, Plateau: 0.28 - 0.46)
  const s2Opacity = getPlateauOpacity(smoothProgress, 0.24, 0.28, 0.46, 0.50);
  const s2Y = getPlateauY(smoothProgress, 0.24, 0.28, 0.46, 0.50, 24);

  // Scene 3 (Cloud Core: 0.46 - 0.76, Plateau: 0.53 - 0.70)
  const s3Opacity = getPlateauOpacity(smoothProgress, 0.48, 0.52, 0.70, 0.74);
  const s3Y = getPlateauY(smoothProgress, 0.48, 0.52, 0.70, 0.74, 24);

  // Scene 4 (Instant Delivery: 0.70 - 1.00, Plateau: 0.76 - 0.85)
  const s4Opacity = getPlateauOpacity(smoothProgress, 0.72, 0.76, 0.85, 0.88);
  const s4Y = getPlateauY(smoothProgress, 0.72, 0.76, 0.85, 0.88, 24);

  // Climax Final CTA (0.87 - 1.00, Plateau: 0.92 - 1.00)
  const ctaOpacity = getPlateauOpacity(smoothProgress, 0.87, 0.92, 1.00, 1.00);
  const ctaY = smoothProgress < 0.92 ? (0.92 - smoothProgress) * 45 : 0;

  return (
    <div
      ref={containerRef}
      id="lets-scroll-experience"
      className="relative w-full h-[950vh] bg-[#050505] text-white selection:bg-[#12b56a] selection:text-white"
    >
      {/* 
        ======================================================================
        STICKY 100VH 3D VIDEO BACKGROUND VIEWPORT (GPU HARDWARE ACCELERATED)
        ======================================================================
      */}
      <div className="sticky top-0 w-full h-screen overflow-hidden z-0 bg-[#050505] [contain:strict]">
        {/* 4 Calibrated 10-Second Videos with seamless Crossfade & Camera Calibration */}
        <div className="absolute inset-0 w-full h-full gpu-layer">
          {scenes.map((scene, idx) => {
            const videoSrc = isMobile ? scene.mobileVideo : scene.desktopVideo;
            const op = getSceneVideoOpacity(idx, smoothProgress);
            const isVisible = op > 0.005;
            const { scale, translateY } = getSceneCameraTransform(idx, smoothProgress);

            return (
              <video
                key={scene.id}
                ref={el => {
                  videoRefs.current[idx] = el;
                }}
                src={videoSrc}
                poster={scene.poster}
                muted
                playsInline
                preload={idx === 0 ? "auto" : "metadata"}
                disablePictureInPicture
                onSeeked={() => handleSeeked(idx)}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none gpu-layer"
                style={{
                  opacity: op,
                  visibility: isVisible ? 'visible' : 'hidden',
                  filter: 'brightness(0.85) contrast(1.15)',
                  transform: `scale(${scale}) translate3d(0, ${translateY}px, 0)`,
                  WebkitTransform: `scale(${scale}) translate3d(0, ${translateY}px, 0)`,
                  willChange: 'opacity, transform',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              />
            );
          })}
        </div>

        {/* Dynamic Downward Speed Lines & Cyber Dust Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-[2] mix-blend-screen opacity-70"
        />

        {/* Emerald vignette glow behind video */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700 z-[3]"
          style={{
            background: `radial-gradient(circle at center, transparent 35%, rgba(5, 5, 5, 0.45) 70%, #050505 100%),
                         radial-gradient(circle at 50% 50%, ${scenes[activeSceneIndex].glow} 0%, transparent 60%)`
          }}
        />

        {/* Top & bottom void gradient fades into #050505 */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#050505] via-[#050505]/60 to-transparent pointer-events-none z-[4]" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent pointer-events-none z-[4]" />


      </div>

      {/* 
        ======================================================================
        SYNCHRONIZED STORYTELLING OVERLAYS WITH TRUE 10-SECOND SCENE SYNC
        ======================================================================
      */}
      <div className="sticky top-0 w-full h-screen -mt-[100vh] pointer-events-none z-10 flex flex-col justify-between p-6 sm:p-12">
        <div className="w-full max-w-7xl mx-auto h-4" />

        {/* Content Viewport with true scroll travel */}
        <div className="w-full max-w-7xl mx-auto relative flex-1 flex items-center">
          {/* 
            BEAT 1: CENTERED HERO INTRO (0 - 7%)
            Rises upwards and fades out into Scene 1 details
          */}
          <div
            className="absolute inset-x-0 mx-auto text-center max-w-3xl will-change-transform gpu-layer"
            style={{
              opacity: heroOpacity,
              transform: `translate3d(0, ${heroY}px, 0) scale(${heroScale})`,
              pointerEvents: heroOpacity > 0.3 ? 'auto' : 'none',
              visibility: heroOpacity > 0.01 ? 'visible' : 'hidden',
            }}
          >
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white/95 leading-none mb-4 drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
              Payviro
            </h1>

            <p className="text-xl sm:text-2xl font-light text-white/80 tracking-wide mb-3">
              Payment verification, perfected.
            </p>

            <p className="text-sm sm:text-base text-white/50 max-w-xl mx-auto font-normal leading-relaxed">
              Eliminate manual transaction checking. Transform any Android device into a 0.1-second automated MFS payment gateway.
            </p>

            <div className="mt-8 flex items-center justify-center space-x-4">
              <button
                onClick={() => scrollToPhase(0.16)}
                className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold uppercase tracking-wider backdrop-blur-md transition-all flex items-center space-x-2 group cursor-pointer"
              >
                <span>Scroll to Explore</span>
                <ChevronDown className="w-4 h-4 text-emerald-400 group-hover:translate-y-1 transition-transform animate-bounce" />
              </button>
            </div>
          </div>

          {/* 
            BEAT 1.5 / LEVEL 01: ZERO-FRICTION CHECKOUT (7% - 25%)
            Matched exactly to Video 1 (10.0s: Kiosk Screen & Dynamic QR Pedestal)
          */}
          <div
            className="absolute left-0 max-w-lg text-left will-change-transform gpu-layer"
            style={{
              opacity: s1Opacity,
              transform: `translate3d(0, ${s1Y}px, 0)`,
              pointerEvents: s1Opacity > 0.3 ? 'auto' : 'none',
              visibility: s1Opacity > 0.01 ? 'visible' : 'hidden',
            }}
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono text-emerald-400 mb-3">
              <span>01 // ZERO-FRICTION CHECKOUT</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white/90 leading-[1.08] mb-4 drop-shadow-lg">
              Zero-Friction Checkout. Total Automation.
            </h2>

            <p className="text-base text-white/60 leading-relaxed mb-4">
              Customers scan a dynamic QR code or send money via bKash, Nagad, or Rocket. The transaction is intercepted and verified in 0.2 seconds.
            </p>

            <p className="text-sm text-white/40 leading-relaxed border-l-2 border-emerald-500 pl-4 mb-6">
              Instant dynamic QR generation with automated reference tagging eliminates customer errors completely.
            </p>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                bKash Send Money
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                Nagad Personal
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                Rocket DBBL
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                Dynamic QR Code
              </span>
            </div>
          </div>

          {/* 
            BEAT 2 / LEVEL 02: TELCO SMS INTERCEPT (25% - 50%)
            Matched exactly to Video 2 (10.0s: Physical Android Device & Local Buffer)
          */}
          <div
            className="absolute left-0 md:left-auto md:right-0 max-w-lg text-left md:text-right will-change-transform gpu-layer"
            style={{
              opacity: s2Opacity,
              transform: `translate3d(0, ${s2Y}px, 0)`,
              pointerEvents: s2Opacity > 0.3 ? 'auto' : 'none',
              visibility: s2Opacity > 0.01 ? 'visible' : 'hidden',
            }}
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono text-emerald-400 mb-3">
              <span>02 // TELCO SMS INTERCEPT</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white/90 leading-[1.08] mb-4 drop-shadow-lg">
              0.1s Hardware Relay & Encrypted Local Buffer.
            </h2>

            <p className="text-base text-white/60 leading-relaxed mb-4">
              Runs silently on your Android device, capturing payment SMS directly into a secure local SQLite queue with zero drop-off.
            </p>

            <p className="text-sm text-white/40 leading-relaxed border-l-2 md:border-l-0 md:border-r-2 border-emerald-500 pl-4 md:pl-0 md:pr-4 mb-6">
              4-tier device fingerprinting and end-to-end encryption relay transactions securely to your private cloud.
            </p>

            <div className="flex flex-wrap md:justify-end gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                Android 14/15 Ready
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                Offline SQLite Buffer
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                0.03ms Read Latency
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                End-to-End Encrypted
              </span>
            </div>
          </div>

          {/* 
            BEAT 3 / LEVEL 03: CLOUD ENGINE & FRAUDGUARD (50% - 75%)
            Matched exactly to Video 3 (10.0s: Server Racks & Holographic Core Prism)
          */}
          <div
            className="absolute left-0 max-w-lg text-left will-change-transform gpu-layer"
            style={{
              opacity: s3Opacity,
              transform: `translate3d(0, ${s3Y}px, 0)`,
              pointerEvents: s3Opacity > 0.3 ? 'auto' : 'none',
              visibility: s3Opacity > 0.01 ? 'visible' : 'hidden',
            }}
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono text-emerald-400 mb-3">
              <span>03 // PRIVATE CLOUD CORE</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white/90 leading-[1.08] mb-4 drop-shadow-lg">
              Multi-Tier FraudGuard & Matching Engine.
            </h2>

            <ul className="space-y-3 text-sm text-white/60 inline-block max-w-md">
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Sub-10ms regex parsing & duplicate TrxID detection.</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Automated ledger reconciliation with failover retry logic.</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Zero false-positives with audit-grade financial logs.</span>
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400">
                Regex Parser Core
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                Anti-Fraud Engine
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                Zero False-Positive
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                Real-Time SSE Sync
              </span>
            </div>
          </div>

          {/* 
            BEAT 4 / LEVEL 04: INSTANT DELIVERY (75% - 88%)
            Matched exactly to Video 4 (10.0s: Shield Checkmark & Drone Takeoff)
          */}
          <div
            className="absolute left-0 md:left-auto md:right-0 max-w-lg text-left md:text-right will-change-transform gpu-layer"
            style={{
              opacity: s4Opacity,
              transform: `translate3d(0, ${s4Y}px, 0)`,
              pointerEvents: s4Opacity > 0.3 ? 'auto' : 'none',
              visibility: s4Opacity > 0.01 ? 'visible' : 'hidden',
            }}
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono text-emerald-400 mb-3">
              <span>04 // INSTANT DELIVERY</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white/90 leading-[1.08] mb-4 drop-shadow-lg">
              Instant Webhooks & Real-Time Order Fulfillment.
            </h2>

            <p className="text-base text-white/60 leading-relaxed mb-4">
              The moment payment lands, an HMAC-SHA256 signed webhook triggers instant order fulfillment across your e-commerce or SaaS platform.
            </p>

            <p className="text-sm text-white/40 leading-relaxed border-l-2 md:border-l-0 md:border-r-2 border-emerald-500 pl-4 md:pl-0 md:pr-4 mb-6">
              Cryptographically signed payloads with millisecond checkout redirects.
            </p>

            <div className="flex flex-wrap md:justify-end gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                HMAC-SHA256 Signed
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                WooCommerce Plugin
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                Laravel / Node SDK
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                Instant Redirect
              </span>
            </div>
          </div>

          {/* 
            BEAT 5: CLIMAX CTA (88% - 100%)
            Grand finale at the culmination of the 4-video journey
          */}
          <div
            className="absolute inset-x-0 mx-auto text-center max-w-2xl will-change-transform gpu-layer"
            style={{
              opacity: ctaOpacity,
              transform: `translate3d(0, ${ctaY}px, 0)`,
              pointerEvents: ctaOpacity > 0.3 ? 'auto' : 'none',
              visibility: ctaOpacity > 0.01 ? 'visible' : 'hidden',
            }}
          >
            <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4 drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
              Zero-delay confirmation. 100% automated delivery.
            </h2>

            <p className="text-lg text-white/70 font-light mb-2">
              Payviro — Autonomous payment orchestration for modern commerce.
            </p>

            <p className="text-xs text-white/40 mb-8">
              Start automating with your personal bKash, Nagad, or Rocket account today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#12b56a] hover:bg-[#37e58a] text-white font-bold text-sm transition-all shadow-lg shadow-[#12b56a]/30 hover:scale-105 flex items-center justify-center space-x-2"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/docs"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2"
              >
                <span>Read Developer Docs</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Minimal Bottom Spacer */}
        <div className="w-full max-w-7xl mx-auto h-4" />
      </div>
    </div>
  );
};
