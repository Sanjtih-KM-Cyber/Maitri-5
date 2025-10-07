import { useState, useEffect, useRef, useCallback } from 'react';

// Fix: Add a type definition for the SpeechRecognition API to avoid TypeScript errors,
// as it may not be included in default TS DOM library files.
interface SpeechRecognition {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

// Fix: Correctly handle vendor-prefixed SpeechRecognition API and avoid TypeScript type conflicts.
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
// This hook creates a single recognition instance and manages its lifecycle.
// It is safer than a module-level singleton instance.
export const useSpeechRecognition = () => {  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Use a ref to hold the recognition instance.
  // This avoids re-creating it on every render and keeps it tied to the component's lifecycle.
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!SpeechRecognitionAPI) return; // Don't run if the API is not supported.

    // Initialize the recognition instance if it doesn't exist.
    if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.interimResults = true;
    }
    const recognition = recognitionRef.current;

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      // Ensure listening state is turned off on error.
      setIsListening(false);
    };
    
    recognition.onend = () => {
      // Ensure listening state is turned off when recognition ends.
      setIsListening(false);
    };

    // Cleanup function: stop recognition when the component unmounts.
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Empty dependency array ensures this setup runs only once per component instance.

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript(''); // Reset transcript for new session
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch(e) {
        console.error("Error starting speech recognition:", e);
        setIsListening(false);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      // onend callback will set isListening to false
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasRecognitionSupport: !!SpeechRecognitionAPI,
  };
};