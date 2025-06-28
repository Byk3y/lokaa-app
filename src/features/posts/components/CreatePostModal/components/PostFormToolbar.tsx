import React from 'react';
import { Paperclip, Link as LinkIcon, Video as VideoIcon, Smile, BarChart } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { PostFormToolbarProps } from '../types';

/**
 * Toolbar component with all attachment and formatting options
 */
export const PostFormToolbar: React.FC<PostFormToolbarProps> = ({
  onAttachFile,
  onAddLink,
  onAddVideo,
  onAddGif,
  onTogglePoll,
  onToggleEmoji,
  showPollCreator,
  toolbarButtonClass,
  activeToolbarButtonClass
}) => {
  return (
    <TooltipProvider>
      <div className="mt-4 flex justify-between items-center dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={toolbarButtonClass}
                onClick={onAttachFile}
              >
                <Paperclip className="h-5 w-5" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Attach a file</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={toolbarButtonClass}
                onClick={onAddLink}
              >
                <LinkIcon className="h-5 w-5" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add a link</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={toolbarButtonClass}
                onClick={onAddVideo}
              >
                <VideoIcon className="h-5 w-5" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Embed a video</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={toolbarButtonClass}
                onClick={onAddGif}
              >
                <span className="font-semibold text-gray-500 text-sm tracking-wider">GIF</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add GIF as attachment</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={showPollCreator ? activeToolbarButtonClass : toolbarButtonClass}
                onClick={onTogglePoll}
              >
                <BarChart className="h-5 w-5" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create a poll</p>
            </TooltipContent>
          </Tooltip>
        
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={toolbarButtonClass}
                onClick={onToggleEmoji}
              >
                <Smile className="h-5 w-5" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add emoji</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}; 