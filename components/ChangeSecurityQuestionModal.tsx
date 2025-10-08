
import React from 'react';

interface ChangeSecurityQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const securityQuestions = [
    "What was the name of your first pet?",
    "What is your favorite celestial body?",
    "What was the model of your first car?",
    "What is your mother's maiden name?",
    "What was the name of your first starship captain?",
    "What is your favorite science fiction novel?",
];

const ChangeSecurityQuestionModal: React.FC<ChangeSecurityQuestionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call an API service.
    alert("Security question change functionality is mocked.");
    onClose();
  };

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-sq-title"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col space-y-4 p-6 bg-gray-100 dark:bg-space-dark rounded-lg shadow-2xl border border-gray-300 dark:border-slate-500/20 w-11/12 max-w-md" 
        onClick={e => e.stopPropagation()}
      >
        <h2 id="change-sq-title" className="text-2xl font-bold text-gray-800 dark:text-white">Change Security Question</h2>
        
        <div>
            <label htmlFor="security-question" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select a new question</label>
            <select id="security-question" required className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent-cyan focus:border-accent-cyan">
                {securityQuestions.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
        </div>
        
        <div>
            <label htmlFor="security-answer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Answer</label>
            <input type="text" id="security-answer" required className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent-cyan focus:border-accent-cyan" />
        </div>
        
         <div>
            <label htmlFor="current-password-sq" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm with Password</label>
            <input type="password" id="current-password-sq" required className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent-cyan focus:border-accent-cyan" />
        </div>

        <div className="flex justify-end items-center space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:opacity-80">Cancel</button>
            <button type="submit" className="px-4 py-2 font-semibold text-white bg-accent-cyan rounded-lg hover:opacity-80">Update Question</button>
        </div>
      </form>
    </div>
  );
};

export default ChangeSecurityQuestionModal;
