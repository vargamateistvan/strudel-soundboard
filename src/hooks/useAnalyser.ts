import { useRef, useCallback, useEffect } from "react";
import {
  installAudioTap,
  addTapTarget,
  removeTapTarget,
} from "../lib/audioTap";

export function useAnalyser() {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const connectedRef = useRef(false);

  const connect = useCallback(async () => {
    if (connectedRef.current && analyserRef.current) return analyserRef.current;
    // @ts-expect-error — getAudioContext is exported but not typed
    const { getAudioContext } = await import("@strudel/web");
    const ctx = getAudioContext() as AudioContext;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    installAudioTap(ctx);
    addTapTarget(analyser);

    analyserRef.current = analyser;
    connectedRef.current = true;
    return analyser;
  }, []);

  useEffect(() => {
    return () => {
      if (analyserRef.current) {
        removeTapTarget(analyserRef.current);
      }
      analyserRef.current = null;
      connectedRef.current = false;
    };
  }, []);

  return { analyser: analyserRef, connect };
}
