import React from 'react';
import { Link2, PlayCircle, ImageIcon, FileText, File } from "lucide-react";

/**
 * Utility functions for handling files and attachments
 */

/**
 * Gets an appropriate icon component based on file type
 * @param fileType MIME type of the file
 * @param attachmentType Type of attachment (link, video, etc)
 * @returns React element with appropriate icon
 */
export const getFileIcon = (fileType?: string, attachmentType?: string): JSX.Element => {
  if (attachmentType === 'link') return React.createElement(Link2, { size: 16, className: "mr-2 text-blue-500 flex-shrink-0" });
  if (attachmentType === 'video') return React.createElement(PlayCircle, { size: 16, className: "mr-2 text-red-500 flex-shrink-0" });
  
  if (fileType?.startsWith('image/')) return React.createElement(ImageIcon, { size: 16, className: "mr-2 text-purple-500 flex-shrink-0" });
  if (fileType === 'application/pdf') return React.createElement(FileText, { size: 16, className: "mr-2 text-orange-500 flex-shrink-0" });
  
  // Default file icon
  return React.createElement(File, { size: 16, className: "mr-2 text-gray-500 flex-shrink-0" });
};

/**
 * Formats file size to human-readable format
 * @param bytes File size in bytes
 * @returns Formatted file size (e.g. "2.5 MB")
 */
export const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined) return '';
  
  if (bytes < 1024) return `${bytes} B`;
  else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  else if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  else return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/**
 * Checks if a URL points to an image
 * @param url URL to check
 * @param fileType Optional MIME type if known
 * @returns True if the URL likely points to an image
 */
export const isImageUrl = (url: string, fileType?: string): boolean => {
  if (fileType?.startsWith('image/')) return true;
  
  // Simple URL extension check as fallback
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
  return extensions.some(ext => url.toLowerCase().endsWith(ext));
}; 