
import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../types.ts';

const DB_NAME = 'MAITRI_DB';
const DB_VERSION = 1;
const STORE_NAME = 'chatHistory';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
          console.error("IndexedDB error:", request.error);
          reject(request.error);
      };
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'astronautName' });
        }
      };
    });
  }
  return dbPromise;
};

export const useChatHistory = (astronautName: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load history from IndexedDB on component mount
  useEffect(() => {
    if (!astronautName) return;

    let isMounted = true;
    const loadHistory = async () => {
      try {
        const db = await getDb();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(astronautName);
        request.onsuccess = () => {
          if (isMounted && request.result) {
            setMessages(request.result.history);
          } else if (isMounted) {
            // Initialize with a welcome message if no history exists
            const welcomeMessage: ChatMessage = {
              id: `model-${Date.now()}`,
              text: `Hello, Captain ${astronautName}. I'm MAITRI, your AI companion. How can I assist you today?`,
              sender: 'model',
              timestamp: new Date().toISOString(),
            };
            setMessages([welcomeMessage]);
          }
        };
        request.onerror = () => console.error("Error loading chat history:", request.error);
      } catch (error) {
        console.error("Failed to load chat history from IndexedDB:", error);
      }
    };
    
    loadHistory();

    return () => { isMounted = false; };
  }, [astronautName]);

  const saveHistory = useCallback(async (newMessages: ChatMessage[]) => {
    if (!astronautName) return;
    try {
      const db = await getDb();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({ astronautName, history: newMessages });
    } catch (error) {
      console.error("Failed to save chat history to IndexedDB:", error);
    }
  }, [astronautName]);

  const addMessage = useCallback((newMessage: ChatMessage) => {
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, newMessage];
      saveHistory(updatedMessages);
      return updatedMessages;
    });
  }, [saveHistory]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    saveHistory([]);
  }, [saveHistory]);

  return { messages, addMessage, clearHistory };
};
