'use client';

import { useEffect } from 'react';
import ChatHistory, { Message } from './ChatHistory';
import ChatInput from './ChatInput';

interface TangentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onSendMessage: (message: string) => void;
  referenceText?: string;
  isLoading?: boolean;
}

export default function TangentPanel({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  referenceText,
  isLoading = false,
}: TangentPanelProps) {
  // Escape key closes the panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full max-w-md z-40 transition-transform duration-300 ease-in-out bg-white shadow-2xl border-l border-gray-200 flex flex-col
        ${isOpen ? 'translate-x-0 animate-tangent-panel' : 'translate-x-full'}
      `}
      style={{ boxShadow: '0 0 32px 0 rgba(0,0,0,0.10)' }}
    >
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="font-bold text-lg text-gray-900 flex-1">Tangent</div>
        <button
          onClick={onClose}
          className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none text-2xl rounded-full hover:bg-gray-100 focus:bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors w-10 h-10 flex items-center justify-center"
          aria-label="Close tangent panel"
        >
          ×
        </button>
      </header>
      {referenceText && (
        <div className="px-6 py-2 bg-yellow-50 border-b border-yellow-200 text-sm text-gray-700">
          <span className="font-semibold">Reference:</span> {referenceText}
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ChatHistory messages={messages} isLoading={isLoading} />
        </div>
        <ChatInput 
          onSendMessage={onSendMessage} 
          disabled={isLoading}
          placeholder={isLoading ? "AI is thinking..." : "Type your message..."}
        />
      </div>
    </div>
  );
} 