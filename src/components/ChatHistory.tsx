'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ContextualMenu from './ContextualMenu';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface HighlightRange {
  start: number;
  end: number;
}

interface ChatHistoryProps {
  messages: Message[];
  onBranch?: (selectedText: string, messageId: string) => void;
  persistentHighlights?: Record<string, { messageId: string, start: number, end: number, referenceText: string }>;
  onReopenTangent?: (tangentKey: string) => void;
  isLoading?: boolean;
}

export default function ChatHistory({ messages, onBranch, persistentHighlights = {}, onReopenTangent, isLoading = false }: ChatHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // Within 100px of bottom
      
      if (isNearBottom) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  const [contextualMenu, setContextualMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number } | null;
    selectedText: string;
    messageId: string;
    selectionRange: Range | null;
  }>({
    isVisible: false,
    position: null,
    selectedText: '',
    messageId: '',
    selectionRange: null,
  });

  const handleTextSelect = useCallback((selectedText: string, range: Range, messageId: string) => {
    if (!selectedText.trim()) {
      setContextualMenu(prev => ({ ...prev, isVisible: false }));
      return;
    }
    // Calculate position for the contextual menu
    const rect = range.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 5, // 5px below the selection
    };
    setContextualMenu({
      isVisible: true,
      position,
      selectedText,
      messageId,
      selectionRange: range,
    });
  }, []);

  const handleContextualMenuClose = useCallback(() => {
    setContextualMenu(prev => ({ ...prev, isVisible: false }));
  }, []);

  const handleBranch = useCallback(() => {
    if (
      contextualMenu.selectedText &&
      contextualMenu.messageId &&
      contextualMenu.selectionRange
    ) {
      // Find the start and end indices of the selected text in the message content
      const container = contextualMenu.selectionRange.commonAncestorContainer;
      let messageContent = '';
      // Find the message content for this messageId
      const msg = messages.find(m => m.id === contextualMenu.messageId);
      if (msg) messageContent = msg.content;
      // Fallback: use anchorOffset/focusOffset if selection is within a single text node
      let start = contextualMenu.selectionRange.startOffset;
      let end = contextualMenu.selectionRange.endOffset;
      // If selection is backwards, swap
      if (start > end) [start, end] = [end, start];
      // If selection is not in a single node, fallback to string search
      if (container.nodeType === Node.TEXT_NODE) {
        const nodeText = container.textContent || '';
        const nodeStart = messageContent.indexOf(nodeText);
        if (nodeStart !== -1) {
          start = nodeStart + contextualMenu.selectionRange.startOffset;
          end = nodeStart + contextualMenu.selectionRange.endOffset;
        }
      } else {
        // Fallback: search for selectedText in messageContent
        const idx = messageContent.indexOf(contextualMenu.selectedText);
        if (idx !== -1) {
          start = idx;
          end = idx + contextualMenu.selectedText.length;
        }
      }
      if (onBranch) onBranch(contextualMenu.selectedText, contextualMenu.messageId);
    }
    handleContextualMenuClose();
  }, [contextualMenu, messages, onBranch, handleContextualMenuClose]);

  // Group highlights by messageId
  const highlightsByMessage: Record<string, { tangentKey: string, start: number, end: number, referenceText: string }[]> = {};
  Object.entries(persistentHighlights).forEach(([tangentKey, h]) => {
    if (!highlightsByMessage[h.messageId]) highlightsByMessage[h.messageId] = [];
    highlightsByMessage[h.messageId].push({ tangentKey, start: h.start, end: h.end, referenceText: h.referenceText });
  });

  return (
    <div 
      className="flex-1 overflow-y-auto p-4 space-y-4 relative min-h-0 scroll-smooth" 
      ref={scrollRef}
      style={{ 
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth'
      }}
    >
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : (
        <>
          {messages.map((message) => {
            const highlights = highlightsByMessage[message.id] || [];
            return (
              <ChatMessage
                key={message.id}
                content={message.content}
                sender={message.sender}
                timestamp={message.timestamp}
                onTextSelect={(selectedText, range) => 
                  handleTextSelect(selectedText, range, message.id)
                }
                highlights={highlights.map(h => ({
                  start: h.start,
                  end: h.end,
                  onClick: onReopenTangent ? () => onReopenTangent(h.tangentKey) : undefined,
                }))}
              />
            );
          })}
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-500 italic">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span>AI is thinking...</span>
            </div>
          )}
        </>
      )}
      <ContextualMenu
        isVisible={contextualMenu.isVisible}
        position={contextualMenu.position}
        onBranch={handleBranch}
        onClose={handleContextualMenuClose}
      />
    </div>
  );
} 