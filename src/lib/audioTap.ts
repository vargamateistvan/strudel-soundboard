/**
 * Shared monkey-patch for AudioNode.prototype.connect.
 * Both useAnalyser and useRecorder register tap targets here
 * so they don't clobber each other's patches.
 */

const tapTargets = new Set<AudioNode>();
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

  const saved = originalConnect;
  const dest = patchedDestination;

  AudioNode.prototype.connect = function (this: AudioNode, ...args: unknown[]) {
    const result = (saved as Function).apply(this, args);
    if (args[0] === dest) {
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
}

/** Remove a previously added tap target. */
export function removeTapTarget(node: AudioNode): void {
  tapTargets.delete(node);
}
