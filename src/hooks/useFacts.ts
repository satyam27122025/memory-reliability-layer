import { useCallback, useEffect, useRef, useState } from 'react';
import { listFacts } from '../services/memoryApi';
import type { Fact } from '../types/facts';

export function useFacts() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const requestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);

  const refresh = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const nextFacts = await listFacts({ signal: controller.signal });
      if (!controller.signal.aborted && mountedRef.current) {
        setFacts(nextFacts);
      }
    } catch (requestError) {
      if (!controller.signal.aborted && mountedRef.current) {
        setFacts([]);
        setError(requestError);
      }
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    const onChanged = () => { void refresh(); };
    window.addEventListener('memory:facts-changed', onChanged);
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      window.removeEventListener('memory:facts-changed', onChanged);
    };
  }, [refresh]);

  return { facts, loading, error, refresh };
}
