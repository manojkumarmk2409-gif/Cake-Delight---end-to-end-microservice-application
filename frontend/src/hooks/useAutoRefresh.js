import { useEffect, useRef } from 'react';

export default function useAutoRefresh(callback, delay = 30000, enabled = true) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled) return undefined;

        const tick = () => {
            if (typeof callbackRef.current === 'function') {
                callbackRef.current();
            }
        };

        const interval = setInterval(tick, delay);
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                tick();
            }
        };

        window.addEventListener('focus', tick);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', tick);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [delay, enabled]);
}
