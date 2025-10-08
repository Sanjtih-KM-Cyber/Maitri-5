
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MassProtocol } from '../types.ts';

interface WorkoutTimerProps {
  isOpen: boolean;
  onClose: () => void;
  protocol: MassProtocol | null;
  isTtsEnabled: boolean;
  ttsVoice: string;
  speak: (text: string, voiceName: string) => void;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const motivationalMessages: { [key: number]: string } = {
  75: "Great start. Focus on your form. Every repetition is a victory against microgravity.",
  50: "You're halfway there. Keep that intensity up. Your body is adapting and getting stronger.",
  25: "Push through! This is where the real gains are made. Just a little more.",
};

const WorkoutTimer: React.FC<WorkoutTimerProps> = ({ isOpen, onClose, protocol, isTtsEnabled, ttsVoice, speak }) => {
  const [phase, setPhase] = useState<'idle' | 'working' | 'resting' | 'finished'>('idle');
  const [currentSet, setCurrentSet] = useState(1);
  const [timeLeftInPhase, setTimeLeftInPhase] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  
  const spokenMilestones = useRef(new Set<number>());
  const totalDurationForSet = useMemo(() => protocol?.duration || 0, [protocol]);

  // Reset and initialize timer when a new protocol is started
  useEffect(() => {
    if (isOpen && protocol) {
      setCurrentSet(1);
      setTimeLeftInPhase(protocol.duration);
      setPhase('working');
      setIsPaused(false);
      spokenMilestones.current.clear();
      if (isTtsEnabled) speak(`Beginning ${protocol.name}. First set starts now.`, ttsVoice);
    } else {
      setPhase('idle');
      setIsPaused(true);
    }
  }, [isOpen, protocol]);

  // The main timer tick logic
  useEffect(() => {
    if (!isOpen || isPaused || phase === 'finished' || phase === 'idle') return;

    const interval = setInterval(() => {
      setTimeLeftInPhase(prev => {
        if (prev <= 1) {
          // Transition to next phase
          if (phase === 'working') {
            if (currentSet < protocol!.sets) {
              setPhase('resting');
              setTimeLeftInPhase(protocol!.rest);
              if (isTtsEnabled) speak(`Set ${currentSet} complete. Well done. Rest for ${protocol!.rest} seconds.`, ttsVoice);
            } else {
              setPhase('finished');
              if (isTtsEnabled) speak(`M.A.S.S. Protocol complete. Fantastic work, Captain.`, ttsVoice);
            }
          } else if (phase === 'resting') {
            setCurrentSet(prevSet => prevSet + 1);
            setPhase('working');
            setTimeLeftInPhase(protocol!.duration);
            spokenMilestones.current.clear();
            if (isTtsEnabled) speak(`Starting set ${currentSet + 1}.`, ttsVoice);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, phase, currentSet, protocol, isTtsEnabled, speak, ttsVoice]);
  
  // Motivational TTS cues logic
  useEffect(() => {
      if (phase === 'working' && isTtsEnabled && !isPaused && totalDurationForSet > 0) {
        const percentageLeft = Math.round((timeLeftInPhase / totalDurationForSet) * 100);
        
        for (const milestone of Object.keys(motivationalMessages).map(Number)) {
            if (percentageLeft <= milestone && !spokenMilestones.current.has(milestone)) {
                speak(motivationalMessages[milestone], ttsVoice);
                spokenMilestones.current.add(milestone);
            }
        }
    }
  }, [timeLeftInPhase, phase, isTtsEnabled, ttsVoice, speak, isPaused, totalDurationForSet]);

  if (!isOpen || !protocol) return null;
  
  const handleReset = () => {
      setTimeLeftInPhase(totalDurationForSet);
      setIsPaused(false);
      spokenMilestones.current.clear();
      if (isTtsEnabled) speak(`Resetting current set.`, ttsVoice);
  };
  
  const progress = phase === 'working' 
    ? (totalDurationForSet - timeLeftInPhase) / totalDurationForSet 
    : phase === 'resting'
    ? (protocol.rest - timeLeftInPhase) / protocol.rest
    : 1;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-space-dark/90 backdrop-blur-md animate-fade-in p-4">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-white">{protocol.name}</h2>
            {phase !== 'finished' && (
                <p className="text-xl text-gray-300 mt-1">Set {currentSet} of {protocol.sets}</p>
            )}
        </div>
        
        <div className="relative my-12 w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
            <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                <circle className="text-gray-700" strokeWidth="5" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                <circle 
                    className="text-accent-cyan" 
                    strokeWidth="5" 
                    strokeDasharray={2 * Math.PI * 45}
                    strokeDashoffset={(2 * Math.PI * 45) * (1 - progress)}
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="45" 
                    cx="50" 
                    cy="50"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear' }}
                />
            </svg>
            <div className="z-10 text-center">
                {phase === 'finished' ? (
                     <div className="flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-2xl font-bold text-white mt-4">Workout Complete!</p>
                     </div>
                ) : (
                    <>
                        <p className="font-mono text-5xl sm:text-7xl text-white tracking-widest">{formatTime(timeLeftInPhase)}</p>
                        <p className="text-lg uppercase tracking-widest mt-2 font-semibold" style={{ color: phase === 'resting' ? '#FBBF24' : '#FFFFFF' }}>
                            {phase === 'working' ? 'WORK' : 'REST'}
                        </p>
                    </>
                )}
            </div>
        </div>

        <div className="flex w-full max-w-xs justify-center space-x-4">
            {phase !== 'finished' ? (
                <>
                    <button 
                        onClick={() => setIsPaused(!isPaused)}
                        className="w-32 py-3 px-4 font-bold text-white rounded-lg transition-colors bg-accent-cyan hover:opacity-80"
                    >
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button 
                        onClick={handleReset}
                        className="w-32 py-3 px-4 font-bold text-gray-800 dark:text-white rounded-lg transition-colors bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                        Reset Set
                    </button>
                </>
            ) : null}
        </div>

        <button onClick={onClose} className="mt-12 px-6 py-2 text-white font-semibold bg-white/20 rounded-full hover:bg-white/30 transition-colors">
          {phase === 'finished' ? 'Close' : 'End Workout'}
        </button>

    </div>
  );
};

export default WorkoutTimer;
