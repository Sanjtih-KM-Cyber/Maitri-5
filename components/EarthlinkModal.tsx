
import React, { useEffect } from 'react';
import { EarthlinkMessage } from '../types';
import { maitriService } from '../services/databaseService';

interface EarthlinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: EarthlinkMessage | null;
  onMessageViewed: () => void;
}

const EarthlinkModal: React.FC<EarthlinkModalProps> = ({ isOpen, onClose, message, onMessageViewed }) => {
    useEffect(() => {
        if (isOpen && message) {
            maitriService.markEarthlinkMessageAsViewed(message.id)
                .then(() => {
                    onMessageViewed();
                })
                .catch(err => console.error("Failed to mark message as viewed:", err));
        }
    }, [isOpen, message, onMessageViewed]);

  if (!isOpen || !message) return null;

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
    >
      <div 
        className="flex flex-col space-y-4 p-6 bg-gray-100 dark:bg-space-dark/80 rounded-lg shadow-2xl border border-gray-300 dark:border-slate-500/20 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white text-center">Message from {message.from}</h2>
        
        {message.videoUrl && (
            <div className="w-full aspect-video bg-black rounded-md flex items-center justify-center text-gray-400">
                <video 
                    src={message.videoUrl} 
                    controls 
                    autoPlay
                    className="w-full h-full rounded-md"
                >
                    Your browser does not support the video tag.
                </video>
            </div>
        )}

        {message.photoUrl && (
             <div className="w-full bg-black rounded-md flex items-center justify-center">
                <img src={message.photoUrl} alt="From Earth" className="max-w-full max-h-[60vh] rounded-md object-contain"/>
             </div>
        )}

        {message.text && (
            <div className="p-4 bg-gray-200/50 dark:bg-gray-900/50 rounded-lg">
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{message.text}</p>
            </div>
        )}

        <button 
            onClick={onClose} 
            className="mt-4 py-2 px-6 font-bold text-white rounded-lg transition-colors bg-accent-cyan hover:opacity-80 self-center"
        >
            Close
        </button>
      </div>
    </div>
  );
};

export default EarthlinkModal;
