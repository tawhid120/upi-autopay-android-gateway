import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Check,
  CheckCircle2,
  Smartphone,
  ArrowRight,
  Lock,
  Volume2,
  Globe,
  Percent,
  ShoppingBag,
  MessageCircle,
  Store,
  Menu,
  X,
  Zap
} from 'lucide-react';
import { LetsScrollJourney } from '../components/LetsScrollJourney';
import { ThemeToggle } from '../components/ThemeToggle';

export const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeStoryLine, setActiveStoryLine] = useState(0);
  const [activeGuideTab, setActiveGuideTab] = useState<'phone' | 'web' | 'social' | 'counter'>('phone');
  const storyItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll-triggered dynamic focus: automatically highlights whichever story item the user is in front of
  useEffect(() => {
    const handleScroll = () => {
      const refs = storyItemRefs.current;
      if (!refs || refs.length === 0) return;

      const viewportReadingZone = window.innerHeight * 0.45;
      let bestIdx = -1;
      let minDistance = Infinity;

      refs.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // Check if element is in visible viewport vertical range
        if (rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.2) {
          const center = rect.top + rect.height / 2;
          const dist = Math.abs(center - viewportReadingZone);
          if (dist < minDistance) {
            minDistance = dist;
            bestIdx = idx;
          }
        }
      });

      if (bestIdx !== -1 && bestIdx !== activeStoryLine) {
        setActiveStoryLine(bestIdx);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeStoryLine]);


  const storyContent = [
    {
      title: "One small phone does all the work.",
      titleNode: (
        <>
          One small phone does <span className="hl-green">all the work</span>.
        </>
      ),
      desc: "Keep your bKash or Nagad SIM inside any cheap Android phone. Our tiny app handles the rest while you sleep.",
      descNode: (
        <>
          Keep your bKash or Nagad SIM inside <span className="hl-underline">any cheap Android phone</span>. Our tiny app handles the rest while you sleep.
        </>
      ),
      cardAmount: "৳1,500",
      cardNetwork: "bKash Personal",
      cardCustomer: "01712-984***"
    },
    {
      title: "No more asking for screenshots.",
      titleNode: (
        <>
          No more asking for <span className="hl-green">screenshots</span>.
        </>
      ),
      desc: "Stop messaging buyers 'Did you send money? Show screenshot'. It checks your real balance automatically in 1 second.",
      descNode: (
        <>
          Stop messaging buyers 'Did you send money? Show screenshot'. It checks your real balance automatically in <span className="hl-underline">1 second</span>.
        </>
      ),
      cardAmount: "৳2,450",
      cardNetwork: "Nagad Personal",
      cardCustomer: "01844-321***"
    },
    {
      title: "100% safe while you sleep.",
      titleNode: (
        <>
          <span className="hl-green">100% safe</span> while you sleep.
        </>
      ),
      desc: "Orders only get approved when real cash hits your account. Never lose another product to Photoshop scammers.",
      descNode: (
        <>
          Orders only get approved when <span className="hl-green">real cash</span> hits your account. Never lose another product to <span className="hl-underline">Photoshop scammers</span>.
        </>
      ),
      cardAmount: "৳3,800",
      cardNetwork: "Rocket DBBL",
      cardCustomer: "01911-567***"
    }
  ];

  return (
    <div className="min-h-screen bg-[#080d0b] text-[#e9efec] selection:bg-[#12b56a] selection:text-white font-sans antialiased">
      {/* 
        ========================================================================
        NAVIGATION BAR (FROSTED GLASS ON CARBON DARK)
        ========================================================================
      */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-[#080d0b]/80 backdrop-blur-xl border-b border-white/10 transition-all">
        <div className="max-w-[1160px] mx-auto px-6 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight group">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#37e58a] via-[#12b56a] to-[#0a8f52] flex items-center justify-center shadow-lg shadow-[#12b56a]/30 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4.5 h-4.5 text-white stroke-[2.4]" />
            </span>
            <span className="jak font-extrabold text-[17px] text-white">
              Payviro<span className="text-[#37e58a]">.</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-[13.5px] font-medium text-[#93a29a]">
            <Link to="/history" className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Crypto Audit Log</span>
            </Link>
            <a href="#platforms" className="hover:text-white transition-colors">bKash</a>
            <a href="#platforms" className="hover:text-white transition-colors">Nagad</a>
            <a href="#guides" className="hover:text-white transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <ThemeToggle variant="dropdown" />
            <Link
              to="/login"
              className="text-[13.5px] font-semibold text-[#93a29a] hover:text-white px-3 py-2 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="btn btn-primary text-[13.5px]"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Start Free</span>
            </Link>
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle variant="icon-cycle" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/5"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0e1512] border-b border-white/10 px-6 py-5 space-y-3">
            <a
              href="#platforms"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-white/80 hover:text-white py-1"
            >
              Payment Apps (bKash, Nagad, Rocket)
            </a>
            <a
              href="#guides"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-white/80 hover:text-white py-1"
            >
              How It Works (1-2-3 Steps)
            </a>
            <a
              href="#reviews"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-white/80 hover:text-white py-1"
            >
              Customer Reviews
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-white/80 hover:text-white py-1"
            >
              Common Questions (FAQ)
            </a>
            <div className="flex items-center justify-between py-2 border-t border-b border-white/10 my-2">
              <span className="text-xs text-[#93a29a] font-medium">Theme Mode:</span>
              <ThemeToggle variant="segmented" showLabels />
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full text-center py-2.5 rounded-full border border-white/15 text-white text-xs font-semibold"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="btn btn-primary w-full text-xs text-center"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        )}
      </nav>



      {/* 
        ========================================================================
        IMMERSIVE BACKGROUND VIDEO SCROLLYTELLING JOURNEY
        User explicitly loved this: background video plays & moves on scroll!
        ========================================================================
      */}
      <LetsScrollJourney />

      {/* 
        ========================================================================
        INFINITE MARQUEE STRIP (.sec-dark)
        ========================================================================
      */}
      <div className="marquee sec-dark">
        <div className="mq-track">
          {[
            "bKash Personal & Agent",
            "Nagad Personal & Merchant",
            "Rocket (DBBL)",
            "Upay & Bank Transfer",
            "Instant Voice Alerts (Speaks Aloud!)",
            "100% Fake Screenshot Blocker",
            "0% Commission (Keep 100% Profit)",
            "WooCommerce & Shopify Ready",
            "Works on Any Cheap Android Phone",
            "WhatsApp & Telegram Alerts",
            "bKash Personal & Agent",
            "Nagad Personal & Merchant",
            "Rocket (DBBL)",
            "Upay & Bank Transfer",
            "Instant Voice Alerts (Speaks Aloud!)",
            "100% Fake Screenshot Blocker",
            "0% Commission (Keep 100% Profit)",
            "WooCommerce & Shopify Ready"
          ].map((item, idx) => (
            <div key={idx} className="mq-item">
              <CheckCircle2 className="w-4 h-4 text-[#37e58a]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 
        ========================================================================
        POWER STATEMENT SECTION (.sec-dark.power)
        ========================================================================
      */}
      <section className="sec-dark power py-24">
        <div className="wrap">
          <div className="power-in">
            <span className="kicker">NO MORE FAKE PHOTOS</span>
            <h2 className="jak text-white">
              There is no fake payment we <span className="gb">cannot catch</span>
            </h2>
            <p>
              Scammers use photo editors to make receipts look real. But they can never put{' '}
              <span className="hl-green">real money</span> into your balance! Payviro checks the real SMS directly on your phone.{' '}
              <span className="hl-underline">Real money = Yes!</span> Fake screenshot ={' '}
              <span className="hl-green font-bold">Blocked in 1s!</span>
            </p>

            <div className="power-tags">
              <span className="ptag">🔒 <span className="hl-green">Real Money Only</span></span>
              <span className="ptag">🚫 Block Photoshop Scams</span>
              <span className="ptag">📱 Any Android Phone</span>
              <span className="ptag">🔊 Talking Voice Alerts</span>
              <span className="ptag">⚡ <span className="hl-green">0.1s Instant Check</span></span>
              <span className="ptag">💸 <span className="hl-underline">0% Commission Always</span></span>
              <span className="ptag">🛒 1-Click Shop Setup</span>
              <span className="ptag">🛡️ Zero Lost Taka</span>
            </div>

            <Link to="/register" className="btn btn-primary btn-lg shadow-xl">
              <Zap className="w-4 h-4 fill-white" />
              <span>Start checking free</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        SECTION 1: WHY PAYVIRO (.sec-light -> CRISP PURE WHITE SECTION!)
        Alternating contrast: Dark -> White!
        ========================================================================
      */}
      <section className="sec-light py-24" id="why-payviro">
        <div className="wrap">
          <div className="head">
            <span className="kicker">WHY PAYVIRO</span>
            <h2 className="jak text-[#0a1310]">
              The <span className="g">easiest</span> way to sell and <span className="hl-underline">get paid safely</span>.
            </h2>
            <p>
              You started your business to make money, not to spend hours looking at bank SMS.
            </p>
          </div>

          <div className="story">
            {/* Interactive Story Lines with Dynamic Scroll Highlight */}
            <div className="lines">
              {storyContent.map((item, idx) => {
                const isActive = activeStoryLine === idx;
                return (
                  <div
                    key={idx}
                    ref={(el) => {
                      storyItemRefs.current[idx] = el;
                    }}
                    onClick={() => setActiveStoryLine(idx)}
                    onMouseEnter={() => setActiveStoryLine(idx)}
                    className={`ln ${isActive ? 'on' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full transition-all duration-300 ${
                          isActive
                            ? 'bg-[#12b56a] text-white shadow-md shadow-[#12b56a]/30 scale-105'
                            : 'bg-black/5 text-black/35'
                        }`}
                      >
                        0{idx + 1}
                      </span>
                      <span>{item.titleNode || item.title}</span>
                    </div>
                    <small>{item.descNode || item.desc}</small>
                  </div>
                );
              })}
            </div>

            {/* Visual Card showing verified payment */}
            <div className="visual">
              <div className="badge-top">
                <CheckCircle2 className="w-4 h-4 text-[#12b56a]" />
                <span>Live Verification</span>
              </div>

              <div key={activeStoryLine} className="vcard transition-all duration-300">
                <div className="vh">
                  <span className="ava">
                    <Check className="w-5 h-5 text-white stroke-[3]" />
                  </span>
                  <div>
                    <b>Real Payment Confirmed</b>
                    <span>Customer: {storyContent[activeStoryLine].cardCustomer}</span>
                  </div>
                </div>

                <div className="lbl">Verified On Your Device</div>

                <div className="chips">
                  <div className="chip">
                    Source
                    <b>{storyContent[activeStoryLine].cardNetwork}</b>
                  </div>
                  <div className="chip">
                    Amount
                    <b className="text-[#37e58a]">{storyContent[activeStoryLine].cardAmount}</b>
                  </div>
                  <div className="chip">
                    Status
                    <b><span className="hl-green">100% Real Cash</span></b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        SECTION 2: PICK YOUR PAYMENT APP (.sec-soft -> SOFT CRISP TINT SECTION!)
        Alternating contrast: White -> Soft!
        ========================================================================
      */}
      <section className="sec-soft py-24" id="platforms">
        <div className="wrap">
          <div className="head ctr">
            <span className="kicker">PAYMENT APPS</span>
            <h2 className="jak text-[#0a1310]">
              Works with all your <span className="g">favorite apps</span>
            </h2>
            <p>Connect any mobile wallet you already use in Bangladesh. No expensive merchant setup.</p>
          </div>

          <div className="pgrid">
            {/* bKash */}
            <div className="pcard group">
              <div className="pico bg-[#E2136E]/10 text-[#E2136E]">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3>bKash Auto-Check</h3>
              <p>
                Checks bKash 'Send Money' and 'Payment' in <span className="hl-green font-bold">0.1s</span>. Matches TrxID and amount with <span className="hl-underline">100% accuracy</span>.
              </p>
              <Link to="/register" className="go">
                <span>Try with bKash</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Nagad */}
            <div className="pcard group">
              <div className="pico bg-[#F7941D]/10 text-[#F7941D]">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3>Nagad Auto-Check</h3>
              <p>
                Reads incoming Nagad transfers instantly. Fake Nagad SMS generators get <span className="hl-green">caught immediately</span>.
              </p>
              <Link to="/register" className="go">
                <span>Try with Nagad</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Rocket */}
            <div className="pcard group">
              <div className="pico bg-[#8C3494]/10 text-[#8C3494]">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3>Rocket DBBL Check</h3>
              <p>
                Full support for Dutch-Bangla Rocket mobile banking. <span className="hl-underline">Every single Taka</span> is accounted for.
              </p>
              <Link to="/register" className="go">
                <span>Try with Rocket</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Voice Alerts */}
            <div className="pcard group">
              <div className="pico bg-[#12b56a]/10 text-[#12b56a]">
                <Volume2 className="w-6 h-6" />
              </div>
              <h3>Talking Voice Alert</h3>
              <p>
                Your phone speaks out loud: <span className="hl-green font-semibold">"Received ৳1,500 from bKash!"</span> Great for busy shop counters.
              </p>
              <Link to="/register" className="go">
                <span>Hear demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Website & Social Selling */}
            <div className="pcard group">
              <div className="pico bg-[#0284c7]/10 text-[#0284c7]">
                <Globe className="w-6 h-6" />
              </div>
              <h3>Website & Social Selling</h3>
              <p>
                Works with WooCommerce, Shopify, or simple WhatsApp payment links. Approves orders <span className="hl-underline">automatically</span>.
              </p>
              <Link to="/register" className="go">
                <span>Connect shop</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 0% Commission Always - UI/UX Pro Max Redesign with Color-Matched Edges */}
            <div className="pcard-featured group">
              <span className="ft-badge">0% Fee Guarantee</span>

              <div>
                <div className="pico-ft">
                  <Percent className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3><span className="hl-green">0% Commission</span> Always</h3>
                <p>
                  Payment gateways take 2% to 3% of your profit. Payviro takes <span className="hl-green font-bold">0%</span>. You keep <span className="hl-underline">every single Taka</span>.
                </p>

                {/* Micro Comparison Strip */}
                <div className="compare-strip">
                  <span className="old-fee">Other Gateways: <b>2.5% Cut ❌</b></span>
                  <span className="new-fee">Payviro: <span className="hl-green">0% Keep 100%</span> ✅</span>
                </div>
              </div>

              <Link to="/register" className="btn-profit">
                <span>Keep 100% of Your Profit</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        SECTION 3: STEP-BY-STEP GUIDES (.sec-light -> PURE CRISP WHITE SECTION!)
        Alternating contrast: Soft -> White!
        ========================================================================
      */}
      <section className="sec-light py-24" id="guides">
        <div className="wrap">
          <div className="head ctr">
            <span className="kicker">HOW IT WORKS</span>
            <h2 className="jak text-[#0a1310]">
              Start in <span className="g">3 easy steps</span>
            </h2>
            <p>No coding. No computer degree. If you can use a smartphone, you can use Payviro.</p>
          </div>

          {/* Interactive Guide Tabs */}
          <div className="gtabs">
            <button
              onClick={() => setActiveGuideTab('phone')}
              className={`gtab ${activeGuideTab === 'phone' ? 'on' : ''}`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Personal bKash / Nagad</span>
            </button>
            <button
              onClick={() => setActiveGuideTab('web')}
              className={`gtab ${activeGuideTab === 'web' ? 'on' : ''}`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Website Store</span>
            </button>
            <button
              onClick={() => setActiveGuideTab('social')}
              className={`gtab ${activeGuideTab === 'social' ? 'on' : ''}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Facebook & WhatsApp</span>
            </button>
            <button
              onClick={() => setActiveGuideTab('counter')}
              className={`gtab ${activeGuideTab === 'counter' ? 'on' : ''}`}
            >
              <Store className="w-4 h-4" />
              <span>Physical Shop Counter</span>
            </button>
          </div>

          {/* Tab 1: Personal Phone SIM */}
          {activeGuideTab === 'phone' && (
            <div className="gpanel">
              <div className="gsteps">
                <div className="gstep">
                  <div className="gn">1</div>
                  <div>
                    <h4>Install our small phone app</h4>
                    <p>Put our tiny app on any Android phone where your bKash or Nagad SIM is inserted. Takes <span className="hl-green">less than 1 minute</span>.</p>
                  </div>
                </div>

                <div className="gstep">
                  <div className="gn">2</div>
                  <div>
                    <h4>Buyer sends money to your number</h4>
                    <p>They send bKash or Nagad like normal. <span className="hl-underline">No special gateway needed</span>.</p>
                  </div>
                </div>

                <div className="gstep">
                  <div className="gn">3</div>
                  <div>
                    <h4><span className="hl-green">Green light!</span> Money confirmed</h4>
                    <p>Our app hears the real SMS in <span className="hl-green font-bold">0.1s</span>. You see a green light and can <span className="hl-underline">safely send the product</span>!</p>
                  </div>
                </div>
              </div>

              <div className="gvisual">
                <div className="gmsg u">
                  <span className="who">Customer</span>
                  <span>Sent ৳1,200 to your bKash number.</span>
                </div>
                <div className="gmsg b">
                  <span className="who">Payviro App</span>
                  <span>Reading incoming SMS from 16247…</span>
                </div>
                <div className="gmsg b">
                  <span className="who">Payviro App</span>
                  <b className="text-[#37e58a]">✓ Real money confirmed! ৳1,200 is safely in your wallet.</b>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Website Store */}
          {activeGuideTab === 'web' && (
            <div className="gpanel">
              <div className="gsteps">
                <div className="gstep">
                  <div className="gn">1</div>
                  <div>
                    <h4>Install our <span className="hl-green">1-click plugin</span></h4>
                    <p>Add Payviro to your WooCommerce or custom store in 2 clicks. <span className="hl-underline">No programming needed</span>.</p>
                  </div>
                </div>

                <div className="gstep">
                  <div className="gn">2</div>
                  <div>
                    <h4>Customer pays on checkout</h4>
                    <p>Customer sees your bKash/Nagad number and enters the TrxID after sending money.</p>
                  </div>
                </div>

                <div className="gstep">
                  <div className="gn">3</div>
                  <div>
                    <h4>Order marks paid <span className="hl-underline">automatically</span></h4>
                    <p>Our system matches the TrxID with the real SMS on your phone. Order status changes to "Processing" in <span className="hl-green font-bold">1 second</span>!</p>
                  </div>
                </div>
              </div>

              <div className="gvisual">
                <div className="gmsg u">
                  <span className="who">Checkout Screen</span>
                  <span>Customer submitted TrxID: 8K2M9N4P</span>
                </div>
                <div className="gmsg b">
                  <span className="who">Store System</span>
                  <span>Checking against real bKash SIM SMS…</span>
                </div>
                <div className="gmsg b">
                  <span className="who">Store System</span>
                  <b className="text-[#37e58a]">✓ Match confirmed! Order #4892 marked PAID. Ready to ship.</b>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Facebook & WhatsApp */}
          {activeGuideTab === 'social' && (
            <div className="gpanel">
              <div className="gsteps">
                <div className="gstep">
                  <div className="gn">1</div>
                  <div>
                    <h4>Send customer a <span className="hl-green">quick payment link</span></h4>
                    <p>Create a 1-click link from your Payviro dashboard and send it in Messenger or WhatsApp.</p>
                  </div>
                </div>

                <div className="gstep">
                  <div className="gn">2</div>
                  <div>
                    <h4>Customer clicks and pays</h4>
                    <p>They see your number, send money, and submit payment without typing wrong numbers.</p>
                  </div>
                </div>

                <div className="gstep">
                  <div className="gn">3</div>
                  <div>
                    <h4><span className="hl-underline">Instant notification</span> on your phone</h4>
                    <p>You get an instant alert: "Customer paid ৳850!" You <span className="hl-green">never need to ask for screenshots</span> anymore.</p>
                  </div>
                </div>
              </div>

              <div className="gvisual">
                <div className="gmsg u">
                  <span className="who">Customer in Inbox</span>
                  <span>"I clicked the link and sent ৳850!"</span>
                </div>
                <div className="gmsg b">
                  <span className="who">Payviro Alert</span>
                  <span>Matching incoming Nagad SMS on your phone…</span>
                </div>
                <div className="gmsg b">
                  <span className="who">Payviro Alert</span>
                  <b className="text-[#37e58a]">✓ Payment Verified: ৳850 received from 01923-***456</b>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Physical Store Counter */}
          {activeGuideTab === 'counter' && (
            <div className="gpanel">
              <div className="gsteps">
                <div className="gstep">
                  <div className="gn">1</div>
                  <div>
                    <h4>Keep phone on the shop counter</h4>
                    <p>Leave any Android phone near your cashier counter with the Payviro app running.</p>
                  </div>
                </div>

                <div className="gstep">
                  <div className="gn">2</div>
                  <div>
                    <h4>Customer scans your counter QR code</h4>
                    <p>Customer sends money from their bKash or Nagad app.</p>
                  </div>
                </div>

                <div className="gstep">
                  <div className="gn">3</div>
                  <div>
                    <h4>Phone <span className="hl-green">speaks the payment out loud!</span></h4>
                    <p>The speaker says: "bKash received ৳500!" You and your customer hear it instantly. <span className="hl-underline">Zero fake screenshot tricks</span>.</p>
                  </div>
                </div>
              </div>

              <div className="gvisual">
                <div className="gmsg u">
                  <span className="who">Counter Customer</span>
                  <span>Customer shows phone screen claiming they paid.</span>
                </div>
                <div className="gmsg b">
                  <span className="who">Payviro Counter Audio</span>
                  <span>Loud voice chime playing…</span>
                </div>
                <div className="gmsg b">
                  <span className="who">Payviro Voice</span>
                  <b className="text-[#37e58a]">🔊 "bKash payment received: Five Hundred Taka!"</b>
                </div>
              </div>
            </div>
          )}

          {/* Big CTA below guides */}
          <div className="mt-14 text-center">
            <Link to="/register" className="btn btn-primary btn-lg shadow-xl shadow-[#12b56a]/25">
              <Zap className="w-4 h-4 fill-white" />
              <span>Try it free right now</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        SECTION 4: BIG NUMBERS BAND (.sec-light WITH INNER GLOWING DARK .band)
        ========================================================================
      */}
      <section className="sec-light pt-0 pb-20">
        <div className="wrap">
          <div className="band">
            <div className="s">
              <b className="jak">100,000+</b>
              <span>Payments Checked</span>
            </div>
            <div className="s">
              <b className="jak">3</b>
              <span>Supported Networks</span>
            </div>
            <div className="s">
              <b className="jak text-[#37e58a]"><span className="hl-green">24/7</span></b>
              <span>Works While You Sleep</span>
            </div>
            <div className="s">
              <b className="jak"><span className="hl-green">0%</span></b>
              <span>Commission Always</span>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        SECTION 5: CUSTOMER REVIEWS (.sec-dark -> GLOWING CARBON DARK SECTION!)
        Alternating contrast: White -> Dark!
        ========================================================================
      */}
      <section className="sec-dark py-24" id="reviews">
        <div className="wrap">
          <div className="head ctr">
            <span className="kicker">LOVED BY SELLERS</span>
            <h2 className="jak text-white">
              People are <span className="gb">talking</span>
            </h2>
            <p className="text-[#93a29a]">
              Thousands of shop owners across Bangladesh sleep peacefully with Payviro.
            </p>
          </div>
        </div>

        {/* Dual-Row Reviews Marquee */}
        <div className="reviews">
          {/* Row 1 */}
          <div className="rrow">
            {[
              {
                stars: "★★★★★",
                text: "Someone sent an edited bKash screenshot for a ৳3,500 dress. Payviro blocked it in 1 second! Saved my shop.",
                textNode: <>"Someone sent an edited bKash screenshot for a ৳3,500 dress. Payviro <span className="hl-green">blocked it in 1 second!</span> Saved my shop."</>,
                name: "Farhana R.",
                role: "Clothing Boutique Owner",
                bg: "#E2136E"
              },
              {
                stars: "★★★★★",
                text: "I used to check bKash balance 50 times every day. Now my phone speaks out loud and approves orders automatically.",
                textNode: <>"I used to check bKash balance 50 times every day. Now my phone <span className="hl-green">speaks out loud</span> and approves orders <span className="hl-underline">automatically</span>."</>,
                name: "Tanvir M.",
                role: "Gadget Store Owner",
                bg: "#12b56a"
              },
              {
                stars: "★★★★★",
                text: "No coding needed at all. I put the app on an old Walton phone and connected it in 2 minutes. Super easy!",
                textNode: <>"No coding needed at all. I put the app on an old Walton phone and connected it in <span className="hl-green">2 minutes</span>. Super easy!"</>,
                name: "Shakil I.",
                role: "Online Shoe Seller",
                bg: "#0284c7"
              },
              {
                stars: "★★★★★",
                text: "Gateways charge 2.5% on every sale. With Payviro, I keep 100% of my money with my personal SIM.",
                textNode: <>"Gateways charge 2.5% on every sale. With Payviro, I keep <span className="hl-underline">100% of my money</span> with my <span className="hl-green">personal SIM</span>."</>,
                name: "Nusrat J.",
                role: "Organic Food Store",
                bg: "#F7941D"
              },
              {
                stars: "★★★★★",
                text: "Works smoothly during big Eid sales. Hundreds of orders approved without a single mistake.",
                textNode: <>"Works smoothly during big Eid sales. <span className="hl-green">Hundreds of orders approved</span> without a single mistake."</>,
                name: "Mehedi H.",
                role: "Fashion Brand Owner",
                bg: "#8C3494"
              },
              {
                stars: "★★★★★",
                text: "Someone sent an edited bKash screenshot for a ৳3,500 dress. Payviro blocked it in 1 second! Saved my shop.",
                textNode: <>"Someone sent an edited bKash screenshot for a ৳3,500 dress. Payviro <span className="hl-green">blocked it in 1 second!</span> Saved my shop."</>,
                name: "Farhana R.",
                role: "Clothing Boutique Owner",
                bg: "#E2136E"
              },
              {
                stars: "★★★★★",
                text: "I used to check bKash balance 50 times every day. Now my phone speaks out loud and approves orders automatically.",
                textNode: <>"I used to check bKash balance 50 times every day. Now my phone <span className="hl-green">speaks out loud</span> and approves orders <span className="hl-underline">automatically</span>."</>,
                name: "Tanvir M.",
                role: "Gadget Store Owner",
                bg: "#12b56a"
              }
            ].map((rev, i) => (
              <div key={i} className="rcard">
                <div className="stars">{rev.stars}</div>
                <p>{rev.textNode || `"${rev.text}"`}</p>
                <div className="rby">
                  <span className="ra" style={{ background: rev.bg }}>
                    {rev.name.slice(0, 2)}
                  </span>
                  <div>
                    <b>{rev.name}</b>
                    <span>{rev.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Row 2 (Reverse) */}
          <div className="rrow rev">
            {[
              {
                stars: "★★★★★",
                text: "Customer service helped me set up in 5 minutes over WhatsApp. Best payment software in Bangladesh.",
                textNode: <>"Customer service helped me set up in <span className="hl-green">5 minutes</span> over WhatsApp. Best payment software in Bangladesh."</>,
                name: "Farhan I.",
                role: "Electronics Merchant",
                bg: "#12b56a"
              },
              {
                stars: "★★★★★",
                text: "Our WooCommerce website now confirms payments in 0.1s. Abandoned carts dropped by 40%.",
                textNode: <>"Our WooCommerce website now confirms payments in <span className="hl-green">0.1s</span>. Abandoned carts dropped by <span className="hl-underline">40%</span>."</>,
                name: "Anika S.",
                role: "Beauty Brand Founder",
                bg: "#E2136E"
              },
              {
                stars: "★★★★★",
                text: "The talking voice alert on our shop counter makes customers smile and stops all scam attempts.",
                textNode: <>"The <span className="hl-green">talking voice alert</span> on our shop counter makes customers smile and stops all scam attempts."</>,
                name: "Rakib H.",
                role: "Retail Shopkeeper",
                bg: "#0284c7"
              },
              {
                stars: "★★★★★",
                text: "I run online courses. Students pay on bKash and get access instantly. No manual approval needed.",
                textNode: <>"I run online courses. Students pay on bKash and get access <span className="hl-underline">instantly</span>. No manual approval needed."</>,
                name: "Jannat A.",
                role: "Course Creator",
                bg: "#F7941D"
              },
              {
                stars: "★★★★★",
                text: "0% commission is why I switched. I save more than ৳15,000 every month in gateway fees.",
                textNode: <>"<span className="hl-green">0% commission</span> is why I switched. I save more than <span className="hl-underline">৳15,000 every month</span> in gateway fees."</>,
                name: "Kazi S.",
                role: "E-commerce Founder",
                bg: "#8C3494"
              },
              {
                stars: "★★★★★",
                text: "Customer service helped me set up in 5 minutes over WhatsApp. Best payment software in Bangladesh.",
                textNode: <>"Customer service helped me set up in <span className="hl-green">5 minutes</span> over WhatsApp. Best payment software in Bangladesh."</>,
                name: "Farhan I.",
                role: "Electronics Merchant",
                bg: "#12b56a"
              }
            ].map((rev, i) => (
              <div key={i} className="rcard">
                <div className="stars">{rev.stars}</div>
                <p>{rev.textNode || `"${rev.text}"`}</p>
                <div className="rby">
                  <span className="ra" style={{ background: rev.bg }}>
                    {rev.name.slice(0, 2)}
                  </span>
                  <div>
                    <b>{rev.name}</b>
                    <span>{rev.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        SECTION 6: COMMON QUESTIONS / FAQ (.sec-soft -> SOFT TINT SECTION!)
        Alternating contrast: Dark -> Soft!
        ========================================================================
      */}
      <section className="sec-soft py-24" id="faq">
        <div className="wrap">
          <div className="head ctr">
            <span className="kicker">FAQ</span>
            <h2 className="jak text-[#0a1310]">
              Common <span className="g">questions</span>, answered simply
            </h2>
          </div>

          <div className="faq">
            <details className="qa" open>
              <summary>
                Is Payviro easy to use if I know nothing about technology?
                <span className="pl"></span>
              </summary>
              <div className="ans">
                Yes! <span className="hl-green font-semibold">No programming or computer skills</span> required. If you know how to download an app on your Android phone, you are ready. Our team will even guide you step-by-step for free.
              </div>
            </details>

            <details className="qa">
              <summary>
                How does it stop fake screenshots and fake SMS?
                <span className="pl"></span>
              </summary>
              <div className="ans">
                Scammers use photo editors or fake SMS apps to make receipts look real. But Payviro <span className="hl-underline">never trusts screenshots</span>! It checks your phone's real bank balance and real SMS from 16247 or 16167. If the money did not arrive in your real balance, the order is <span className="hl-green font-bold">blocked immediately</span>.
              </div>
            </details>

            <details className="qa">
              <summary>
                Can I use my normal personal bKash or Nagad SIM?
                <span className="pl"></span>
              </summary>
              <div className="ans">
                Yes! You do <span className="hl-underline">NOT need expensive merchant accounts</span>, trade licenses, or thousands of Taka in setup fees. Your <span className="hl-green font-semibold">personal SIM card</span> in any Android phone works 100% perfectly.
              </div>
            </details>

            <details className="qa">
              <summary>
                Do you take any percentage or commission from my sales?
                <span className="pl"></span>
              </summary>
              <div className="ans">
                <span className="hl-green font-bold">0% commission!</span> Regular payment gateways charge 1.5% to 3.0% on every single Taka you make. With Payviro, <span className="hl-underline">100% of your money</span> goes straight into your personal wallet. You only pay a small flat subscription.
              </div>
            </details>

            <details className="qa">
              <summary>
                What kind of phone do I need?
                <span className="pl"></span>
              </summary>
              <div className="ans">
                <span className="hl-green font-semibold">Any cheap Android phone</span> running Android 8 or higher. You can use an old Walton, Symphony, Samsung, or Xiaomi phone sitting in your drawer. It stays on your desk and works silently.
              </div>
            </details>

            <details className="qa">
              <summary>
                How fast is the verification?
                <span className="pl"></span>
              </summary>
              <div className="ans">
                In <span className="hl-green font-bold">less than 1 second</span>! The instant your telecom provider delivers the payment SMS to your phone, Payviro detects it and approves the order. <span className="hl-underline">Faster than you can blink</span>.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        SECTION 7: FINAL CALL TO ACTION CARD (.sec-light WITH GREEN GRADIENT)
        ========================================================================
      */}
      <section className="sec-light py-20">
        <div className="wrap">
          <div className="cta">
            <i className="orb o1"></i>
            <i className="orb o2"></i>
            <i className="orb o3"></i>

            <h2 className="jak">Stop losing money to <span className="hl-underline">fake payments</span> today</h2>
            <p>
              Join hundreds of smart Bangladeshi sellers who sleep peacefully.
              Your 14-day free trial takes under 2 minutes to start.
            </p>

            <Link to="/register" className="btn btn-white btn-lg">
              <Zap className="w-4 h-4 fill-current text-[#0a8f52]" />
              <span>Start Your Free Trial</span>
            </Link>

            <span className="handle">
              No credit card required · Free 2-minute setup · Cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        SECTION 8: PROFESSIONAL FOOTER (.sec-dark)
        ========================================================================
      */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            {/* Brand & Mission */}
            <div>
              <Link to="/" className="brand">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#37e58a] via-[#12b56a] to-[#0a8f52] flex items-center justify-center shadow-lg shadow-[#12b56a]/30">
                  <ShieldCheck className="w-4.5 h-4.5 text-white stroke-[2.4]" />
                </span>
                <b className="jak text-white text-lg">Payviro BD</b>
              </Link>
              <p className="foot-about">
                The #1 automated payment verification tool in Bangladesh.
                Protects sellers from fake bKash, Nagad, and Rocket screenshots with 0% commission.
              </p>
              <span className="foot-note">
                <i></i>
                Verification Engine Online 24/7
              </span>
            </div>

            {/* Links Column 1 */}
            <div className="foot-col">
              <h4>Supported Apps</h4>
              <a href="#platforms">bKash Verification</a>
              <a href="#platforms">Nagad Verification</a>
              <a href="#platforms">Rocket DBBL Verification</a>
              <a href="#platforms">Upay & Bank Transfers</a>
              <a href="#platforms">Counter Talking Alerts</a>
            </div>

            {/* Links Column 2 */}
            <div className="foot-col">
              <h4>Quick Links</h4>
              <Link to="/login">Merchant Dashboard</Link>
              <Link to="/register">Create Free Account</Link>
              <a href="#guides">Step-by-Step Guides</a>
              <a href="#faq">Common Questions (FAQ)</a>
              <Link to="/docs">Developer API</Link>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} Payviro BD. All payments verified in real-time.</span>
            <span className="text-[#93a29a]">Made with ❤️ for Bangladeshi shop owners & sellers</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
