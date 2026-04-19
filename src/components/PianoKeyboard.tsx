import { useCallback } from "react";

interface PianoKeyboardProps {
  notes: readonly string[];
  onKeyClick: (note: string) => void;
  activeNotes?: Set<string>;
  color?: string;
}

/** Which note names are black keys (accidentals). */
function isBlackKey(note: string): boolean {
  const name = note.replace(/\d+$/, "");
  return name.length > 1;
}

/**
 * Horizontal piano keyboard rendered left-to-right (low → high).
 * Notes are displayed reversed since the grid goes C5 (top) → C3 (bottom),
 * but a keyboard should go C3 (left) → C5 (right).
 */
export function PianoKeyboard({
  notes,
  onKeyClick,
  activeNotes,
  color,
}: PianoKeyboardProps) {
  // Reverse: grid has high notes first, keyboard should go low→high
  const orderedNotes = [...notes].reverse();

  const handleClick = useCallback(
    (note: string) => {
      onKeyClick(note);
    },
    [onKeyClick],
  );

  return (
    <div className="piano-keyboard">
      <div className="piano-keyboard-keys">
        {orderedNotes.map((note) => {
          const black = isBlackKey(note);
          const active = activeNotes?.has(note);
          const isC = /^C\d+$/.test(note);
          return (
            <button
              key={note}
              className={[
                "piano-key",
                black ? "piano-key-black" : "piano-key-white",
                active ? "piano-key-active" : "",
                isC ? "piano-key-c" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                active && color
                  ? ({ "--key-active-color": color } as React.CSSProperties)
                  : undefined
              }
              onClick={() => handleClick(note)}
              title={note}
            >
              {isC ? <span className="piano-key-label">{note}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
