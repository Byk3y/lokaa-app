import React, { useState, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { LinkModalProps } from '../../types';

/**
 * Modal for adding web links to posts
 */
export const LinkModal: React.FC<LinkModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input when the modal opens
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    // Clear input when modal closes
    if (!isOpen) {
      setUrl('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-[10000]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[10000] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg data-[state=open]:animate-contentShow focus:outline-none">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Add Link
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Enter the URL of the link you want to add to your post.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 mb-1">
                Enter URL
              </label>
              <input
                ref={inputRef}
                id="link-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., https://example.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Add a link to an article, website, or other online resource
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Add Link
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}; 