import { create } from 'zustand';
import { Message } from '@/components/ChatHistory';
import { v4 as uuidv4 } from 'uuid';

interface TangentState {
  isOpen: boolean;
  activeTangentId: string | null;
  tangentMessages: Record<string, Message[]>;
  isLoading: boolean;
  sourceMessage: Message | null;
  referenceText: string | null;
  hiddenContext: Message[];
  openTangent: (sourceMessage: Message, referenceText: string, hiddenContext: Message[], tangentKey: string) => void;
  closeTangent: () => void;
  addTangentMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setTangentLoading: (loading: boolean) => void;
  clearTangent: () => void;
}

export const useTangentStore = create<TangentState>((set, get) => ({
  isOpen: false,
  activeTangentId: null,
  tangentMessages: {},
  isLoading: false,
  sourceMessage: null,
  referenceText: null,
  hiddenContext: [],

  openTangent: (sourceMessage, referenceText, hiddenContext, tangentKey) => {
    set((state) => ({
      isOpen: true,
      activeTangentId: tangentKey,
      sourceMessage,
      referenceText,
      hiddenContext,
      isLoading: false,
      // Do not clear messages if they already exist for this tangent
      tangentMessages: { ...state.tangentMessages },
    }));
  },

  closeTangent: () => set({ isOpen: false }),

  addTangentMessage: (messageData) => {
    const state = get();
    const tangentId = state.activeTangentId;
    if (!tangentId) return;
    set((prev) => ({
      tangentMessages: {
        ...prev.tangentMessages,
        [tangentId]: [
          ...(prev.tangentMessages[tangentId] || []),
          {
            ...messageData,
            id: uuidv4(),
            timestamp: new Date(),
          },
        ],
      },
    }));
  },

  setTangentLoading: (loading) => set({ isLoading: loading }),

  clearTangent: () => set({
    isOpen: false,
    activeTangentId: null,
    sourceMessage: null,
    referenceText: null,
    hiddenContext: [],
  }),
})); 