import React, { useState, useEffect, useCallback } from 'react';
import { Screen, MissionTask, MissionProcedure } from '../types.ts';
import GlassCard from '../components/GlassCard.tsx';
import { useTTS } from '../hooks/useTTS.ts';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.ts';

// --- Interactive Procedure Assistant Component ---
interface ProcedureRunnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    procedure: MissionProcedure | null;
    isTtsEnabled: boolean;
    ttsVoice: string;
}

const confirmationKeywords = ["check", "confirm", "acknowledged", "done", "next", "ok", "okay"];

const ProcedureRunnerModal: React.FC<ProcedureRunnerModalProps> = ({ isOpen, onClose, procedure, isTtsEnabled, ttsVoice }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const { speak, cancel: cancelTTS } = useTTS();
    const { isListening, transcript, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition();

    const currentStep = procedure?.steps[currentStepIndex];

    const advanceStep = useCallback(() => {
        if (procedure && currentStepIndex < procedure.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            speak("Procedure complete.", ttsVoice);
            onClose(); // End of procedure
        }
    }, [procedure, currentStepIndex, onClose, speak, ttsVoice]);

    useEffect(() => {
        if (isOpen && currentStep && isTtsEnabled) {
            speak(`Step ${currentStepIndex + 1}: ${currentStep.text}`, ttsVoice);
        }
    }, [isOpen, currentStep, currentStepIndex, isTtsEnabled, speak, ttsVoice]);

    useEffect(() => {
        if (transcript && confirmationKeywords.some(kw => transcript.toLowerCase().includes(kw))) {
            advanceStep();
        }
    }, [transcript, advanceStep]);

    useEffect(() => {
        if (!isOpen) {
            setCurrentStepIndex(0);
            cancelTTS();
            stopListening();
        } else if (hasRecognitionSupport) {
            startListening();
        }
    }, [isOpen, cancelTTS, stopListening, hasRecognitionSupport, startListening]);

    if (!isOpen || !procedure) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-4">
            <div className="w-full max-w-2xl bg-gray-100 dark:bg-space-dark/80 rounded-lg shadow-2xl p-8 text-center flex flex-col" style={{ minHeight: '50vh' }}>
                <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">{procedure.name}</h2>
                <p className="text-lg mb-6 text-gray-600 dark:text-gray-300">Step {currentStepIndex + 1} of {procedure.steps.length}</p>
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-4xl font-semibold text-gray-800 dark:text-white">{currentStep?.text}</p>
                </div>
                <div className="mt-8 flex items-center justify-center space-x-4">
                    {hasRecognitionSupport && (
                        <button onClick={isListening ? stopListening : startListening} className={`p-4 rounded-full transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400 dark:bg-gray-600'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                    )}
                    <button onClick={advanceStep} className="px-8 py-4 bg-accent-cyan text-white font-bold rounded-lg text-xl">
                        Next Step
                    </button>
                </div>
            </div>
            <button onClick={onClose} className="mt-6 px-6 py-2 text-white font-semibold bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                Abort Procedure
            </button>
        </div>
    );
};


// --- Main CoPilot Screen Component ---
interface CoPilotScreenProps {
  navigateTo: (screen: Screen, context?: any) => void;
  onClose: () => void;
  procedures: MissionProcedure[];
  tasks: MissionTask[];
  onTasksUpdate: (newTasks: MissionTask[]) => void;
  onTaskComplete: (taskId: number) => void;
  isTtsEnabled: boolean;
  ttsVoice: string;
}

const CoPilotScreen: React.FC<CoPilotScreenProps> = ({ navigateTo, onClose, procedures, tasks, onTasksUpdate, onTaskComplete, isTtsEnabled, ttsVoice }) => {
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskTime, setNewTaskTime] = useState('');
    const [isProcedureModalOpen, setIsProcedureModalOpen] = useState(false);
    const [activeProcedure, setActiveProcedure] = useState<MissionProcedure | null>(null);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskName || !newTaskTime) return;
        const newTask: MissionTask = { id: Date.now(), time: newTaskTime, name: newTaskName, completed: false };
        const sortedTasks = [...tasks, newTask].sort((a, b) => a.time.localeCompare(b.time));
        onTasksUpdate(sortedTasks);
        setNewTaskName('');
        setNewTaskTime('');
    };
    
    const handleDeleteTask = (taskId: number) => {
        onTasksUpdate(tasks.filter(task => task.id !== taskId));
    };
    
    const handleProcedureClick = (procedure: MissionProcedure) => {
        setActiveProcedure(procedure);
        setIsProcedureModalOpen(true);
    };

    return (
    <>
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Co-Pilot Module</h1>
              <button onClick={onClose} className="p-2 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
          </div>
          
          <GlassCard onClick={() => navigateTo(Screen.Chat, "The user wants to discuss mission tasks. Adopt the Co-Pilot persona.")} className="p-6 text-center group">
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white group-hover:text-accent-cyan transition-colors">Ask Co-Pilot a Question</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Tap here to get assistance with procedures, calculations, or mission planning.</p>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 dark:border-slate-500/30 pb-2 text-gray-800 dark:text-white">Mission Cadence</h2>
                <div className="h-64 overflow-y-auto pr-2 scrollbar-thin">
                    {tasks.length > 0 ? (
                        <ul className="space-y-3">
                            {tasks.map(task => (
                                <li key={task.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50 group">
                                    <input type="checkbox" checked={task.completed} onChange={() => onTaskComplete(task.id)} className="form-checkbox h-5 w-5 rounded bg-gray-300 dark:bg-gray-600 text-accent-cyan focus:ring-accent-cyan border-gray-400 dark:border-gray-500" />
                                    <span className="font-mono text-accent-cyan">{task.time}</span>
                                    <span className={`flex-grow text-gray-700 dark:text-gray-300 ${task.completed ? 'line-through opacity-50' : ''}`}>{task.name}</span>
                                    <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 italic">No tasks scheduled. Add one below.</p>
                        </div>
                    )}
                </div>
                <form onSubmit={handleAddTask} className="mt-4 flex space-x-2">
                    <input type="time" value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} required className="p-2 rounded-md bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 w-28 font-mono"/>
                    <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="New personal task..." required className="flex-grow p-2 rounded-md bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600"/>
                    <button type="submit" className="p-2 w-10 bg-accent-cyan text-white rounded-md font-bold text-lg">+</button>
                </form>
            </GlassCard>
            
            <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 dark:border-slate-500/30 pb-2 text-gray-800 dark:text-white">Interactive Procedures</h2>
                <div className="space-y-3 h-80 overflow-y-auto pr-2 scrollbar-thin">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Select a procedure from Mission Control to begin.</p>
                    {procedures && procedures.length > 0 ? procedures.map(proc => (
                        <button key={proc.id} onClick={() => handleProcedureClick(proc)} className="w-full text-left p-3 rounded-md bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200">
                            {proc.name}
                        </button>
                    )) : ( 
                        <div className="flex items-center justify-center h-full pt-8">
                            <p className="p-3 text-gray-500 dark:text-gray-400 italic">No procedures assigned by Mission Control.</p>
                        </div>
                     )}
                </div>
            </GlassCard>
          </div>
        </div>
        <ProcedureRunnerModal isOpen={isProcedureModalOpen} onClose={() => setIsProcedureModalOpen(false)} procedure={activeProcedure} isTtsEnabled={isTtsEnabled} ttsVoice={ttsVoice} />
    </>
  );
};

export default CoPilotScreen;