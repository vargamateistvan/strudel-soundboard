import { useEffect, useState } from "react";

interface SnackbarProps {
  message: string | null;
  duration?: number;
  onClose: () => void;
}

export function Snackbar({ message, duration = 5000, onClose }: SnackbarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // wait for fade-out animation
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`snackbar ${visible ? "snackbar-visible" : ""}`}>
      <span className="snackbar-message">{message}</span>
      <button
        className="snackbar-close"
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
