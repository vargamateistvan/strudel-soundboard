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

const WORKLET_CODE = `
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._active = true;
    this.port.onmessage = (e) => {
      if (e.data === 'stop') this._active = false;
    };
  }
  process(inputs) {
    if (!this._active) return false;
    const input = inputs[0];
    if (input && input.length > 0) {
      const left = new Float32Array(input[0]);
      const right = input.length > 1 ? new Float32Array(input[1]) : new Float32Array(input[0]);
      this.port.postMessage({ left, right }, [left.buffer, right.buffer]);
    }
    return true;
  }
}
registerProcessor('recorder-processor', RecorderProcessor);
`;

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const leftChunksRef = useRef<Float32Array[]>([]);
  const rightChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(44100);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const startRecording = useCallback(async () => {
    // @ts-expect-error — getAudioContext is exported but not typed
    const { getAudioContext } = await import("@strudel/web");
    const ctx = getAudioContext() as AudioContext;
    sampleRateRef.current = ctx.sampleRate;

    // Use MediaStreamDestination to reliably capture all audio
    const dest = ctx.createMediaStreamDestination();
    destRef.current = dest;

    // Create a secondary AudioContext to read from the MediaStreamDestination
    const streamCtx = new AudioContext({ sampleRate: ctx.sampleRate });
    streamCtxRef.current = streamCtx;
    const source = streamCtx.createMediaStreamSource(dest.stream);

    leftChunksRef.current = [];
    rightChunksRef.current = [];

    // Register the AudioWorklet processor via Blob URL
    const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
    const workletUrl = URL.createObjectURL(blob);
    await streamCtx.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    const workletNode = new AudioWorkletNode(streamCtx, "recorder-processor");
    workletNode.port.onmessage = (
      e: MessageEvent<{ left: Float32Array; right: Float32Array }>,
    ) => {
      leftChunksRef.current.push(e.data.left);
      rightChunksRef.current.push(e.data.right);
    };

    source.connect(workletNode);
    workletNode.connect(streamCtx.destination);
    workletNodeRef.current = workletNode;

    // Register the capture destination as a tap target
    installAudioTap(ctx);
    addTapTarget(dest);

    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    // Clean up AudioWorklet node
    const workletNode = workletNodeRef.current;
    if (workletNode) {
      workletNode.port.postMessage("stop");
      try {
        workletNode.disconnect();
      } catch {
        /* ignore */
      }
      workletNodeRef.current = null;
    }

    // Close the secondary AudioContext
    const streamCtx = streamCtxRef.current;
    if (streamCtx) {
      streamCtx.close().catch(() => {});
      streamCtxRef.current = null;
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

    const mp3Blob = new Blob(mp3Bufs as BlobPart[], { type: "audio/mpeg" });
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
