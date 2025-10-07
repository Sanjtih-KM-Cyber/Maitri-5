import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Screen, ChatMessage, SymptomLog, MissionTask } from '../types';
import { useChatHistory } from '../hooks/useChatHistory';
import { generateChatResponseWithTools, generateCreativeTextWithColor, functionDeclarations } from '../services/geminiService';
import { useTTS } from '../hooks/useTTS';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import GlassCard from '../components/GlassCard';

interface ChatScreenProps {
  navigateTo: (screen: Screen, context?: any) => void;
  onClose: () => void;
  astronautName: string;
  initialMessage?: string | null;
  isTtsEnabled: boolean;
  ttsVoice: string;
  onSensoryColorChange: (color: string) => void;
  onSymptomLog: (log: Omit<SymptomLog, 'id' | 'date' | 'photo' | 'video'>) => Promise<void>;
  onAddTask: (task: Omit<MissionTask, 'id' | 'completed'>) => Promise<void>;
}

const ChatMessageRenderer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  
  const elements = lines.map((line, i) => {
    if (line.trim().startsWith('* ')) {
      const content = line.trim().substring(2);
      const parts = content.split(/(\*\*.*?\*\*)/g).filter(Boolean);
      return (
        <li key={i}>
          {parts.map((part, j) =>
            part.startsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part
          )}
        </li>
      );
    }
    // Render empty lines as a paragraph with a non-breaking space to maintain height
    if (line.trim() === '') {
        return <p key={i} className="min-h-[1rem]">&nbsp;</p>;
    }
    const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return (
      <p key={i}>
        {parts.map((part, j) =>
          part.startsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part
        )}
      </p>
    );
  });
  
  // Group consecutive list items into a single <ul>
  const groupedElements = [];
  let currentList = [];
  for (const element of elements) {
    if (element.type === 'li') {
      currentList.push(element);
    } else {
      if (currentList.length > 0) {
        groupedElements.push(<ul key={groupedElements.length} className="list-disc list-inside space-y-1 my-2 pl-2">{currentList}</ul>);
        currentList = [];
      }
      groupedElements.push(element);
    }
  }
  if (currentList.length > 0) {
    groupedElements.push(<ul key={groupedElements.length} className="list-disc list-inside space-y-1 my-2 pl-2">{currentList}</ul>);
  }

  return <>{groupedElements}</>;
};


