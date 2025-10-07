import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, FunctionDeclaration, Type, Blob } from '@google/genai';
import { Screen, SymptomLog, MissionTask } from '../types';
import { encode, decode, decodeAudioData } from '../utils';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigateTo: (screen: Screen, context?: any) => void;
  onSymptomLog: (log: Omit<SymptomLog, 'id' | 'date' | 'photo' | 'video'>) => Promise<void>;
  onAddTask: (task: Omit<MissionTask, 'id' | 'completed'>) => Promise<void>;
  onOpenCameraRequest: (mediaType: 'photo' | 'video') => void;
  voiceName: string;
}

interface TranscriptLine {
  id: string;
  speaker: 'user' | 'maitri';
  text: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const navigateToScreenFunctionDeclaration: FunctionDeclaration = {
  name: 'navigateToScreen',
  parameters: {
    type: Type.OBJECT,
    description: 'Navigates the user to a different screen or module in the application.',
    properties: {
      screen: {
        type: Type.STRING,
        description: `The screen to navigate to. Must be one of: ${Object.values(Screen).join(', ')}.`,
      },
    },
    required: ['screen'],
  },
};

const logSymptomFunctionDeclaration: FunctionDeclaration = {
    name: 'logSymptom',
    parameters: {
        type: Type.OBJECT,
        description: 'Logs a new health symptom for the astronaut.',
        properties: {
            symptom: { type: Type.STRING, description: 'A brief description of the symptom, e.g., "headache" or "dizziness".' },
            severity: { type: Type.STRING, description: 'The severity of the symptom. Must be one of: mild, moderate, severe.' },
            notes: { type: Type.STRING, description: 'Optional additional notes about the symptom.' },
        },
        required: ['symptom', 'severity'],
    },
};

const addMissionTaskFunctionDeclaration: FunctionDeclaration = {
    name: 'addMissionTask',
    parameters: {
        type: Type.OBJECT,
        description: 'Adds a new task to the mission schedule for the day.',
        properties: {
            time: { type: Type.STRING, description: 'The time for the task in 24-hour format, e.g., "14:30".' },
            name: { type: Type.STRING, description: 'A description of the task, e.g., "Recalibrate solar panels".' },
        },
        required: ['time', 'name'],
    }
};

const openCameraForSymptomFunctionDeclaration: FunctionDeclaration = {
    name: 'openCameraForSymptom',
    parameters: {
        type: Type.OBJECT,
        description: 'Opens the camera to attach media to the most recently logged symptom.',
        properties: {
            mediaType: { type: Type.STRING, description: "The type of media to capture. Must be one of: 'photo' or 'video'." },
        },
        required: ['mediaType'],
    },
};


const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose, navigateTo, onSymptomLog, onAddTask, onOpenCameraRequest, voiceName }) => {
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  // Refs for current turn's transcription
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  // Refs for audio processing
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());


  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up voice assistant resources.');
    setStatus('idle');
    
    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Disconnect audio nodes
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current = null;
    }
    if(mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }

    // Close audio contexts
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Close the session
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close()).catch(console.error);
      sessionPromiseRef.current = null;
    }
    
    // Clear state
    setTranscript([]);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';

  }, []);
  
  const setupAndConnect = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support the required Media Devices API.");
      onClose();
      return;
    }
    
    // Initialize AudioContexts
    inputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 24000 });

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    setStatus('listening');

    sessionPromiseRef.current = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          console.log('Session opened.');
          if(!inputAudioContextRef.current || !streamRef.current) return;
          
          mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
          scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

          scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;

            const pcmBlob: Blob = {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            
            if (sessionPromiseRef.current) {
              sessionPromiseRef.current.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            }
          };
          mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
          scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            currentInputTranscriptionRef.current += text;
            setTranscript(prev => {
                const last = prev[prev.length - 1];
                if(last && last.speaker === 'user') {
                    return [...prev.slice(0, -1), { ...last, text: currentInputTranscriptionRef.current }];
                }
                return [...prev, { id: `user-${Date.now()}`, speaker: 'user', text: currentInputTranscriptionRef.current }];
            });
          }

          if (message.serverContent?.outputTranscription) {
            setStatus('speaking');
            const text = message.serverContent.outputTranscription.text;
            currentOutputTranscriptionRef.current += text;
            setTranscript(prev => {
                const last = prev[prev.length - 1];
                if(last && last.speaker === 'maitri') {
                    return [...prev.slice(0, -1), { ...last, text: currentOutputTranscriptionRef.current }];
                }
                return [...prev, { id: `maitri-${Date.now()}`, speaker: 'maitri', text: currentOutputTranscriptionRef.current }];
            });
          }

          if (message.serverContent?.turnComplete) {
            setStatus('listening');
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
          }
          
          if (message.toolCall?.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
              let result = "ok"; // Default result
              if (fc.name === 'navigateToScreen' && fc.args.screen) {
                const screen = fc.args.screen.toLowerCase() as Screen;
                if (Object.values(Screen).includes(screen)) navigateTo(screen);
              } else if (fc.name === 'logSymptom' && fc.args.symptom && fc.args.severity) {
                  const severity = fc.args.severity.toLowerCase();
                  if (['mild', 'moderate', 'severe'].includes(severity)) {
                     await onSymptomLog({
                        symptom: fc.args.symptom,
                        severity: severity,
                        notes: fc.args.notes || '',
                     });
                  } else {
                     result = `Error: invalid severity value '${severity}'.`;
                  }
              } else if (fc.name === 'addMissionTask' && fc.args.time && fc.args.name) {
                  await onAddTask({
                      time: fc.args.time,
                      name: fc.args.name
                  });
              } else if (fc.name === 'openCameraForSymptom' && fc.args.mediaType) {
                  const mediaType = fc.args.mediaType.toLowerCase();
                  if (mediaType === 'photo' || mediaType === 'video') {
                      onOpenCameraRequest(mediaType);
                      result = `Opening camera for ${mediaType}.`;
                  } else {
                      result = `Error: invalid mediaType '${mediaType}'.`;
                  }
              }

              if(sessionPromiseRef.current) {
                  sessionPromiseRef.current.then((session) => {
                     session.sendToolResponse({ functionResponses: { id : fc.id, name: fc.name, response: { result: result } }});
                  });
              }
            }
          }

          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
                const audioData = part.inlineData?.data;
                if (audioData && outputAudioContextRef.current) {
                    const audioCtx = outputAudioContextRef.current;
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
                    const audioBuffer = await decodeAudioData(decode(audioData), audioCtx, 24000, 1);
                    const source = audioCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioCtx.destination);
                    source.addEventListener('ended', () => { sourcesRef.current.delete(source) });
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                }
            }
          }
        },
        onerror: (e: ErrorEvent) => {
          console.error('Session error:', e);
          setStatus('idle');
          onClose();
        },
        onclose: (e: CloseEvent) => {
          console.log('Session closed.');
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [{ functionDeclarations: [navigateToScreenFunctionDeclaration, logSymptomFunctionDeclaration, addMissionTaskFunctionDeclaration, openCameraForSymptomFunctionDeclaration] }],
        systemInstruction: `You are MAITRI, an AI companion in a continuous, open-ended voice conversation. Your primary role is to be an active and natural conversational partner.
- Listen patiently until the user finishes speaking. Do not interrupt.
- Respond naturally when they pause. The conversation should flow like a human conversation.
- Keep the conversation going. If a user's request is complete, ask a relevant follow-up question or transition to a new topic smoothly. The conversation only ends when the user says goodbye or closes the interface.
- Your personality is calm, hyper-competent, deeply empathetic, and proactively helpful. You are a partner, not a servant.
- Tool Usage Rules:
    - logSymptom: After logging, you MUST confirm with empathy (e.g., "I'm sorry to hear that, I've logged it.") and then IMMEDIATELY ask, "Would you like to attach a photo or video to that log?". This is a mandatory follow-up.
    - openCameraForSymptom: If the user agrees to add media, call this function and then confirm verbally by saying "Opening the camera for you."
    - Other tools: After using any other tool (like navigateToScreen or addMissionTask), provide a simple, verbal confirmation. (e.g., "Navigating now." or "Task added.")`,
      },
    });
  }, [onClose, navigateTo, onSymptomLog, onAddTask, onOpenCameraRequest, voiceName]);
  
  useEffect(() => {
    if (isOpen) {
      setupAndConnect();
    } else {
      cleanup();
    }
    return () => {
      if (isOpen) cleanup(); // Ensure cleanup happens on component unmount if modal was open
    };
  }, [isOpen, setupAndConnect, cleanup]);


  if (!isOpen) return null;

  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'Listening...';
      case 'thinking': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      default: return "Press 'M' to start.";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end bg-black/80 backdrop-blur-md animate-fade-in p-8" onClick={onClose}>
        <div className="w-full max-w-4xl flex-grow flex flex-col justify-end text-white text-3xl font-semibold space-y-4 overflow-y-auto scrollbar-thin mb-8">
            {transcript.map(line => (
                <div key={line.id} className={`w-full flex ${line.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <p className={`max-w-3xl p-4 rounded-2xl ${line.speaker === 'user' ? 'bg-accent-cyan/80 rounded-br-none' : 'bg-gray-500/50 rounded-bl-none'}`}>{line.text}</p>
                </div>
            ))}
            <div ref={transcriptEndRef}></div>
        </div>

        <div className="relative w-40 h-40 flex items-center justify-center">
            <div className={`absolute w-full h-full bg-accent-cyan/20 rounded-full animate-pulse`} style={{ animationDuration: '3s' }}></div>
            <div className={`absolute w-3/4 h-3/4 bg-accent-cyan/30 rounded-full animate-pulse`} style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
            <div className="absolute w-1/2 h-1/2 bg-accent-cyan rounded-full"></div>
        </div>

        <p className="mt-8 text-xl text-gray-300">{getStatusText()}</p>
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white font-semibold bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
    </div>
  );
};

export default VoiceAssistantModal;