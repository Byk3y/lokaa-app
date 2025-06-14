import React, { forwardRef } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import ReactDOM from 'react-dom';
import { init, SearchIndex } from 'emoji-mart';

interface EmojiPickerModalProps {
  onEmojiSelect: (emoji: any) => void;
  visible: boolean;
  anchorRef?: React.RefObject<HTMLElement>;
  onClose?: () => void;
}

/**
 * Emoji picker modal for selecting emojis
 */
export const EmojiPickerModal = React.forwardRef<HTMLDivElement, EmojiPickerModalProps>(
  function EmojiPickerModal({ onEmojiSelect, visible, anchorRef, onClose }, ref) {
    const [style, setStyle] = React.useState<React.CSSProperties>({});
    const pickerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (visible && anchorRef?.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const pickerWidth = 320;
        const pickerHeight = 350;
        let left = rect.left;
        let top = rect.bottom + 8;
        // Clamp to viewport
        left = Math.max(8, Math.min(left, window.innerWidth - pickerWidth - 8));
        if (top + pickerHeight > window.innerHeight) {
          top = rect.top - pickerHeight - 8;
        }
        setStyle({
          position: 'fixed',
          left,
          top,
          zIndex: 9999,
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          height: pickerHeight,
          width: pickerWidth,
          overflowY: 'auto',
          transform: 'translateZ(0)'
        });
      }
    }, [visible, anchorRef]);

    React.useEffect(() => {
      const currentPickerRef = pickerRef.current;
      if (visible && currentPickerRef) {
        const handleWheel = (e: WheelEvent) => {
          // If the picker is scrollable and the event is within the picker, stop propagation.
          if (currentPickerRef.scrollHeight > currentPickerRef.clientHeight) {
            e.stopPropagation();
          }
        };
        currentPickerRef.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
          currentPickerRef.removeEventListener('wheel', handleWheel);
        };
      }
    }, [visible]);

    React.useEffect(() => {
      if (visible && pickerRef.current) {
        const searchInput = pickerRef.current.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          // Stop event propagation and prevent default to prevent focus shift
          const handleEvent = (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
          };
          searchInput.addEventListener('click', handleEvent);
          searchInput.addEventListener('focus', handleEvent);
          return () => {
            searchInput.removeEventListener('click', handleEvent);
            searchInput.removeEventListener('focus', handleEvent);
          };
        }
      }
    }, [visible]);

    if (!visible) return null;

    // Overlay to block pointer/scroll events to modal
    const overlay = (
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9998,
          background: 'transparent',
          pointerEvents: 'auto',
        }}
      />
    );

    const picker = (
      <div ref={pickerRef} style={{ ...style, pointerEvents: 'auto', zIndex: 9999 }}>
        <Picker
          data={data}
          onEmojiSelect={onEmojiSelect}
          theme="light"
          previewPosition="none"
          searchPosition="sticky"
          skinTonePosition="none"
          perLine={8}
          emojiSize={20}
          maxFrequentRows={1}
          navPosition="top"
          set="native"
          autoFocus={true}
        />
      </div>
    );
    return ReactDOM.createPortal(<>{overlay}{picker}</>, document.body);
  }
);

init({ data });

async function performSearch(query) {
  const emojis = await SearchIndex.search(query);
  return emojis.map((emoji) => emoji.skins[0].native);
}

// Example usage
performSearch('smile').then(console.log); 