const ChatScreen: React.FC<ChatScreenProps> = ({
  onClose,
  navigateTo,
  astronautName,
  initialMessage,
  isTtsEnabled,
  ttsVoice,
  onSensoryColorChange,
  onSymptomLog,
  onAddTask,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { messages, addMessage } = useChatHistory(astronautName);
  const { speak } = useTTS();
  const { isListening, transcript, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageSent = useRef(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    if (transcript) {
        setInput(prev => prev + transcript);
    }
  }, [transcript]);

  const handleSend = useCallback(async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isLoading) return;

    setInput('');
    setIsLoading(true);
    
    if (messageText.toLowerCase().startsWith('/sensory ')) {
      const prompt = messageText.substring(9);
      const systemMessage: ChatMessage = { id: `sys-${Date.now()}`, text: `Generating sensory experience for: "${prompt}"`, sender: 'system', timestamp: new Date().toISOString() };
      addMessage(systemMessage);

      try {
        const { description, dominant_color_hex } = await generateCreativeTextWithColor(prompt);
        onSensoryColorChange(dominant_color_hex);
        const modelMessage: ChatMessage = { id: `model-${Date.now()}`, text: description, sender: 'model', timestamp: new Date().toISOString() };
        addMessage(modelMessage);
        if (isTtsEnabled) speak(description, ttsVoice);
      } catch (error) {
        console.error(error);
        const errorMessage: ChatMessage = { id: `model-${Date.now()}`, text: "I had trouble generating that sensory experience.", sender: 'model', timestamp: new Date().toISOString() };
        addMessage(errorMessage);
        if (isTtsEnabled) speak(errorMessage.text, ttsVoice);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
      ...(replyTo && { replyTo: { id: replyTo.id, text: replyTo.text, sender: replyTo.sender } }),
    };
    addMessage(userMessage);
    setReplyTo(null);
    
    try {
      const history = [...messages, userMessage];
      const response = await generateChatResponseWithTools(history, astronautName);
      
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        for (const fc of functionCalls) {
            let confirmationText = "Okay, I've handled that for you.";
            if (fc.name === 'navigateToScreen' && fc.args.screen) {
                const screen = fc.args.screen.toLowerCase() as Screen;
                if (Object.values(Screen).includes(screen)) {
                    navigateTo(screen);
                    confirmationText = `Navigating to the ${screen} module.`;
                }
            } else if (fc.name === 'logSymptom' && fc.args.symptom && fc.args.severity) {
                const severity = fc.args.severity.toLowerCase();
                if (['mild', 'moderate', 'severe'].includes(severity)) {
                    await onSymptomLog({ symptom: fc.args.symptom, severity, notes: fc.args.notes || '' });
                    confirmationText = `I've logged that you're experiencing a ${severity} ${fc.args.symptom}.`;
                }
            } else if (fc.name === 'addMissionTask' && fc.args.time && fc.args.name) {
                await onAddTask({ time: fc.args.time, name: fc.args.name });
                confirmationText = `I've added "${fc.args.name}" to your schedule at ${fc.args.time}.`;
            }
            const systemMessage: ChatMessage = { id: `sys-${Date.now()}`, text: confirmationText, sender: 'system', timestamp: new Date().toISOString() };
            addMessage(systemMessage);
            if (isTtsEnabled) speak(confirmationText, ttsVoice);
        }
      } else {
        const responseText = response.text;
        const modelMessage: ChatMessage = {
            id: `model-${Date.now()}`,
            text: responseText,
            sender: 'model',
            timestamp: new Date().toISOString(),
        };
        addMessage(modelMessage);
        if (isTtsEnabled) speak(responseText, ttsVoice);
      }

    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        text: "Sorry, I'm having trouble connecting right now.",
        sender: 'model',
        timestamp: new Date().toISOString(),
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, addMessage, isTtsEnabled, speak, ttsVoice, messages, onSensoryColorChange, navigateTo, replyTo, astronautName, onSymptomLog, onAddTask]);
  
  useEffect(() => {
    if (initialMessage && !initialMessageSent.current) {
        initialMessageSent.current = true;
        handleSend(initialMessage);
    }
  }, [initialMessage, handleSend]);
  
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setInput('');
      startListening();
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here for feedback
  };

  const MessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
    const [showActions, setShowActions] = useState(false);
    const isUser = msg.sender === 'user';
    const bubbleClass = isUser
      ? 'bg-accent-cyan text-white rounded-br-none'
      : 'bg-gray-200 dark:bg-gray-700 rounded-bl-none';
    const alignmentClass = isUser ? 'justify-end' : 'justify-start';

    return (
      <div className={`flex items-end space-x-2 ${alignmentClass}`} onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
        {!isUser && <div className="w-8 h-8 rounded-full bg-accent-cyan flex-shrink-0 flex items-center justify-center text-white font-bold text-xs">AI</div>}
        <div className={`relative max-w-lg p-3 rounded-2xl ${bubbleClass} transition-all`}>
          {msg.replyTo && (
            <div className="border-l-2 border-cyan-200/50 pl-2 mb-2 opacity-80">
              <p className="text-xs font-bold capitalize">{msg.replyTo.sender}</p>
              <p className="text-sm truncate">{msg.replyTo.text}</p>
            </div>
          )}
          <div className="leading-relaxed"><ChatMessageRenderer text={msg.text} /></div>
          <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          
          {showActions && (
             <div className={`absolute top-0 flex space-x-1 p-1 bg-gray-500/20 rounded-full backdrop-blur-sm -translate-y-1/2 transition-opacity ${isUser ? 'left-2' : 'right-2'}`}>
                <button onClick={() => setReplyTo(msg)} className="p-1 hover:bg-black/20 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>
                <button onClick={() => handleCopyToClipboard(msg.text)} className="p-1 hover:bg-black/20 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto animate-fade-in">
        <div className="flex justify-between items-center p-4 border-b border-gray-300/50 dark:border-slate-500/20 flex-shrink-0">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">MAITRI Chat</h1>
            <button onClick={onClose} className="p-2 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => msg.sender === 'system' 
            ? <div key={msg.id} className="text-center w-full text-sm italic text-gray-500 dark:text-gray-400 py-2">{msg.text}</div>
            : <MessageBubble key={msg.id} msg={msg} />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-300/50 dark:border-slate-500/20 flex-shrink-0">
         {replyTo && (
          <div className="relative p-2 mb-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm">
            <button onClick={() => setReplyTo(null)} className="absolute top-1 right-1 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            <p>Replying to <span className="font-bold capitalize">{replyTo.sender}</span></p>
            <p className="truncate italic">"{replyTo.text}"</p>
          </div>
         )}
         <GlassCard className="p-2 flex items-center space-x-2">
            {hasRecognitionSupport && (
                <button onClick={handleMicClick} className={`p-3 rounded-full transition-colors flex-shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
            )}
           <textarea
             rows={1}
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
             }}
             placeholder="Ask MAITRI anything..."
             className="w-full bg-transparent outline-none p-2 resize-none max-h-24 scrollbar-thin"
             disabled={isLoading}
           />
           <button onClick={() => handleSend()} disabled={isLoading || !input} className="p-3 bg-accent-cyan text-white rounded-full disabled:bg-gray-500 flex-shrink-0">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
           </button>
         </GlassCard>
      </div>
    </div>
  );
};

export default ChatScreen;
