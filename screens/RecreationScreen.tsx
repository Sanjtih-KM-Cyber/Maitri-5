
import React, { useState } from 'react';
import { Screen } from '../types';
import GlassCard from '../components/GlassCard';
import { generateCreativeText } from '../services/geminiService';

interface RecreationScreenProps {
  navigateTo: (screen: Screen, context?: any) => void;
  onClose: () => void;
}

const RecreationScreen: React.FC<RecreationScreenProps> = ({ navigateTo, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [generatedText, setGeneratedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setGeneratedText('');
        try {
            const systemInstruction = "You are an AI designed to spark creativity and provide entertainment. Generate a short, imaginative piece based on the user's prompt. It could be a story, a poem, or a descriptive scene.";
            const result = await generateCreativeText(prompt, systemInstruction);
            setGeneratedText(result);
        } catch (error) {
            setGeneratedText("I'm having trouble connecting to my creative core. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Recreation Officer</h1>
                <button onClick={onClose} className="p-2 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Imagination Engine</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">Give me a prompt, and I'll generate a short story, poem, or scene to help you relax and unwind.</p>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A robot tending a garden on Mars"
                        className="w-full p-3 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-cyan"
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleGenerate()}
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt}
                        className="p-3 bg-accent-cyan text-white rounded-lg disabled:bg-gray-400"
                    >
                        {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                </div>

                {generatedText && (
                    <div className="mt-6 p-4 bg-gray-200/50 dark:bg-gray-900/50 rounded-lg">
                        <p className="whitespace-pre-wrap">{generatedText}</p>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

export default RecreationScreen;