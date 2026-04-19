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
  const currentCodeRef = useRef<string | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Initialize eagerly — AudioContext will auto-resume on first interaction
    ensureStrudel()
      .then(() => setReady(true))
      .catch((err) => console.error("Failed to initialize Strudel:", err));
  }, []);

  const play = useCallback(async (code: string) => {
    if (!code.trim()) return;
    try {
      await ensureStrudel();
      setReady(true);
      currentCodeRef.current = code;
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
    currentCodeRef.current = null;
    setIsPlaying(false);
  }, []);

  const preview = useCallback(async (code: string) => {
    try {
      await ensureStrudel();
      setReady(true);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      const wasPlaying = currentCodeRef.current;
      await evaluateFn!(code);
      previewTimerRef.current = setTimeout(async () => {
        previewTimerRef.current = null;
        if (wasPlaying) {
          await evaluateFn!(wasPlaying);
        } else {
          hushFn?.();
        }
      }, 500);
    } catch (err) {
      console.error("Preview error:", err);
    }
  }, []);

  return { play, stop, preview, isPlaying, ready };
}
