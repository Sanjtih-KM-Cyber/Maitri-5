import { useState, useEffect, useRef } from 'react';

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
let recognition: SpeechRecognition | null = null;
if (SpeechRecognitionAPI) {
    recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
}

export const useSpeechRecognition = () => {  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const startListening = () => {
    if (recognition && !isListening) {
      setTranscript(''); // Reset transcript for new session
      recognition.start();
      setIsListening(true);
    }
  };
  
  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (isListening) stopListening();
    };
    
    recognition.onend = () => {
      if (isListening) {
          setIsListening(false);
      }
    };

    return () => {
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
      }
    };
  }, [isListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasRecognitionSupport: !!recognition,
  };
};