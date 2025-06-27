'use client';

import { useState, useCallback } from 'react';
import ChatHistory from '@/components/ChatHistory';
import ChatInput from '@/components/ChatInput';
import TangentPanel from '@/components/TangentPanel';
import { useMainChatStore } from '@/stores/mainChatStore';
import { useTangentStore } from '@/stores/tangentStore';

export default function Home() {
  const { messages, isLoading, addMessage, setLoading } = useMainChatStore();
  const {
    isOpen: isTangentOpen,
    activeTangentId,
    tangentMessages,
    sourceMessage,
    openTangent,
    closeTangent,
    addTangentMessage,
    setTangentLoading,
    referenceText,
    hiddenContext,
    isLoading: isTangentLoading,
  } = useTangentStore();
  const [persistentHighlights, setPersistentHighlights] = useState<Record<string, { messageId: string, start: number, end: number, referenceText: string }>>({});

  // Helper to create a unique tangent key
  const getTangentKey = (messageId: string, start: number, end: number) => `${messageId}:${start}:${end}`;

  // Handle sending a message in the main chat
  const handleSendMessage = async (content: string) => {
    addMessage({ content, sender: 'user' });
    setLoading(true);
    try {
      const history = [
        ...messages.map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content },
      ];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (data.message) {
        addMessage({ content: data.message.content, sender: 'ai' });
      } else {
        addMessage({ content: `Error: ${data.error || 'Unknown error.'}`, sender: 'ai' });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error.';
      addMessage({ content: `Error: ${errorMessage}`, sender: 'ai' });
    }
    setLoading(false);
  };

  // Handle sending a message in the tangent panel
  const handleSendTangentMessage = async (content: string) => {
    addTangentMessage({ content, sender: 'user' });
    setTangentLoading(true);
    try {
      // Improved system prompt for tangent context
      const systemPrompt = referenceText
        ? `You are an expert assistant. The user has been discussing the following topic(s) in this conversation. They have highlighted the phrase: "${referenceText}" from earlier in the conversation. Please answer the user's next question specifically about the highlighted phrase, using any relevant context from the conversation.`
        : undefined;
      // Limit context to the last 10 messages
      const limitedContext = [
        ...(sourceMessage && referenceText ? hiddenContext : []),
        ...((activeTangentId && tangentMessages[activeTangentId]) ? tangentMessages[activeTangentId] : []),
      ].map((m) => {
        if ('sender' in m) {
          return { role: m.sender === 'user' ? 'user' : 'assistant', content: m.content };
        }
        return m; // Already in the correct format
      });
      const contextToSend = limitedContext.slice(-10);
      const messagesToSend = systemPrompt
        ? [
            { role: 'system', content: systemPrompt },
            ...contextToSend,
            { role: 'user', content },
          ]
        : [...contextToSend, { role: 'user', content }];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSend }),
      });
      const data = await res.json();
      if (data.message && data.message.content && data.message.content.trim()) {
        addTangentMessage({ content: data.message.content, sender: 'ai' });
      } else {
        addTangentMessage({ content: `Sorry, I couldn't generate a response. Please try rephrasing your question or reducing the context.`, sender: 'ai' });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error.';
      addTangentMessage({ content: `Error: ${errorMessage}`, sender: 'ai' });
    }
    setTangentLoading(false);
  };

  // Handle branching (creating a tangent)
  const handleBranch = useCallback((selectedText: string, messageId: string) => {
    const sourceMsg = messages.find((m) => m.id === messageId);
    if (!sourceMsg) return;
    // Use the entire chat history as context for the tangent
    const hiddenContext = messages;
    const start = sourceMsg.content.indexOf(selectedText);
    const end = start !== -1 ? start + selectedText.length : -1;
    if (start !== -1 && end !== -1) {
      const tangentKey = getTangentKey(messageId, start, end);
      setPersistentHighlights((prev) => ({
        ...prev,
        [tangentKey]: { messageId, start, end, referenceText: selectedText },
      }));
      openTangent(sourceMsg, selectedText, hiddenContext, tangentKey);
    }
  }, [messages, openTangent]);

  // Handle reopening a tangent by clicking a persistent highlight
  const handleReopenTangent = useCallback((tangentKey: string) => {
    const highlight = persistentHighlights[tangentKey];
    if (!highlight) return;
    const sourceMsg = messages.find((m) => m.id === highlight.messageId);
    if (!sourceMsg) return;
    const sourceIdx = messages.findIndex((m) => m.id === highlight.messageId);
    const hiddenContext = messages.slice(0, sourceIdx + 1);
    openTangent(sourceMsg, highlight.referenceText, hiddenContext, tangentKey);
  }, [messages, openTangent, persistentHighlights]);

  // Handle closing the tangent panel
  const handleCloseTangent = useCallback(() => {
    if (activeTangentId && (!tangentMessages[activeTangentId] || tangentMessages[activeTangentId].length === 0) && sourceMessage) {
      setPersistentHighlights((prev) => {
        const newHighlights = { ...prev };
        delete newHighlights[sourceMessage.id];
        return newHighlights;
      });
    }
    closeTangent();
  }, [activeTangentId, tangentMessages, sourceMessage, closeTangent]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl w-full mx-auto h-screen flex flex-col sm:px-2 px-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 sm:px-4 sm:py-3 px-2 py-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Tangent Chat
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Chat with AI and explore tangents
          </p>
        </header>
        <div className="flex-1 flex flex-col bg-white min-h-0">
          <ChatHistory
            messages={messages}
            onBranch={handleBranch}
            persistentHighlights={persistentHighlights}
            onReopenTangent={handleReopenTangent}
            isLoading={isLoading}
          />
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder={isLoading ? "AI is thinking..." : "Type your message..."}
          />
        </div>
        <TangentPanel
          isOpen={isTangentOpen}
          onClose={handleCloseTangent}
          messages={activeTangentId ? tangentMessages[activeTangentId] || [] : []}
          onSendMessage={handleSendTangentMessage}
          referenceText={referenceText || undefined}
          isLoading={isTangentLoading}
        />
      </div>
    </main>
  );
}
