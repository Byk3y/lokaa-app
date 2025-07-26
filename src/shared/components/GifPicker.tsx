import React, { useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useGiphySearch } from '../../features/posts/hooks/useGiphySearch';
import { GiphySearchModal } from '../../features/posts/components/modals/GiphySearchModal';
import { X } from 'lucide-react';

interface GifPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

export const GifPicker: React.FC<GifPickerProps> = ({ open, onClose, onSelect, anchorRef }) => {
  const {
    showGiphySearch,
    setShowGiphySearch,
    giphySearchTerm,
    setGiphySearchTerm,
    activeGifCategory,
    fetchGifsForSearch,
    fetchGifsForCategory,
    handleGifSelected,
    giphyContainerRef
  } = useGiphySearch({
    onGifSelected: (gif) => {
      onSelect(gif.images.original.url);
      onClose();
    },
    disableOutsideClose: true
  });

  // Sync open/close state
  useEffect(() => {
    setShowGiphySearch(open);
  }, [open, setShowGiphySearch]);

  // Popover positioning: use position: absolute, anchor to button, within stacking context
  const [popoverStyle, setPopoverStyle] = React.useState<React.CSSProperties>({});
  useEffect(() => {
    if (open && anchorRef?.current) {
      const buttonRect = anchorRef.current.getBoundingClientRect();
      const parentRect = anchorRef.current.offsetParent?.getBoundingClientRect();
      const popoverWidth = 350;
      const popoverHeight = 400;
      const offset = 8; // space between button and popover
      let left = buttonRect.left - (parentRect?.left || 0) + buttonRect.width / 2 - popoverWidth / 2;
      left = Math.max(0, left);
      const top = buttonRect.bottom - (parentRect?.top || 0) + offset;
      setPopoverStyle({
        position: 'absolute',
        left,
        top,
        zIndex: 1000,
        width: popoverWidth,
        height: popoverHeight,
      });
    }
  }, [open, anchorRef]);

  if (!open) return null;

  return (
    <div style={popoverStyle} ref={giphyContainerRef} className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 p-2">
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">
            Powered by GIPHY
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>
      <div className="p-2">
        <GiphySearchModal
          searchTerm={giphySearchTerm}
          onSearchChange={setGiphySearchTerm}
          fetchGifs={fetchGifsForSearch}
          fetchGifsByCategory={fetchGifsForCategory}
          onGifSelect={handleGifSelected}
          visible={open}
          activeCategory={activeGifCategory}
          onClose={onClose}
          standalone={true}
        />
      </div>
    </div>
  );
};

export default GifPicker; 