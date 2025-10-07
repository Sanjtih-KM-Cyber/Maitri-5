
import React from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

interface TopRightControlsProps {
    onOpenSettings: () => void;
    onOpenProfile: () => void;
    onOpenVoiceAssistant: () => void;
}

const TopRightControls: React.FC<TopRightControlsProps> = ({ onOpenSettings, onOpenProfile, onOpenVoiceAssistant }) => {
    const { theme, toggleTheme } = React.useContext(ThemeContext);

    const nextTheme = theme === 'dark' ? 'Light' : theme === 'light' ? 'Circadian' : 'Dark';

    return (
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 sm:space-x-4">
             <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-900/50 backdrop-blur-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title={`Switch to ${nextTheme} mode`}
            >
                {theme === 'dark' ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : theme === 'light' ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                ) : ( // Circadian
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
            </button>
             <button
                onClick={onOpenVoiceAssistant}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-900/50 backdrop-blur-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title="Activate Voice Assistant (M)"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>
            <button
                onClick={onOpenProfile}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-900/50 backdrop-blur-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title="Profile"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </button>
            <button
                onClick={onOpenSettings}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-900/50 backdrop-blur-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title="Settings"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
        </div>
    );
};

export default TopRightControls;
