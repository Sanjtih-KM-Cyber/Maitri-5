import React, { useState, useEffect } from 'react';
import ChangePasswordModal from './ChangePasswordModal';
import ChangeSecurityQuestionModal from './ChangeSecurityQuestionModal';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  onLogout: () => void;
  isTtsEnabled: boolean;
  onTtsToggle: () => void;
  maitriVoice: string;
  onMaitriVoiceChange: (voice: string) => void;
}

const Toggle: React.FC<{ label: string; enabled: boolean; onChange: () => void }> = ({ label, enabled, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-700 dark:text-gray-300">{label}</span>
    <button
      onClick={onChange}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-accent-cyan' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  </div>
);

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  isOpen, onClose, accentColor, onAccentColorChange, onLogout, 
  isTtsEnabled, onTtsToggle,
  maitriVoice, onMaitriVoiceChange
}) => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  const maitriVoices = [
      { name: 'Zephyr (Default)', value: 'Zephyr' },
      { name: 'Puck', value: 'Puck' },
      { name: 'Charon', value: 'Charon' },
      { name: 'Kore', value: 'Kore' },
      { name: 'Fenrir', value: 'Fenrir' },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'bg-black/60' : 'bg-transparent pointer-events-none'}`}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-gray-100 dark:bg-space-dark shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-300/20 dark:border-slate-500/20 flex flex-col`}
        >
          <div className="p-6 flex-grow overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h2>
              <button onClick={onClose} className="p-2 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b border-gray-300 dark:border-gray-600 pb-2 text-gray-800 dark:text-gray-200">Preferences</h3>
              
              <Toggle label="Text-to-Speech (TTS)" enabled={isTtsEnabled} onChange={onTtsToggle} />
              
              <div>
                <label htmlFor="maitri-voice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">MAITRI Voice</label>
                <select 
                  id="maitri-voice" 
                  value={maitriVoice}
                  onChange={(e) => onMaitriVoiceChange(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent-cyan focus:border-accent-cyan"
                >
                  {maitriVoices.map(voice => (
                    <option key={voice.value} value={voice.value}>{voice.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This voice is used for the voice assistant and other system-wide announcements.</p>
              </div>

               <div>
                <label htmlFor="accent-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Accent Color</label>
                <input 
                  type="color" 
                  id="accent-color"
                  value={accentColor}
                  onChange={(e) => onAccentColorChange(e.target.value)}
                  className="w-full h-10 p-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                />
              </div>

              <h3 className="text-lg font-semibold border-b border-gray-300 dark:border-gray-600 pb-2 pt-4 text-gray-800 dark:text-gray-200">Account</h3>
              <button onClick={() => setIsPasswordModalOpen(true)} className="w-full text-left p-3 rounded-md bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200">Change Password</button>
              <button onClick={() => setIsSecurityModalOpen(true)} className="w-full text-left p-3 rounded-md bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200">Change Security Question</button>
            </div>
          </div>

          <div className="p-6 border-t border-gray-300 dark:border-gray-600">
            <button 
              onClick={onLogout}
              className="w-full bg-red-600/80 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
      <ChangeSecurityQuestionModal isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} />
    </>
  );
};

export default SettingsPanel;