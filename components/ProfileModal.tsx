
import React from 'react';
import Avatar from './Avatar';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  photoUrl: string | null;
  designation: string;
}

const ProfileInfo: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 py-2">
        <span className="font-semibold text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-gray-800 dark:text-gray-200">{value}</span>
    </div>
);

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, name, photoUrl, designation }) => {
  if (!isOpen) return null;

  // Mock data for fields not in the main data model yet
  const astronautData = {
    affiliation: "ISRO",
    birthdate: "2052-08-15",
    missionDaysLeft: 187,
  };

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
    >
      <div 
        className="flex flex-col space-y-4 p-6 bg-gray-100 dark:bg-space-dark rounded-lg shadow-2xl border border-gray-300 dark:border-slate-500/20 w-11/12 max-w-sm" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center space-y-2">
            <Avatar name={name} photoUrl={photoUrl} className="w-24 h-24 rounded-full border-2 border-accent-cyan text-4xl"/>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white capitalize">{name}</h2>
            <p className="text-accent-cyan capitalize">{designation}</p>
        </div>
        
        <div className="space-y-2 pt-4">
            <ProfileInfo label="Affiliation" value={astronautData.affiliation} />
            <ProfileInfo label="Birthdate" value={astronautData.birthdate} />
            <ProfileInfo label="Days Remaining" value={astronautData.missionDaysLeft.toString()} />
        </div>

        <button 
            onClick={onClose} 
            className="mt-4 w-full py-2 px-6 font-bold text-white rounded-lg transition-colors bg-accent-cyan hover:opacity-80"
        >
            Close
        </button>
      </div>
    </div>
  );
};

export default ProfileModal;
