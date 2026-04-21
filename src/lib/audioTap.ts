/**
 * Shared monkey-patch for AudioNode.prototype.connect.
 * Both useAnalyser and useRecorder register tap targets here
 * so they don't clobber each other's patches.
 */

const tapTargets = new Set<AudioNode>();
const connectedSources = new Set<WeakRef<AudioNode>>();
let originalConnect: typeof AudioNode.prototype.connect | null = null;
let patchedDestination: AudioDestinationNode | null = null;

/**
 * Install the monkey-patch (idempotent).
 * Must be called with the Strudel AudioContext before any tap targets are added.
 */
export function installAudioTap(ctx: AudioContext): void {
  if (originalConnect && patchedDestination === ctx.destination) return;

  // If we already patched for a different context, restore first
  if (originalConnect) {
    AudioNode.prototype.connect = originalConnect;
  }

  originalConnect = AudioNode.prototype.connect;
  patchedDestination = ctx.destination;
  connectedSources.clear();

  const saved = originalConnect;
  const dest = patchedDestination;

  AudioNode.prototype.connect = function (this: AudioNode, ...args: unknown[]) {
    const result = (saved as Function).apply(this, args);
    if (args[0] === dest) {
      connectedSources.add(new WeakRef(this));
      for (const target of tapTargets) {
        try {
          (saved as Function).call(this, target);
        } catch {
          // ignore duplicate connections
        }
      }
    }
    return result;
  } as typeof AudioNode.prototype.connect;
}

/** Add a node that will receive a copy of all audio going to ctx.destination. */
export function addTapTarget(node: AudioNode): void {
  tapTargets.add(node);
  // Retroactively connect sources that already connected to destination
  if (originalConnect) {
    for (const ref of connectedSources) {
      const source = ref.deref();
      if (source) {
        try {
          (originalConnect as Function).call(source, node);
        } catch {
          // ignore — node may have been disposed
        }
      }
    }
  }
}

/** Remove a previously added tap target. */
export function removeTapTarget(node: AudioNode): void {
  tapTargets.delete(node);
}
