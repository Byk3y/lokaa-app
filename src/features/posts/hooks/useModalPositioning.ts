import { useState, useEffect, useCallback } from 'react';

interface UseModalPositioningProps {
    isOpen: boolean;
    isMobile: boolean;
}

/**
 * Hook to calculate and maintain modal position relative to the composer element.
 * Handles initial positioning on open and repositioning on window resize.
 */
export function useModalPositioning({ isOpen, isMobile }: UseModalPositioningProps) {
    const [modalPosition, setModalPosition] = useState({ top: 0 });

    const calculatePosition = useCallback(() => {
        if (!isOpen || isMobile) return;

        const composerElement = document.querySelector('[data-composer="true"]');
        if (!composerElement) return;

        const rect = composerElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const modalMinHeight = 200;
        const modalMaxHeight = viewportHeight * 0.7;
        const gap = 8;

        let topPosition = rect.top + window.scrollY;

        const availableSpaceBelow = viewportHeight - rect.top - 20;
        const availableSpaceAbove = rect.top - 20;

        if (availableSpaceBelow < modalMinHeight && availableSpaceAbove > modalMinHeight) {
            topPosition = rect.top + window.scrollY - modalMinHeight - gap;
        } else if (availableSpaceAbove < modalMinHeight && availableSpaceBelow < modalMinHeight) {
            topPosition = (viewportHeight - modalMaxHeight) / 2 + window.scrollY;
        }

        setModalPosition({ top: Math.max(20, topPosition) });
    }, [isOpen, isMobile]);

    // Calculate on open
    useEffect(() => {
        calculatePosition();
    }, [calculatePosition]);

    // Recalculate on resize
    useEffect(() => {
        if (!isOpen || isMobile) return;

        window.addEventListener('resize', calculatePosition);
        return () => window.removeEventListener('resize', calculatePosition);
    }, [isOpen, isMobile, calculatePosition]);

    return { modalPosition };
}
