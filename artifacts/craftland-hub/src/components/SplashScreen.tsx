import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "cl_hub_splash_seen";

function playWhoosh(ctx: AudioContext) {
  const bufferSize = ctx.sampleRate * 0.55;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(600, ctx.currentTime);
  bandpass.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.45);
  bandpass.Q.value = 0.9;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.38, ctx.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.52);

  source.connect(bandpass);
  bandpass.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(ctx.currentTime);
  source.stop(ctx.currentTime + 0.56);
}

function playBassThud(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(160, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.18);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.72, ctx.currentTime + 0.012);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

  const distortion = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = ((Math.PI + 180) * x) / (Math.PI + 180 * Math.abs(x));
  }
  distortion.curve = curve;

  osc.connect(distortion);
  distortion.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
}

export function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    try {
      return !sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });
  const [hubVisible, setHubVisible] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!visible) return;

    const getCtx = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
      }
      return audioCtxRef.current;
    };

    const logoTimer = setTimeout(() => {
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") ctx.resume().then(() => playWhoosh(ctx));
        else playWhoosh(ctx);
      } catch {}
    }, 60);

    const hubTimer = setTimeout(() => {
      setHubVisible(true);
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") ctx.resume().then(() => playBassThud(ctx));
        else playBassThud(ctx);
      } catch {}
    }, 280);

    const exitTimer = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {}
    }, 1800);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(hubTimer);
      clearTimeout(exitTimer);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "#000000" }}
        >
          <motion.div
            initial={{ scale: 0.68, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              scale: { type: "spring", stiffness: 380, damping: 18 },
              opacity: { duration: 0.22 },
              y: { type: "spring", stiffness: 380, damping: 18 },
            }}
            className="flex items-center select-none"
          >
            <span
              className="text-5xl md:text-7xl font-extrabold text-white tracking-tight"
              style={{ fontFamily: "'Outfit', 'Inter', system-ui, sans-serif" }}
            >
              CraftLand
            </span>

            <AnimatePresence>
              {hubVisible && (
                <motion.span
                  key="hub-box"
                  initial={{ opacity: 0, scale: 0.6, x: -18 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 16,
                  }}
                  className="relative ml-3 overflow-hidden rounded-[14px] text-5xl md:text-7xl font-extrabold text-black tracking-tight"
                  style={{
                    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
                    background: "#FF9900",
                    paddingInline: "0.55rem",
                    paddingBlock: "0.08rem",
                    lineHeight: 1.15,
                  }}
                >
                  <GlitchLayer />
                  <ShineLayer />
                  <span className="relative z-10">Hub</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.35, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="absolute bottom-[30%] text-[10px] tracking-[0.42em] text-white/35 uppercase"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            Free Fire CraftLand Community
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GlitchLayer() {
  return (
    <motion.span
      aria-hidden
      className="absolute inset-0 z-0 rounded-[14px]"
      style={{ background: "#FF9900", mixBlendMode: "screen", opacity: 0 }}
      animate={{
        opacity: [0, 0, 0.55, 0, 0.3, 0, 0],
        x: [0, 0, -3, 3, -1, 0, 0],
        scaleX: [1, 1, 1.012, 0.994, 1, 1, 1],
      }}
      transition={{
        delay: 0.08,
        duration: 0.38,
        ease: "easeInOut",
        times: [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1],
      }}
    />
  );
}

function ShineLayer() {
  return (
    <motion.span
      aria-hidden
      className="absolute inset-y-0 z-[5]"
      style={{
        left: 0,
        width: "55%",
        background:
          "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.58) 50%, transparent 75%)",
        skewX: "-18deg",
        pointerEvents: "none",
      }}
      initial={{ x: "-120%" }}
      animate={{ x: "230%" }}
      transition={{ delay: 0.22, duration: 0.5, ease: "easeInOut" }}
    />
  );
}
