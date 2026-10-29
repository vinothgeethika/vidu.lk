import { useCallback, useState } from 'react';

export interface HistoryControls<T> {
  state: T;
  set: (next: T | ((prev: T) => T), recordHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  reset: (initial: T) => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
}

export function useHistory<T>(initialState: T, maxHistory = 35): HistoryControls<T> {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<T[]>([]);

  const set = useCallback(
    (next: T | ((prev: T) => T), recordHistory = true) => {
      setPresent((curr) => {
        const resolved =
          typeof next === 'function' ? (next as (prev: T) => T)(curr) : next;
        if (Object.is(resolved, curr)) return curr;

        if (recordHistory) {
          setPast((prevPast) => {
            const updated = [...prevPast, curr];
            return updated.length > maxHistory
              ? updated.slice(updated.length - maxHistory)
              : updated;
          });
          setFuture([]);
        }
        return resolved;
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const nextPast = prevPast.slice(0, prevPast.length - 1);
      setPresent((curr) => {
        setFuture((prevFuture) => [curr, ...prevFuture]);
        return previous;
      });
      return nextPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const remainingFuture = prevFuture.slice(1);
      setPresent((curr) => {
        setPast((prevPast) => [...prevPast, curr]);
        return next;
      });
      return remainingFuture;
    });
  }, []);

  const reset = useCallback((initial: T) => {
    setPast([]);
    setPresent(initial);
    setFuture([]);
  }, []);

  return {
    state: present,
    set,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    historyLength: past.length,
  };
}
