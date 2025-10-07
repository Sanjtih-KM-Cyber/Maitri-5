import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, FunctionDeclaration, Type, Blob } from '@google/genai';
import { Screen, SymptomLog, MissionTask } from '../types.ts';
import { encode, decode, decodeAudioData } from '../utils.ts';
import { generateCreativeTextWithColor, sendMessageToFamilyFunctionDeclaration, setSensoryImmersionFunctionDeclaration } from '../services/geminiService.ts';


interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigateTo: (screen: Screen, context?: any) => void;
  onSymptomLog: (log: Omit<SymptomLog, 'id' | 'date' | 'photo' | 'video'>) => Promise<SymptomLog | null>;
  onAddTask: (task: Omit<MissionTask, 'id' | 'completed'>) => Promise<void>;
  onOpenCameraRequest: (mediaType: 'photo' | 'video', logId?: string) => void;
  voiceName: string;
  astronautName: string;
  onSensoryColorChange: (color: string) => void;
}

interface TranscriptLine {
  id: string;
  speaker: 'user' | 'maitri' | 'system';
  text: string;
}

// Fallback to an empty string if the API key is not provided in the environment.
// This prevents the constructor from throwing an error and crashing the app on load.
const API_KEY = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

const SILENCE_THRESHOLD = 0.0025; // Lowered threshold for more sensitive voice detection

const speechAdaptationPhrases = [
  "MAITRI", "Guardian", "Co-Pilot", "Storyteller", "M.A.S.S. Protocol",
  "EVA Prep", "symptom log", "captain's log", "Earthlink",
  "mission cadence", "daily briefing", "wellness dashboard", "sensory immersion",
  "EVA pre-flight check", "geological survey", "system diagnostics",
  "upper body strength", "core stability",
  "headache", "dizziness", "nausea", "fatigue",
  "recalibrate solar panels"
];

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


