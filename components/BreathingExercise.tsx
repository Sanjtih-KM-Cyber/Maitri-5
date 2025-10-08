
import React, { useState, useEffect } from 'react';

interface BreathingExerciseProps {
  isOpen: boolean;
  onClose: () => void;
}

const BreathingExercise: React.FC<BreathingExerciseProps> = ({ isOpen, onClose }) => {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [text, setText] = useState('Get Ready...');

  useEffect(() => {
    if (!isOpen) {
      setText('Get Ready...');
      setPhase('inhale');
      return;
    }

    // FIX: Replaced NodeJS.Timeout with ReturnType<typeof setTimeout> for browser compatibility.
    let cycleTimer: ReturnType<typeof setTimeout>;
    
    const cycle = () => {
      setText('Breathe In...');
      setPhase('inhale');
      cycleTimer = setTimeout(() => {
        setText('Hold');
        setPhase('hold');
        cycleTimer = setTimeout(() => {
          setText('Breathe Out...');
          setPhase('exhale');
        }, 4000); // Hold for 4 seconds
      }, 4000); // Inhale for 4 seconds
    };

    const initialDelayTimer = setTimeout(cycle, 1500);
    const interval = setInterval(cycle, 12000); // Full cycle: 4s inhale + 4s hold + 4s exhale = 12s

    return () => {
      clearTimeout(initialDelayTimer);
      clearTimeout(cycleTimer);
      clearInterval(interval);
    };
  }, [isOpen]);
  
  if (!isOpen) return null;

  const getAnimationClass = () => {
    switch(phase) {
        case 'inhale': return 'animate-inhale';
        case 'hold': return 'animate-hold';
        case 'exhale': return 'animate-exhale';
        default: return '';
    }
  };

  return (
    <div 
        className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in"
        onClick={onClose}
    >
      <div className="relative w-64 h-64 flex items-center justify-center">
        <div className={`absolute w-full h-full bg-accent-cyan/20 rounded-full ${getAnimationClass()}`}></div>
        <div className="relative z-10 text-center">
            <p className="text-3xl font-bold text-white transition-all duration-1000">{text}</p>
        </div>
      </div>
      <button onClick={onClose} className="absolute bottom-10 px-6 py-2 text-white font-semibold bg-white/20 rounded-full hover:bg-white/30 transition-colors">
          End Exercise
      </button>
    </div>
  );
};

export default BreathingExercise;
