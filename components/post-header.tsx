import React from "react";

export default function PostHeader() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-6 overflow-x-auto">
          <button className="text-green-700 font-medium border-b-2 border-green-700 pb-1 whitespace-nowrap">
            /announcements
          </button>
          <button className="text-gray-600 hover:text-green-700 transition-colors whitespace-nowrap">
            /showcase
          </button>
          <button className="text-gray-600 hover:text-green-700 transition-colors whitespace-nowrap">
            /patterns
          </button>
          <button className="text-gray-600 hover:text-green-700 transition-colors whitespace-nowrap">
            /tools
          </button>
          <button className="text-gray-600 hover:text-green-700 transition-colors whitespace-nowrap">
            /shipyard
          </button>
          <button className="text-gray-600 hover:text-green-700 transition-colors whitespace-nowrap">
            /prompts
          </button>
        </div>
      </div>
    </div>
  );
}
