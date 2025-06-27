'use client';

import { useRef, useEffect, useCallback } from 'react';

interface HighlightRange {
  start: number;
  end: number;
  onClick?: () => void;
}

interface ChatMessageProps {
  content: string;
  sender: 'user' | 'ai';
  timestamp?: Date;
  onTextSelect?: (selectedText: string, selectionRange: Range) => void;
  highlights?: HighlightRange[];
}

export default function ChatMessage({ 
  content, 
  sender, 
  timestamp, 
  onTextSelect,
  highlights = [],
}: ChatMessageProps) {
  const isUser = sender === 'user';
  const messageRef = useRef<HTMLDivElement>(null);

  const handleTextSelection = useCallback(() => {
    const selectionObj = window.getSelection();
    if (!selectionObj || selectionObj.rangeCount === 0) return;
    const range = selectionObj.getRangeAt(0);
    const selectedText = selectionObj.toString();
    if (isUser || !selectedText.trim() || !messageRef.current) return;
    if (messageRef.current.contains(range.commonAncestorContainer)) {
      onTextSelect?.(selectedText, range);
    }
  }, [isUser, onTextSelect]);

  useEffect(() => {
    const element = messageRef.current;
    if (!element) return;
    element.addEventListener('mouseup', handleTextSelection);
    element.addEventListener('keyup', handleTextSelection);
    return () => {
      element.removeEventListener('mouseup', handleTextSelection);
      element.removeEventListener('keyup', handleTextSelection);
    };
  }, [handleTextSelection]);

  // Render the message with all highlights
  let renderedContent: React.ReactNode = content;
  if (highlights.length > 0) {
    // Sort highlights by start index
    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    const nodes: React.ReactNode[] = [];
    let lastIdx = 0;
    sorted.forEach((h, i) => {
      if (h.start > lastIdx) {
        nodes.push(content.slice(lastIdx, h.start));
      }
      nodes.push(
        <span
          key={h.start + '-' + h.end}
          style={{ backgroundColor: '#fef3c7', cursor: h.onClick ? 'pointer' : undefined }}
          tabIndex={0}
          onClick={h.onClick}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ' ') && h.onClick) {
              e.preventDefault();
              h.onClick();
            }
          }}
          className="outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 transition-shadow"
        >{content.slice(h.start, h.end)}</span>
      );
      lastIdx = h.end;
    });
    if (lastIdx < content.length) {
      nodes.push(content.slice(lastIdx));
    }
    renderedContent = <>{nodes}</>;
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        ref={messageRef}
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900'
        } ${!isUser ? 'select-text' : ''} animate-chat-message`}
      >
        <div className="text-sm font-medium mb-1">
          {isUser ? 'You' : 'AI'}
        </div>
        <div className="whitespace-pre-wrap">{renderedContent}</div>
        {timestamp && (
          <div className={`text-xs mt-1 ${
            isUser ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {timestamp.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
} 