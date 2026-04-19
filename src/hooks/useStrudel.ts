import { useRef, useCallback, useEffect, useState } from "react";

let strudelReady: Promise<void> | null = null;
let evaluateFn: ((code: string) => Promise<void>) | null = null;
let hushFn: (() => void) | null = null;
let getAudioContextFn: (() => AudioContext) | null = null;

/**
 * Unlock the AudioContext for iOS Safari.
 * Must be called synchronously within a user-gesture handler.
 * Plays a silent buffer + resumes the context.
 */
export function unlockAudio() {
  if (!getAudioContextFn) return;
  const ctx = getAudioContextFn();
  // Play a 1-sample silent buffer to fully unlock iOS audio output
  try {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // ignore — context may not support createBuffer yet
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

async function ensureStrudel() {
  if (!strudelReady) {
    strudelReady = (async () => {
      // @ts-expect-error — @strudel/web injects globals
      const mod = await import("@strudel/web");
      await mod.initStrudel();
      evaluateFn = mod.evaluate;
      hushFn = mod.hush;
      getAudioContextFn = mod.getAudioContext;
      // Load default drum samples from tidal-drum-machines
      await mod.samples("github:tidalcycles/dirt-samples");

      // Inline piano samples (Salamander Grand Piano via GitHub — avoids CORS)
      await mod.samples(
        {
          piano: {
            A0: "A0v8.mp3",
            C1: "C1v8.mp3",
            Ds1: "Ds1v8.mp3",
            Fs1: "Fs1v8.mp3",
            A1: "A1v8.mp3",
            C2: "C2v8.mp3",
            Ds2: "Ds2v8.mp3",
            Fs2: "Fs2v8.mp3",
            A2: "A2v8.mp3",
            C3: "C3v8.mp3",
            Ds3: "Ds3v8.mp3",
            Fs3: "Fs3v8.mp3",
            A3: "A3v8.mp3",
            C4: "C4v8.mp3",
            Ds4: "Ds4v8.mp3",
            Fs4: "Fs4v8.mp3",
            A4: "A4v8.mp3",
            C5: "C5v8.mp3",
            Fs5: "Fs5v8.mp3",
            A5: "A5v8.mp3",
            C6: "C6v8.mp3",
            Ds6: "Ds6v8.mp3",
            Fs6: "Fs6v8.mp3",
            A6: "A6v8.mp3",
            C7: "C7v8.mp3",
            Ds7: "Ds7v8.mp3",
            Fs7: "Fs7v8.mp3",
            A7: "A7v8.mp3",
            C8: "C8v8.mp3",
          },
        },
        "https://raw.githubusercontent.com/felixroos/dough-samples/main/piano/",
      );

      // Inline select VCSL instruments (GitHub raw — avoids CORS)
      const vcslBase =
        "https://raw.githubusercontent.com/sgossner/VCSL/master/";
      await mod.samples(
        {
          glockenspiel: {
            C5: "Idiophones/Struck%20Idiophones/Glockenspiel/glock_soft_C5_02.wav",
            C6: "Idiophones/Struck%20Idiophones/Glockenspiel/glock_soft_C6_01.wav",
            C7: "Idiophones/Struck%20Idiophones/Glockenspiel/glock_soft_C7_03.wav",
            G4: "Idiophones/Struck%20Idiophones/Glockenspiel/glock_soft_G4_01.wav",
            G5: "Idiophones/Struck%20Idiophones/Glockenspiel/glock_soft_G5_01.wav",
            G6: "Idiophones/Struck%20Idiophones/Glockenspiel/glock_soft_G6_01.wav",
          },
          marimba: {
            B2: "Idiophones/Struck%20Idiophones/Marimba/Marimba_hit_Outrigger_B2_soft_01.wav",
            B4: "Idiophones/Struck%20Idiophones/Marimba/Marimba_hit_Outrigger_B4_soft_01.wav",
            C2: "Idiophones/Struck%20Idiophones/Marimba/Marimba_hit_Outrigger_C2_soft_01.wav",
            C4: "Idiophones/Struck%20Idiophones/Marimba/Marimba_hit_Outrigger_C4_soft_01.wav",
            C6: "Idiophones/Struck%20Idiophones/Marimba/Marimba_hit_Outrigger_C6_soft_01.wav",
            F1: "Idiophones/Struck%20Idiophones/Marimba/Marimba_hit_Outrigger_F1_soft_01.wav",
            F3: "Idiophones/Struck%20Idiophones/Marimba/Marimba_hit_Outrigger_F3_soft_01.wav",
            F5: "Idiophones/Struck%20Idiophones/Marimba/Marimba_hit_Outrigger_F5_soft_01.wav",
            G2: "Idiophones/Struck%20Idiophones/Marimba/Marimba_hit_Outrigger_G2_soft_01.wav",
            G4: "Idiophones/Struck%20Idiophones/Marimba/Marimba_hit_Outrigger_G4_soft_01.wav",
          },
          harp: {
            A2: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_A2_mf1.wav",
            A4: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_A4_mf1.wav",
            A6: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_A6_mf1.wav",
            B1: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_B1_mf1.wav",
            B3: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_B3_mf1.wav",
            B5: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_B5_mf1.wav",
            C3: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_C3_mf3.wav",
            C5: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_C5_mf1.wav",
            D2: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_D2_mf1.wav",
            D4: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_D4_mf1.wav",
            D6: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_D6_mf1.wav",
            E1: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_E1_f1.wav",
            E3: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_E3_mf1.wav",
            E5: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_E5_mf1.wav",
            F2: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_F2_mf1.wav",
            F4: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_F4_mf1.wav",
            F6: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_F6_mf1.wav",
            G1: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_G1_mp1.wav",
            G3: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_G3_mf1.wav",
            G5: "Chordophones/Composite Chordophones/Concert Harp/KSHarp_G5_mf1.wav",
          },
          kalimba: {
            A4: "Idiophones/Plucked%20Idiophones/Kalimba%2C%20Kenya/Mbira6_Normal_MainSpirit_A4_k1_vl3_rr2.wav",
            B2: "Idiophones/Plucked%20Idiophones/Kalimba%2C%20Kenya/Mbira6_Normal_MainSpirit_B2_k8_vl3_rr2.wav",
            B3: "Idiophones/Plucked%20Idiophones/Kalimba%2C%20Kenya/Mbira6_Normal_MainSpirit_B3_k3_vl3_rr2.wav",
            B4: "Idiophones/Plucked%20Idiophones/Kalimba%2C%20Kenya/Mbira6_Normal_MainSpirit_B4_k15_vl3_rr2.wav",
            "C#3":
              "Idiophones/Plucked%20Idiophones/Kalimba%2C%20Kenya/Mbira6_Normal_MainSpirit_C%233_k7_vl3_rr2.wav",
            "C#4":
              "Idiophones/Plucked%20Idiophones/Kalimba%2C%20Kenya/Mbira6_Normal_MainSpirit_C%234_k2_vl3_rr2.wav",
            "D#3":
              "Idiophones/Plucked%20Idiophones/Kalimba%2C%20Kenya/Mbira6_Normal_MainSpirit_D%233_k9_vl3_rr2.wav",
            "D#4":
              "Idiophones/Plucked%20Idiophones/Kalimba%2C%20Kenya/Mbira6_Normal_MainSpirit_D%234_k13_vl3_rr2.wav",
            "F#3":
              "Idiophones/Plucked%20Idiophones/Kalimba%2C%20Kenya/Mbira6_Normal_MainSpirit_F%233_k5_vl3_rr2.wav",
            "F#4":
              "Idiophones/Plucked%20Idiophones/Kalimba%2C%20Kenya/Mbira6_Normal_MainSpirit_F%234_k14_vl3_rr2.wav",
            "G#3":
              "Idiophones/Plucked%20Idiophones/Kalimba%2C%20Kenya/Mbira6_Normal_MainSpirit_G%233_k4_vl3_rr2.wav",
          },
          guitar: {
            D2: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str1_Main_D2_vl2_rr1.wav",
            E2: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str1_Main_E2_vl2_rr1.wav",
            "F#2":
              "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str1_Main_F%232_vl2_rr1.wav",
            G2: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str1_Main_G2_vl2_rr1.wav",
            A2: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str2_Main_A2_vl2_rr1.wav",
            B2: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str2_Main_B2_vl2_rr1.wav",
            "C#3":
              "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str2_Main_C%233_vl2_rr1.wav",
            D3: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str2_Main_D3_vl2_rr1.wav",
            E3: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_E3_vl2_rr1.wav",
            "F#3":
              "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_F%233_vl2_rr1.wav",
            G3: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_G3_vl2_rr1.wav",
            A3: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_A3_vl2_rr1.wav",
            B3: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_B3_vl2_rr1.wav",
            "C#4":
              "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_C%234_vl2_rr1.wav",
            D4: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_D4_vl2_rr1.wav",
            E4: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_E4_vl2_rr1.wav",
            "F#4":
              "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_F%234_vl2_rr1.wav",
            G4: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_G4_vl1_rr1.wav",
            A4: "Chordophones/Composite%20Chordophones/Strumstick/Finger/Strumstick_Finger_Str3_Main_A4_vl2_rr1.wav",
          },
        },
        vcslBase,
      );
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
      if (!evaluateFn) {
        await ensureStrudel();
        setReady(true);
      }
      // Unlock AudioContext for iOS Safari (silent buffer + resume)
      unlockAudio();
      currentCodeRef.current = code;
      setIsPlaying(true);
      evaluateFn!(code).catch((err: unknown) =>
        console.error("Strudel evaluate error:", err),
      );
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
      // Unlock AudioContext for iOS Safari
      unlockAudio();
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
