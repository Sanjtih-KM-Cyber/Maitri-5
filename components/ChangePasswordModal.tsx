
import React from 'react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InputField: React.FC<{ label: string; id: string; type: string }> = ({ label, id, type }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input 
            type={type} 
            id={id}
            required
            className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent-cyan focus:border-accent-cyan"
        />
    </div>
);

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call an API service.
    // For now, we'll just show an alert and close the modal.
    alert("Password change functionality is mocked.");
    onClose();
  };

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col space-y-4 p-6 bg-gray-100 dark:bg-space-dark rounded-lg shadow-2xl border border-gray-300 dark:border-slate-500/20 w-11/12 max-w-sm" 
        onClick={e => e.stopPropagation()}
      >
        <h2 id="change-password-title" className="text-2xl font-bold text-gray-800 dark:text-white">Change Password</h2>
        
        <InputField label="Current Password" id="current-password" type="password" />
        <InputField label="New Password" id="new-password" type="password" />
        <InputField label="Confirm New Password" id="confirm-password" type="password" />

        <div className="flex justify-end items-center space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:opacity-80">Cancel</button>
            <button type="submit" className="px-4 py-2 font-semibold text-white bg-accent-cyan rounded-lg hover:opacity-80">Update Password</button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordModal;
