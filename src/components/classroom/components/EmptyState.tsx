import React from 'react';
import { FileText } from "lucide-react";

interface EmptyStateProps {
  show: boolean;
}

export default function EmptyState({ show }: EmptyStateProps) {
  if (!show) return null;

  return (
    <div className="text-center py-12">
      <FileText className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">No pages yet</h3>
      <p className="mt-1 text-sm text-gray-500">Get started by creating a new page.</p>
    </div>
  );
}