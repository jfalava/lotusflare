// hooks/use-key-press.ts
import { useEffect, useCallback } from "react";

type KeyPressCallback = (event: KeyboardEvent) => void;

interface KeyPressOptions {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  disabled?: boolean;
}

/**
 * A custom hook to execute a callback on a specific key press.
 * @param targetKey The key to listen for (e.g., 's', 'Enter').
 * @param callback The function to execute when the key is pressed.
 * @param options Modifier keys and disabled state.
 */
export const useKeyPress = (
  targetKey: string,
  callback: KeyPressCallback,
  options: KeyPressOptions = {},
) => {
  const {
    ctrl = false,
    alt = false,
    shift = false,
    disabled = false,
  } = options;

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === targetKey.toLowerCase() &&
        event.ctrlKey === ctrl &&
        event.altKey === alt &&
        event.shiftKey === shift
      ) {
        event.preventDefault();
        callback(event);
      }
    },
    [targetKey, callback, ctrl, alt, shift],
  );

  useEffect(() => {
    if (disabled) {
      return;
    }

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress, disabled]);
};
