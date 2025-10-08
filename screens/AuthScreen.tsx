import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard.tsx';
import { UserData, UserType } from '../types.ts';
import ForgotPasswordModal from '../components/ForgotPasswordModal.tsx';

interface AuthScreenProps {
  onLogin: (name: string, pass: string, userType: UserType) => Promise<boolean>;
  onRegister: (name: string, data: UserData) => Promise<{ success: boolean; registeredName?: string; registeredPassword?: string, error?: string }>;
}

const securityQuestions = [
    "What was the name of your first pet?",
    "What is your favorite celestial body?",
    "What was the model of your first car?",
    "What is your mother's maiden name?",
    "What was the name of your first starship captain?",
    "What is your favorite science fiction novel?",
];

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Common state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login-specific state
  const [activeTab, setActiveTab] = useState<UserType>('astronaut');
  
  // Register-specific state
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secQuestion, setSecQuestion] = useState(securityQuestions[0]);
  const [secAnswer, setSecAnswer] = useState('');
  
  const resetFormState = () => {
    setName('');
    setPassword('');
    setConfirmPassword('');
    setSecAnswer('');
    setError('');
  };
  
  useEffect(() => {
    resetFormState();
  }, [mode]);

  useEffect(() => {
    if (successMessage) {
        const timer = setTimeout(() => setSuccessMessage(''), 5000);
        return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) {
        setError("Please enter a name and password.");
        return;
    }
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    const success = await onLogin(name, password, activeTab);
    if (!success) {
      setError('Invalid credentials. Please try again.');
    }
    setIsLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!name || !password || !secAnswer) {
        setError('Please fill out all fields.');
        return;
    }
    setIsLoading(true);
    const result = await onRegister(name, { password, securityQuestion: secQuestion, securityAnswer: secAnswer });
    if (result.success && result.registeredName && result.registeredPassword) {
        setMode('login');
        setName(result.registeredName);
        setPassword(result.registeredPassword);
        setSuccessMessage('Registration successful! Please log in.');
    } else {
        setError(result.error || 'An account with this name already exists.');
    }
    setIsLoading(false);
  };

  const renderLogin = () => (
    <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fade-in">
        <div className="flex mb-6">
            <button
                type="button"
                onClick={() => setActiveTab('astronaut')}
                className={`w-1/2 pb-2 font-semibold text-center transition-colors border-b-2 ${activeTab === 'astronaut' ? 'text-accent-cyan border-accent-cyan' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
            >Astronaut</button>
            <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`w-1/2 pb-2 font-semibold text-center transition-colors border-b-2 ${activeTab === 'admin' ? 'text-accent-cyan border-accent-cyan' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
            >Admin</button>
        </div>
        <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={activeTab === 'astronaut' ? "Enter your name" : "Admin ID"}
            className="w-full p-3 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-cyan focus:border-transparent outline-none transition text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isLoading}
        />
        <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-3 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-cyan focus:border-transparent outline-none transition text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isLoading}
        />
        <button type="submit" disabled={isLoading} className="w-full p-3 bg-accent-cyan text-white rounded-lg font-bold hover:bg-cyan-500 transition-colors disabled:bg-gray-500 flex items-center justify-center">
            {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {isLoading ? 'Logging in...' : 'Login'}
        </button>
        <div className="text-center text-sm">
            <button type="button" onClick={() => setIsForgotModalOpen(true)} className="text-gray-500 dark:text-gray-400 hover:text-accent-cyan">Forgot Password?</button>
            <span className="mx-2 text-gray-600 dark:text-gray-500">|</span>
            <button type="button" onClick={() => setMode('register')} className="text-gray-500 dark:text-gray-400 hover:text-accent-cyan">Register</button>
        </div>
    </form>
  );

  const renderRegister = () => (
    <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fade-in">
        <h3 className="text-xl font-bold text-center text-gray-800 dark:text-white">Astronaut Registration</h3>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="w-full p-3 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-cyan focus:border-transparent outline-none transition text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400" disabled={isLoading}/>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-3 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-cyan focus:border-transparent outline-none transition text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400" disabled={isLoading}/>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="w-full p-3 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-cyan focus:border-transparent outline-none transition text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400" disabled={isLoading}/>
        <select value={secQuestion} onChange={e => setSecQuestion(e.target.value)} className="w-full p-3 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-cyan focus:border-transparent outline-none transition text-gray-800 dark:text-gray-200" disabled={isLoading}>
            {securityQuestions.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
        <input type="text" value={secAnswer} onChange={(e) => setSecAnswer(e.target.value)} placeholder="Your Answer" className="w-full p-3 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-cyan focus:border-transparent outline-none transition text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400" disabled={isLoading}/>
        <button type="submit" className="w-full p-3 bg-accent-cyan text-white rounded-lg font-bold hover:bg-cyan-500 transition-colors disabled:bg-gray-500 flex items-center justify-center" disabled={isLoading}>
            {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {isLoading ? 'Registering...' : 'Register'}
        </button>
        {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 animate-fade-in">Securing your account... This may take a moment.</p>}
        <div className="text-center text-sm">
            <button type="button" onClick={() => setMode('login')} className="text-gray-500 dark:text-gray-400 hover:text-accent-cyan">Already have an account? Login</button>
        </div>
    </form>
  );

  return (
    <>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-space-dark transition-colors">
             <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/50 via-space-dark to-indigo-900/50" style={{backgroundSize: '400% 400%', animation: 'gradient 15s ease infinite' }}></div>
             <style>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
             `}</style>

            <div className="w-full max-w-md text-center z-10">
                <div className="flex items-center justify-center space-x-2 text-3xl font-bold text-gray-800 dark:text-white mb-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>MAITRI</span>
                </div>
                <GlassCard className="p-8">
                    {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-2 rounded-md animate-fade-in">{error}</p>}
                    {successMessage && <p className="text-green-400 text-sm mb-4 bg-green-500/10 p-2 rounded-md animate-fade-in">{successMessage}</p>}
                    {mode === 'login' ? renderLogin() : renderRegister()}
                </GlassCard>
            </div>
        </div>
        <ForgotPasswordModal
            isOpen={isForgotModalOpen}
            onClose={() => setIsForgotModalOpen(false)}
        />
    </>
  );
};

export default AuthScreen;