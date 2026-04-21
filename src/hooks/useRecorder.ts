import { useState, useRef, useCallback, useEffect } from "react";
import lameAllSource from "lamejs/lame.all.js?raw";
import {
  installAudioTap,
  addTapTarget,
  removeTapTarget,
} from "../lib/audioTap";

function floatTo16Bit(f: number): number {
  const v = Math.max(-1, Math.min(1, f));
  return v < 0 ? v * 0x8000 : v * 0x7fff;
}

// Load lamejs by evaluating the self-contained bundle in a single scope
// This avoids Vite's CJS transform which breaks internal MPEGMode references
let _lame: {
  Mp3Encoder: new (
    channels: number,
    sampleRate: number,
    bitRate: number,
  ) => any;
} | null = null;
function getLamejs() {
  if (!_lame) {
    const fn = new Function(lameAllSource + "\nreturn lamejs;");
    _lame = fn();
  }
  return _lame!;
}

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const startRecording = useCallback(async () => {
    // @ts-expect-error — getAudioContext is exported but not typed
    const { getAudioContext } = await import("@strudel/web");
    const ctx = getAudioContext() as AudioContext;
    ctxRef.current = ctx;

    // Create a MediaStreamDestination to capture all audio
    const dest = ctx.createMediaStreamDestination();
    destRef.current = dest;

    // Register the capture destination as a tap target
    installAudioTap(ctx);
    addTapTarget(dest);

    // Use MediaRecorder to capture the stream
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(dest.stream);
    recorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.start(100); // collect data every 100ms
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);

    const mediaRecorder = recorderRef.current;
    const ctx = ctxRef.current;

    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      console.warn("No active recorder.");
      return;
    }

    // Wait for the recorder to finish
    const recordingDone = new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => resolve();
    });
    mediaRecorder.stop();
    await recordingDone;
    recorderRef.current = null;

    // Remove the tap target
    const dest = destRef.current;
    destRef.current = null;
    if (dest) removeTapTarget(dest);

    const chunks = chunksRef.current;
    chunksRef.current = [];

    if (chunks.length === 0) {
      console.warn("No audio was captured during recording.");
      return;
    }

    // Decode captured audio to PCM using Web Audio API
    const recordedBlob = new Blob(chunks, { type: chunks[0].type });
    const arrayBuffer = await recordedBlob.arrayBuffer();

    let audioBuffer: AudioBuffer;
    try {
      // Use offline context for decoding to avoid issues with suspended contexts
      const decodeCtx = ctx ?? new AudioContext();
      audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.error("Failed to decode recorded audio:", err);
      // Fallback: download as webm
      downloadBlob(recordedBlob, "audio/webm", "webm");
      return;
    }

    const sampleRate = audioBuffer.sampleRate;
    const leftPCM = audioBuffer.getChannelData(0);
    const rightPCM =
      audioBuffer.numberOfChannels > 1
        ? audioBuffer.getChannelData(1)
        : leftPCM;
    const totalLen = leftPCM.length;

    if (totalLen === 0) {
      console.warn("Decoded audio is empty.");
      return;
    }

    // Encode to MP3 using lamejs
    const lame = getLamejs();
    const mp3enc = new lame.Mp3Encoder(2, sampleRate, 192);
    const blockSize = 1152;
    const mp3Bufs: Uint8Array[] = [];

    for (let i = 0; i < totalLen; i += blockSize) {
      const end = Math.min(i + blockSize, totalLen);
      const leftBlock = new Int16Array(end - i);
      const rightBlock = new Int16Array(end - i);
      for (let j = i; j < end; j++) {
        leftBlock[j - i] = floatTo16Bit(leftPCM[j]);
        rightBlock[j - i] = floatTo16Bit(rightPCM[j]);
      }
      const buf = mp3enc.encodeBuffer(leftBlock, rightBlock);
      if (buf.length > 0) mp3Bufs.push(new Uint8Array(buf));
    }
    const flush = mp3enc.flush();
    if (flush.length > 0) mp3Bufs.push(new Uint8Array(flush));

    if (mp3Bufs.length === 0) {
      console.warn("MP3 encoding produced no output.");
      return;
    }

    const mp3Blob = new Blob(mp3Bufs as BlobPart[], { type: "audio/mpeg" });
    downloadBlob(mp3Blob, "audio/mpeg", "mp3");
  }, []);

  // Cleanup on unmount if still recording
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (destRef.current) removeTapTarget(destRef.current);
    };
  }, []);

  return { isRecording, startRecording, stopRecording };
}

function downloadBlob(blob: Blob, _mimeType: string, ext: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.style.display = "none";
  const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  a.download = `strudel-recording-${ts}.${ext}`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 5000);
}
