import React from 'react';

interface LandingScreenProps {
  onEnter: () => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onEnter }) => {
  return (
    <>
      <style>{`
        #stars-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .star {
          position: absolute;
          background-color: white;
          border-radius: 50%;
          animation: twinkle linear infinite;
        }

        @keyframes twinkle {
          0% { opacity: 0; transform: scale(0.5); }
          25% { opacity: 1; }
          50% { opacity: 0.5; transform: scale(1); }
          75% { opacity: 1; }
          100% { opacity: 0; transform: scale(0.5); }
        }
      `}</style>
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-space-dark text-white p-4 relative overflow-hidden">
        <div id="stars-container">
          {Array.from({ length: 150 }).map((_, i) => {
            const size = Math.random() * 2 + 1;
            const duration = Math.random() * 5 + 3;
            const delay = Math.random() * 5;
            const top = `${Math.random() * 100}%`;
            const left = `${Math.random() * 100}%`;
            return (
              <div
                key={i}
                className="star"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  top,
                  left,
                  animationDuration: `${duration}s`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>
        
        <div className="z-10 text-center animate-fade-in flex flex-col items-center">
            <div className="flex items-center space-x-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h1 className="text-7xl md:text-8xl font-black tracking-tighter" style={{ fontFamily: 'Inter, sans-serif' }}>
                    MAITRI
                </h1>
            </div>
            <p className="text-xl md:text-2xl text-gray-300 mt-2 tracking-wide">AI Astronaut Companion</p>
            <p className="text-lg text-gray-400 mt-8 max-w-lg">
                Your partner in the final frontier. Monitoring health, managing missions, and keeping you connected.
            </p>

            <button
                onClick={onEnter}
                className="mt-12 px-12 py-4 bg-accent-cyan text-white font-bold text-lg rounded-full shadow-lg shadow-cyan-500/30 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/50 animate-wave"
            >
                Enter Mission
            </button>
        </div>
      </div>
    </>
  );
};

export default LandingScreen;
