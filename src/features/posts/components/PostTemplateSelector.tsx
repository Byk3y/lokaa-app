import React from 'react';
import { X as Cross2Icon } from 'lucide-react';

interface PostTemplateSelectorProps {
  visible: boolean;
  onClose: () => void;
  onTemplateSelect: (template: 'introduction' | 'favorites') => void;
}

/**
 * Component for selecting post templates
 */
export const PostTemplateSelector: React.FC<PostTemplateSelectorProps> = ({
  visible,
  onClose,
  onTemplateSelect
}) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="relative mb-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
      <h4 className="font-semibold">Fun post ideas to kick off your space:</h4>
      <ul className="list-disc pl-5 mt-1">
        <li 
          className="cursor-pointer hover:text-blue-900 transition-colors mt-1"
          onClick={() => onTemplateSelect('introduction')}
        >
          Share a quick introduction and what brings you here
        </li>
        <li 
          className="cursor-pointer hover:text-blue-900 transition-colors mt-1"
          onClick={() => onTemplateSelect('favorites')}
        >
          Ask what tools or resources have been helpful to members
        </li>
      </ul>
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 text-blue-500 hover:text-blue-700 p-1"
        aria-label="Dismiss fun post ideas"
      >
        <Cross2Icon className="h-4 w-4" />
      </button>
    </div>
  );
}; 