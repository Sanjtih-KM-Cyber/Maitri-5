
import React, { useState, useEffect } from 'react';
import { maitriApiService } from '../services/maitriApiService.ts';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'enterName' | 'answerQuestion' | 'resetPassword' | 'success';

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<Step>('enterName');
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
        setTimeout(() => {
            setStep('enterName');
            setName('');
            setQuestion('');
            setAnswer('');
            setNewPassword('');
            setConfirmPassword('');
            setError('');
            setIsLoading(false);
        }, 300);
    }
  }, [isOpen]);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        const userQuestion = await maitriApiService.getSecurityQuestion(name);
        if (userQuestion) {
            setQuestion(userQuestion);
            setStep('answerQuestion');
        } else {
            setError('Astronaut not found. Please check the name.');
        }
    } catch (err) {
        setError((err as Error).message || 'Astronaut not found.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        const isCorrect = await maitriApiService.verifySecurityAnswer(name, answer);
        if (isCorrect) {
            setStep('resetPassword');
        } else {
            setError('Incorrect answer. Please try again.');
        }
    } catch (err) {
        setError((err as Error).message || 'Verification failed.');
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setIsLoading(true);
    try {
        await maitriApiService.resetPassword(name, answer, newPassword);
        setStep('success');
    } catch (err) {
        setError((err as Error).message || 'Failed to reset password.');
    } finally {
        setIsLoading(false);
    }
  };
  
  const renderContent = () => {
    switch (step) {
      case 'answerQuestion':
        return (
          <form onSubmit={handleAnswerSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Answer Security Question</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{question}</p>
            <input type="text" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your Answer" required className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent-cyan focus:border-accent-cyan"/>
            <button type="submit" disabled={isLoading} className="w-full px-4 py-2 font-semibold text-white bg-accent-cyan rounded-lg hover:opacity-80 disabled:bg-gray-500">{isLoading ? 'Verifying...' : 'Verify'}</button>
          </form>
        );
      case 'resetPassword':
        return (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Reset Your Password</h2>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" required className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent-cyan focus:border-accent-cyan"/>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" required className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent-cyan focus:border-accent-cyan"/>
            <button type="submit" disabled={isLoading} className="w-full px-4 py-2 font-semibold text-white bg-accent-cyan rounded-lg hover:opacity-80 disabled:bg-gray-500">{isLoading ? 'Resetting...' : 'Reset Password'}</button>
          </form>
        );
      case 'success':
        return (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold text-green-500">Password Reset Successfully!</h2>
            <p className="text-gray-600 dark:text-gray-400">You can now login with your new password.</p>
            <button onClick={onClose} className="w-full px-4 py-2 font-semibold text-white bg-accent-cyan rounded-lg hover:opacity-80">Close</button>
          </div>
        );
      case 'enterName':
      default:
        return (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Forgot Password</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Enter your name to begin the recovery process.</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" required className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent-cyan focus:border-accent-cyan"/>
            <button type="submit" disabled={isLoading} className="w-full px-4 py-2 font-semibold text-white bg-accent-cyan rounded-lg hover:opacity-80 disabled:bg-gray-500">{isLoading ? 'Searching...' : 'Next'}</button>
          </form>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="flex flex-col space-y-4 p-6 bg-gray-100 dark:bg-space-dark rounded-lg shadow-2xl border border-gray-300 dark:border-slate-500/20 w-11/12 max-w-sm" 
        onClick={e => e.stopPropagation()}
      >
        {error && <p className="text-red-400 text-sm mb-2 bg-red-500/10 p-2 rounded-md text-center">{error}</p>}
        {renderContent()}
         <button type="button" onClick={onClose} className="text-xs text-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 mt-2">Cancel</button>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
