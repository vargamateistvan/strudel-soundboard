import { useState, useRef, useCallback } from "react";
// @ts-expect-error — lamejs uses commonjs exports
import lamejs from "lamejs";
import {
  installAudioTap,
  addTapTarget,
  removeTapTarget,
} from "../lib/audioTap";

function floatTo16Bit(f: number): number {
  const v = Math.max(-1, Math.min(1, f));
  return v < 0 ? v * 0x8000 : v * 0x7fff;
}

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const leftChunksRef = useRef<Float32Array[]>([]);
  const rightChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(44100);
  const scriptRef = useRef<ScriptProcessorNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const startRecording = useCallback(async () => {
    // @ts-expect-error — getAudioContext is exported but not typed
    const { getAudioContext } = await import("@strudel/web");
    const ctx = getAudioContext() as AudioContext;
    sampleRateRef.current = ctx.sampleRate;

    // Use MediaStreamDestination to reliably capture all audio
    const dest = ctx.createMediaStreamDestination();
    destRef.current = dest;

    // Create a ScriptProcessorNode connected to the stream to capture raw PCM
    const streamCtx = new AudioContext({ sampleRate: ctx.sampleRate });
    const source = streamCtx.createMediaStreamSource(dest.stream);
    const processor = streamCtx.createScriptProcessor(4096, 2, 2);

    leftChunksRef.current = [];
    rightChunksRef.current = [];

    processor.onaudioprocess = (e) => {
      const left = e.inputBuffer.getChannelData(0);
      const right =
        e.inputBuffer.numberOfChannels > 1
          ? e.inputBuffer.getChannelData(1)
          : left;
      leftChunksRef.current.push(new Float32Array(left));
      rightChunksRef.current.push(new Float32Array(right));
    };

    source.connect(processor);
    processor.connect(streamCtx.destination);
    scriptRef.current = processor;

    // Register the capture destination as a tap target
    installAudioTap(ctx);
    addTapTarget(dest);

    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    // Clean up script processor
    const processor = scriptRef.current;
    if (processor) {
      processor.onaudioprocess = null;
      try {
        processor.disconnect();
      } catch {
        /* ignore */
      }
      scriptRef.current = null;
    }
    const dest = destRef.current;
    destRef.current = null;

    // Remove the capture destination from the shared audio tap
    if (dest) {
      removeTapTarget(dest);
    }

    // Merge all captured chunks
    const leftChunks = leftChunksRef.current;
    const rightChunks = rightChunksRef.current;
    leftChunksRef.current = [];
    rightChunksRef.current = [];

    if (leftChunks.length === 0) {
      console.warn("No audio was captured during recording.");
      return;
    }

    const totalLen = leftChunks.reduce((sum, c) => sum + c.length, 0);
    if (totalLen === 0) return;

    const leftPCM = new Float32Array(totalLen);
    const rightPCM = new Float32Array(totalLen);
    let offset = 0;
    for (let i = 0; i < leftChunks.length; i++) {
      leftPCM.set(leftChunks[i], offset);
      rightPCM.set(rightChunks[i] ?? leftChunks[i], offset);
      offset += leftChunks[i].length;
    }

    // Encode to MP3 using lamejs
    const sampleRate = sampleRateRef.current;
    const mp3enc = new lamejs.Mp3Encoder(2, sampleRate, 192);
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

    const mp3Blob = new Blob(mp3Bufs, { type: "audio/mpeg" });
    const url = URL.createObjectURL(mp3Blob);
    const a = document.createElement("a");
    a.href = url;
    a.style.display = "none";
    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    a.download = `strudel-recording-${ts}.mp3`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }, []);

  return { isRecording, startRecording, stopRecording };
}
