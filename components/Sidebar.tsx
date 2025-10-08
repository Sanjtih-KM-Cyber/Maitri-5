
import React, { useState } from 'react';
import { Screen } from '../types.ts';

interface SidebarProps {
  currentScreen: Screen;
  navigateTo: (screen: Screen) => void;
}

const NavItem: React.FC<{
    screen: Screen;
    currentScreen: Screen;
    navigateTo: (screen: Screen) => void;
    icon: React.ReactNode;
    label: string;
    isExpanded: boolean;
}> = ({ screen, currentScreen, navigateTo, icon, label, isExpanded }) => (
    <button
        onClick={() => navigateTo(screen)}
        className={`flex items-center w-full p-3 my-1 rounded-lg transition-colors duration-200 ${
            currentScreen === screen
                ? 'bg-accent-cyan text-white shadow-lg'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title={isExpanded ? '' : label}
        aria-label={label}
    >
        <span className="flex-shrink-0 w-6 h-6">{icon}</span>
        <span className={`ml-4 font-semibold whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {label}
        </span>
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentScreen, navigateTo }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <aside className={`flex flex-col bg-gray-200/50 dark:bg-gray-900/50 backdrop-blur-lg p-4 transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-20'}`}>
            <div className={`flex items-center mb-8 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
                 <div className={`flex items-center space-x-2 text-2xl font-bold text-gray-800 dark:text-white overflow-hidden transition-opacity duration-200 ${isExpanded ? 'opacity-100 whitespace-nowrap' : 'opacity-0 pointer-events-none'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-accent-cyan flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>MAITRI</span>
                </div>
                <button onClick={() => setIsExpanded(!isExpanded)} aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700">
                    {isExpanded ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    )}
                </button>
            </div>

            <nav className="flex-grow">
                <NavItem
                    screen={Screen.Home} currentScreen={currentScreen} navigateTo={navigateTo} isExpanded={isExpanded}
                    label="Dashboard"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                />
                <NavItem
                    screen={Screen.Guardian} currentScreen={currentScreen} navigateTo={navigateTo} isExpanded={isExpanded}
                    label="Guardian"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
                />
                <NavItem
                    screen={Screen.CoPilot} currentScreen={currentScreen} navigateTo={navigateTo} isExpanded={isExpanded}
                    label="Co-Pilot"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                />
                <NavItem
                    screen={Screen.Storyteller} currentScreen={currentScreen} navigateTo={navigateTo} isExpanded={isExpanded}
                    label="Storyteller"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                />
                 <NavItem
                    screen={Screen.Recreation} currentScreen={currentScreen} navigateTo={navigateTo} isExpanded={isExpanded}
                    label="Recreation"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
            </nav>
        </aside>
    );
};

export default Sidebar;
