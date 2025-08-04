import { useState, useEffect, useCallback } from 'react';
import * as db from '../services/db';

// This hook now uses IndexedDB instead of localStorage to persist state.
// The name is kept for compatibility with existing code to minimize changes.
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);

  // Load from DB on mount
  useEffect(() => {
    let isMounted = true;
    db.get<T>(key).then(val => {
      if (isMounted) {
        if (val !== undefined) {
          setValue(val);
        } else {
          // If nothing in DB, store initialValue
          db.set(key, initialValue);
        }
      }
    });
    return () => { isMounted = false; };
  }, [key]); // Intentionally not including initialValue to avoid re-writing on every render.

  const setStoredValue = useCallback<React.Dispatch<React.SetStateAction<T>>>((newValue) => {
    // This allows for function updates, e.g., setPeople(prev => ...)
    setValue(currentVal => {
      const valueToStore = newValue instanceof Function ? newValue(currentVal) : newValue;
      db.set(key, valueToStore);
      return valueToStore;
    });
  }, [key]);
  
  return [value, setStoredValue];
}

export default useLocalStorage;
