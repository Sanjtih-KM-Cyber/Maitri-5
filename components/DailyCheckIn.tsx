
import React, { useState } from 'react';
import type { Mood, SleepQuality } from '../types.ts';

interface DailyCheckInProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (mood: Mood, sleep: SleepQuality) => void;
}

const moods: Mood[] = ['Excellent', 'Good', 'Okay', 'Tired', 'Stressed'];
const sleepHours: SleepQuality[] = ['< 6 hours', '6-7 hours', '7-8 hours', '8+ hours'];

const DailyCheckIn: React.FC<DailyCheckInProps> = ({ isOpen, onSubmit }) => {
  const [selectedMood, setSelectedMood] = useState<Mood>('Good');
  const [selectedSleep, setSelectedSleep] = useState<SleepQuality>('7-8 hours');

  const handleSubmit = () => {
    onSubmit(selectedMood, selectedSleep);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" aria-modal="true" role="dialog">
      <div 
        className="flex flex-col space-y-6 p-8 bg-gray-100 dark:bg-space-dark/80 rounded-lg shadow-2xl border border-slate-300/20 dark:border-slate-500/20 w-11/12 max-w-lg" 
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white text-center">Daily Check-In</h2>
        
        <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">How are you feeling today?</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {moods.map(mood => (
                    <button 
                        key={mood} 
                        onClick={() => setSelectedMood(mood)}
                        className={`p-3 rounded-lg font-semibold transition-colors ${selectedMood === mood ? 'bg-accent-cyan text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    >{mood}</button>
                ))}
            </div>
        </div>
        
        <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">How much sleep did you get?</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                 {sleepHours.map(hours => (
                    <button 
                        key={hours} 
                        onClick={() => setSelectedSleep(hours)}
                        className={`p-3 rounded-lg font-semibold transition-colors ${selectedSleep === hours ? 'bg-accent-cyan text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    >{hours}</button>
                ))}
            </div>
        </div>

        <button 
            onClick={handleSubmit} 
            className="w-full mt-4 bg-accent-cyan text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 transition-colors"
        >
            Submit Daily Report
        </button>
      </div>
    </div>
  );
};

export default DailyCheckIn;
