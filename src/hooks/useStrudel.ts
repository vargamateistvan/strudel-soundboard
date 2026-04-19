import { useRef, useCallback, useEffect, useState } from "react";

let strudelReady: Promise<void> | null = null;
let evaluateFn: ((code: string) => Promise<void>) | null = null;
let hushFn: (() => void) | null = null;

async function ensureStrudel() {
  if (!strudelReady) {
    strudelReady = (async () => {
      // @ts-expect-error — @strudel/web injects globals
      const mod = await import("@strudel/web");
      await mod.initStrudel();
      evaluateFn = mod.evaluate;
      hushFn = mod.hush;
      // Load default drum samples from tidal-drum-machines
      await mod.samples("github:tidalcycles/dirt-samples");
    })();
  }
  await strudelReady;
}

export function useStrudel() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const initedRef = useRef(false);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    // Start init on first user interaction (AudioContext needs gesture)
    const initOnGesture = () => {
      ensureStrudel()
        .then(() => setReady(true))
        .catch((err) => console.error("Failed to initialize Strudel:", err));
      window.removeEventListener("click", initOnGesture);
      window.removeEventListener("keydown", initOnGesture);
    };
    window.addEventListener("click", initOnGesture);
    window.addEventListener("keydown", initOnGesture);
    return () => {
      window.removeEventListener("click", initOnGesture);
      window.removeEventListener("keydown", initOnGesture);
    };
  }, []);

  const play = useCallback(async (code: string) => {
    if (!code.trim()) return;
    try {
      await ensureStrudel();
      setReady(true);
      await evaluateFn!(code);
      setIsPlaying(true);
    } catch (err) {
      console.error("Strudel play error:", err);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      if (hushFn) hushFn();
    } catch {
      // ignore
    }
    setIsPlaying(false);
  }, []);

  return { play, stop, isPlaying, ready };
}
