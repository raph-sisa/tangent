import { create } from 'zustand';
import { Message } from '@/components/ChatHistory';
import { v4 as uuidv4 } from 'uuid';

interface MainChatState {
  messages: Message[];
  isLoading: boolean;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

export const useMainChatStore = create<MainChatState>((set) => ({
  messages: [],
  isLoading: false,
  
  addMessage: (messageData) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...messageData,
        id: uuidv4(),
        timestamp: new Date(),
      },
    ],
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  clearMessages: () => set({ messages: [] }),
})); 