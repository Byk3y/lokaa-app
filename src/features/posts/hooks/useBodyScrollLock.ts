import { useEffect } from 'react';

/**
 * Hook to manage body scroll locking when the modal is open.
 * Mobile: fully locks scrolling with position:fixed for fullscreen experience.
 * Desktop: allows auto overflow.
 */
export function useBodyScrollLock(isOpen: boolean, isMobile: boolean) {
    useEffect(() => {
        if (!isOpen) return;

        if (isMobile) {
            const originalStyles = {
                overflow: document.body.style.overflow,
                position: document.body.style.position,
                top: document.body.style.top,
                width: document.body.style.width,
                height: document.body.style.height,
                htmlOverflow: document.documentElement.style.overflow,
            };

            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = '0';
            document.body.style.left = '0';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
            document.documentElement.style.overflow = 'hidden';

            return () => {
                document.body.style.overflow = originalStyles.overflow;
                document.body.style.position = originalStyles.position;
                document.body.style.top = originalStyles.top;
                document.body.style.width = originalStyles.width;
                document.body.style.height = originalStyles.height;
                document.documentElement.style.overflow = originalStyles.htmlOverflow;
            };
        } else {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'auto';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen, isMobile]);
}
