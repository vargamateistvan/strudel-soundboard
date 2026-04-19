import { useRef, useCallback, useEffect } from "react";

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

    // Tap into audio output: connect destination's stream back through the analyser
    // We use the same monkey-patch approach: insert analyser before destination
    // Simpler: create a MediaStreamDestination, connect analyser inline
    // Actually, creating a gain node as a tap is safest:
    const tap = ctx.createGain();
    tap.gain.value = 1;

    // Monkey-patch to intercept connections to ctx.destination
    const origConnect = AudioNode.prototype.connect;
    const mainDest = ctx.destination;
    AudioNode.prototype.connect = function (...args: unknown[]) {
      const result = (origConnect as Function).apply(this, args);
      if (args[0] === mainDest) {
        try {
          (origConnect as Function).call(this, analyser);
        } catch {
          // ignore duplicate connections
        }
      }
      return result;
    } as typeof AudioNode.prototype.connect;

    // Store cleanup
    analyserRef.current = analyser;
    connectedRef.current = true;
    return analyser;
  }, []);

  useEffect(() => {
    return () => {
      analyserRef.current = null;
      connectedRef.current = false;
    };
  }, []);

  return { analyser: analyserRef, connect };
}
