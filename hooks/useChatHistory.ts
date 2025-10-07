import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';

const DB_NAME = 'MAITRI_DB';
const DB_VERSION = 1;
const STORE_NAME = 'chatHistory';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
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

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const db = await getDb();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(astronautName);
        request.onsuccess = () => {
          if (request.result) {
            setMessages(request.result.history);
          }
        };
      } catch (error) {
        console.error("Failed to load chat history from IndexedDB:", error);
      }
    };
    if (astronautName) {
      loadHistory();
    }
  }, [astronautName]);

  const saveHistory = useCallback(async (newMessages: ChatMessage[]) => {
    try {
      const db = await getDb();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({ astronautName, history: newMessages });
    } catch (error) {
      console.error("Failed to save chat history to IndexedDB:", error);
    }
  }, [astronautName]);

  const addMessage = useCallback((newMessage: ChatMessage, isUpdate = false) => {
    setMessages(prevMessages => {
      let updatedMessages;
      if (isUpdate) {
        // Find and replace the message with the same ID, or add if not found
        const existingIndex = prevMessages.findIndex(m => m.id === newMessage.id);
        if (existingIndex > -1) {
          updatedMessages = [...prevMessages];
          updatedMessages[existingIndex] = newMessage;
        } else {
          updatedMessages = [...prevMessages, newMessage];
        }
      } else {
        updatedMessages = [...prevMessages, newMessage];
      }
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
