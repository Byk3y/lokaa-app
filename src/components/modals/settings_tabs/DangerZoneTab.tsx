import React from 'react';

export default function DangerZoneTab() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
      <p className="mt-2 text-gray-600">
        Proceed with caution. Actions taken in this section are critical and may be irreversible.
      </p>
      {/* Placeholder for actual danger zone settings like delete space, transfer ownership etc. */}
      <div className="mt-6 border-t pt-6">
        <button className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded">
          Delete Space (Not Implemented)
        </button>
      </div>
    </div>
  );
} 