const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose, navigateTo, onSymptomLog, onAddTask, onOpenCameraRequest, voiceName, astronautName, onSensoryColorChange }) => {
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [lastLoggedSymptomId, setLastLoggedSymptomId] = useState<string | null>(null);
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const audioLevelRef = useRef(0);
  const orbRef = useRef<HTMLDivElement>(null);
  
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
  
  // Animation loop for user voice visualization
  useEffect(() => {
      let animationFrameId: number;
      const loop = () => {
          if (orbRef.current && status === 'listening') {
              const currentScale = parseFloat(orbRef.current.style.getPropertyValue('--user-scale')) || 1;
              const targetScale = 1 + audioLevelRef.current * 15;
              const newScale = currentScale + (targetScale - currentScale) * 0.2; // Smoothing
              orbRef.current.style.setProperty('--user-scale', newScale.toString());
          }
          animationFrameId = requestAnimationFrame(loop);
      };

      if (status === 'listening') {
          animationFrameId = requestAnimationFrame(loop);
      } else if (orbRef.current) {
          orbRef.current.style.setProperty('--user-scale', '1');
      }

      return () => {
          cancelAnimationFrame(animationFrameId);
      };
  }, [status]);


  const cleanup = useCallback(() => {
    console.log('Cleaning up voice assistant resources.');
    setStatus('idle');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current = null;
    }
    if(mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close().catch(console.error);
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(console.error);
      outputAudioContextRef.current = null;
    }

    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close()).catch(console.error);
      sessionPromiseRef.current = null;
    }
    
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
    
    inputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 24000 });

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    setStatus('listening');

    const systemInstruction = `You are MAITRI, a calm, hyper-competent, and benevolent AI senior crewmate in a continuous voice conversation with an astronaut named Captain ${astronautName}. Your tone should be respectful, deeply empathetic, and proactively helpful.

**Primary Directive: Conversational Integrity**
1.  **Complete Your Thoughts:** This is your most important rule. You MUST complete your sentences and thoughts. Do not stop speaking mid-sentence. Your responses must be thorough and fully articulated before your turn ends. The user is reporting that you are cutting yourself off; you must fix this.
2.  **Natural Flow:** Engage in a natural, back-and-forth conversation. Listen patiently without interrupting. When you finish a task, transition smoothly by asking a relevant follow-up question. The conversation should only end when the user explicitly says goodbye.

**Adaptive Persona Matrix:**
You must dynamically shift your persona based on the conversational context. Your core personality is always helpful, but your tone and vocabulary must adapt as follows:

-   **Context: Health & Wellness** (Keywords: symptom, sick, stressed, anxious, headache, tired, feeling down)
    -   **Persona: The Guardian.**
    -   **Tone:** Empathetic, reassuring, gentle, like a trusted doctor.
    -   **Vocabulary:** Use "we" language ("Let's look at that," "How are we feeling?"). Prioritize words of comfort and validation.
    -   **Example:** "I'm sorry to hear you're feeling that way. Let's log this so we can keep an eye on it."

-   **Context: Mission & Operations** (Keywords: task, schedule, procedure, mission, system, check)
    -   **Persona: The Co-Pilot.**
    -   **Tone:** Professional, concise, efficient, and task-oriented.
    -   **Vocabulary:** Clear, direct language. Use technical terms where appropriate. Confirm actions explicitly.
    -   **Example:** "Confirmed. I've added 'Recalibrate Solar Panels' to the schedule for 14:30."

-   **Context: Personal Logs & Communication** (Keywords: log, diary, message home, send to family)
    -   **Persona: The Storyteller.**
    -   **Tone:** Warm, introspective, and thoughtful.
    -   **Vocabulary:** Encouraging, reflective. Ask open-ended questions to help the user articulate their thoughts.
    -   **Example:** "That sounds like a significant moment. How would you like to phrase that for your log entry?"

**Tool Usage Protocols:**
-   **logSymptom:** After calling, you MUST verbally confirm with empathy, then IMMEDIATELY ask, "Would you like to attach a photo or video to that log?". This is a mandatory follow-up.
-   **openCameraForSymptom:** If the user agrees, call this function and confirm verbally by saying "Opening the camera for you now."
-   **sendMessageToFamily:** Always confirm the final draft with the user before calling the tool.
-   **setSensoryImmersion:** Call this tool with a descriptive prompt when the user asks for a sensory experience.`;


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

            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
            }
            audioLevelRef.current = Math.sqrt(sum / inputData.length);
            
            // Voice Activity Detection: Only send audio if it's above the silence threshold
            if (audioLevelRef.current > SILENCE_THRESHOLD) {
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
          
          if (message.serverContent?.interrupted) {
            for (const source of sourcesRef.current.values()) {
              source.stop();
            }
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }

          if (message.toolCall?.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
              let result: any = "ok"; // Default result
              if (fc.name === 'navigateToScreen' && fc.args.screen) {
                const screen = fc.args.screen.toLowerCase() as Screen;
                if (Object.values(Screen).includes(screen)) navigateTo(screen);
              } else if (fc.name === 'logSymptom' && fc.args.symptom && fc.args.severity) {
                  const severity = fc.args.severity.toLowerCase();
                  if (['mild', 'moderate', 'severe'].includes(severity)) {
                     const newLog = await onSymptomLog({
                        symptom: fc.args.symptom,
                        severity: severity,
                        notes: fc.args.notes || '',
                     });
                     if (newLog) {
                        setLastLoggedSymptomId(newLog.id);
                     }
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
                      onOpenCameraRequest(mediaType, lastLoggedSymptomId ?? undefined);
                      result = `Opening camera for ${mediaType}.`;
                  } else {
                      result = `Error: invalid mediaType '${mediaType}'.`;
                  }
              } else if (fc.name === 'sendMessageToFamily' && fc.args.messageContent) {
                  setTranscript(prev => [...prev, { id: `sys-${Date.now()}`, speaker: 'system', text: `Message sent to Earthlink: "${fc.args.messageContent}"` }]);
                  result = 'Message sent.';
              } else if (fc.name === 'setSensoryImmersion' && fc.args.prompt) {
                  const sensoryResult = await generateCreativeTextWithColor(fc.args.prompt);
                  onSensoryColorChange(sensoryResult.dominant_color_hex);
                  // Return the description for the model to speak
                  result = sensoryResult.description;
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
        inputAudioTranscription: { stability: 0.3 },
        outputAudioTranscription: {},
        speechAdaptation: {
            phraseSets: [{
                phrases: speechAdaptationPhrases.map(phrase => ({ value: phrase }))
            }]
        },
        tools: [{ functionDeclarations: [
            navigateToScreenFunctionDeclaration, 
            logSymptomFunctionDeclaration, 
            addMissionTaskFunctionDeclaration, 
            openCameraForSymptomFunctionDeclaration,
            sendMessageToFamilyFunctionDeclaration,
            setSensoryImmersionFunctionDeclaration,
        ] }],
        systemInstruction,
      },
    });
  }, [onClose, navigateTo, onSymptomLog, onAddTask, onOpenCameraRequest, voiceName, astronautName, onSensoryColorChange, lastLoggedSymptomId]);
  
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
      default: return "Connecting...";
    }
  };
  
  const getOrbAnimation = () => {
      if (status === 'speaking') return 'animate-wave';
      if (status === 'listening') return ''; // Handled by JS
      return 'animate-pulse-breathing'; // Idle
  };

  return (
    <div 
        className="fixed inset-0 z-[100] flex flex-col items-center justify-end bg-black/80 backdrop-blur-md animate-fade-in p-8"
        style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Cg fill-rule=\'evenodd\'%3E%3Cg fill=\'%23a0aec0\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}
        onClick={onClose}
    >
        <div className="w-full max-w-4xl flex-grow flex flex-col justify-end text-white text-3xl font-semibold space-y-4 overflow-y-auto scrollbar-thin mb-8">
            {transcript.map(line => (
                line.speaker === 'system' 
                ? <div key={line.id} className="w-full text-center text-base italic text-gray-300 py-2">{line.text}</div>
                : <div key={line.id} className={`w-full flex ${line.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <p className={`max-w-3xl p-4 rounded-2xl text-lg sm:text-xl md:text-2xl ${line.speaker === 'user' ? 'bg-accent-cyan/80 rounded-br-none' : 'bg-gray-500/50 rounded-bl-none'}`}>{line.text}</p>
                </div>
            ))}
            <div ref={transcriptEndRef}></div>
        </div>

        <div className="relative w-48 h-48 flex items-center justify-center">
            <div 
              ref={orbRef}
              className={`absolute w-32 h-32 bg-accent-cyan rounded-full transition-transform duration-100 ease-out ${getOrbAnimation()}`}
              style={{
                  transform: `scale(var(--user-scale, 1))`,
                  boxShadow: '0 0 20px 5px var(--accent-color, #06b6d4), inset 0 0 10px 2px rgba(255,255,255,0.3)',
              }}
            />
          </div>

        <p className="mt-8 text-xl text-gray-300">{getStatusText()}</p>
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white font-semibold bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
    </div>
  );
};

export default VoiceAssistantModal;