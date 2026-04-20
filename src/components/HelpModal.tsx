interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>How to Use Strudel Soundboard</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body help-body">
          <section className="help-section">
            <h3>What is this?</h3>
            <p>
              Strudel Soundboard is a browser-based step sequencer and music
              workstation. Create drum patterns, melodies, and full arrangements
              with a visual grid — no coding needed. Everything runs in your
              browser using the{" "}
              <a href="https://strudel.cc/" target="_blank" rel="noreferrer">
                Strudel
              </a>{" "}
              live coding engine.
            </p>
          </section>

          <section className="help-section">
            <h3>Getting Started</h3>
            <ol>
              <li>
                Pick a <strong>preset</strong> from the toolbar dropdown, or
                start from scratch.
              </li>
              <li>
                Click cells in the <strong>step grid</strong> to toggle notes
                on/off. Drag to paint multiple steps.
              </li>
              <li>
                Press <strong>▶ Play</strong> (or <kbd>Space</kbd>) to hear your
                pattern.
              </li>
              <li>
                Adjust <strong>BPM</strong>, <strong>Swing</strong>, and{" "}
                <strong>Steps</strong> in the toolbar.
              </li>
            </ol>
          </section>

          <section className="help-section">
            <h3>Tracks</h3>
            <ul>
              <li>
                <strong>Add tracks</strong> with the + buttons at the bottom —
                choose drums, synth, piano, or guitar.
              </li>
              <li>
                <strong>Drum tracks</strong> have rows for each sound (bd, sd,
                hh, etc.). Add or remove rows from the track header.
              </li>
              <li>
                <strong>Melodic tracks</strong> (synth, piano, guitar) show a
                two-octave piano roll (C3–C5).
              </li>
              <li>
                <strong>Mute / Solo / Volume</strong> — use the controls in each
                track header.
              </li>
              <li>
                <strong>Drag to reorder</strong> tracks by their handle.
              </li>
              <li>
                <strong>Duplicate</strong> a track from the track menu.
              </li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Velocity</h3>
            <p>
              <strong>Scroll</strong> (mouse wheel) on an active step to change
              its velocity (1–9). Higher velocity = louder & brighter color.
            </p>
          </section>

          <section className="help-section">
            <h3>Effects & Modifiers</h3>
            <p>
              Open a track's <strong>Effects</strong> panel to add delay,
              reverb, filters (LPF/HPF), distortion, bit crush, or panning.
            </p>
            <p>
              The <strong>Modifiers</strong> panel lets you reverse playback,
              change speed (0.25×–4×), set probability, or apply every-N
              transforms.
            </p>
          </section>

          <section className="help-section">
            <h3>Pattern Tools</h3>
            <ul>
              <li>
                <strong>Copy / Paste</strong> — duplicate step patterns between
                tracks.
              </li>
              <li>
                <strong>Shift left / right</strong> — rotate the pattern.
              </li>
              <li>
                <strong>Randomize</strong> — generate random patterns with
                adjustable density.
              </li>
              <li>
                <strong>Reverse</strong> — flip the step sequence.
              </li>
              <li>
                <strong>Clear</strong> — remove all steps from a track.
              </li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Drum Banks</h3>
            <p>
              Switch drum sounds between classic machines: Roland TR-808,
              TR-909, CR-78, Akai Linn, RhythmAce, and ViscoSpaceDrum.
            </p>
          </section>

          <section className="help-section">
            <h3>Export & Import</h3>
            <ul>
              <li>
                <strong>Export</strong> your project as Strudel mini-notation
                (paste into the{" "}
                <a href="https://strudel.cc/" target="_blank" rel="noreferrer">
                  Strudel REPL
                </a>
                ) or as a standalone HTML file.
              </li>
              <li>
                <strong>Import</strong> — paste mini-notation or HTML code to
                load it back into the editor.
              </li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Save & Load</h3>
            <ul>
              <li>Projects auto-save to your browser's local storage.</li>
              <li>
                Use <strong>Save/Load</strong> to name and manage multiple
                projects, or download/upload <code>.strudel.json</code> files.
              </li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Recording</h3>
            <p>
              Hit the <strong>⏺ Record</strong> button to capture your session
              as an MP3. Press it again to stop — the file downloads
              automatically.
            </p>
          </section>

          <section className="help-section">
            <h3>Visualizer</h3>
            <p>
              The bottom panel shows real-time audio visualization. Click the
              mode buttons to switch between <strong>Bars</strong>,{" "}
              <strong>Spectrum</strong> (FFT), and <strong>Waveform</strong>.
            </p>
          </section>

          <section className="help-section">
            <h3>Keyboard Shortcuts</h3>
            <table className="help-shortcuts">
              <tbody>
                <tr>
                  <td>
                    <kbd>Space</kbd>
                  </td>
                  <td>Play / Stop</td>
                </tr>
                <tr>
                  <td>
                    <kbd>Ctrl</kbd>+<kbd>Z</kbd>
                  </td>
                  <td>Undo</td>
                </tr>
                <tr>
                  <td>
                    <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>
                  </td>
                  <td>Redo</td>
                </tr>
                <tr>
                  <td>
                    <kbd>Ctrl</kbd>+<kbd>S</kbd>
                  </td>
                  <td>Save project</td>
                </tr>
                <tr>
                  <td>
                    <kbd>1</kbd>–<kbd>9</kbd>
                  </td>
                  <td>Mute/unmute track</td>
                </tr>
                <tr>
                  <td>Scroll on step</td>
                  <td>Adjust velocity</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
