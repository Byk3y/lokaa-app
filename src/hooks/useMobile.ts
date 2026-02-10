import { useState, useEffect } from 'react';

/**
 * Centralized hook for mobile device detection.
 * Replaces ad-hoc regex checks previously scattered across components.
 */
export function useMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(isMobileDevice);
        };

        checkMobile();

        // In case the device changes (e.g., resizing in dev tools)
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}
