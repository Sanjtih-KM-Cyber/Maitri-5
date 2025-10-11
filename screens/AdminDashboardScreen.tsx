
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { AstronautData, SymptomLog, DoctorAdvice, MissionProcedure, MassProtocol, EarthlinkMessage } from '../types.ts';
import { maitriApiService } from '../services/maitriApiService.ts';
import Avatar from '../components/Avatar.tsx';
import { blobToDataURL } from '../utils.ts';
import { socketService } from '../services/socketService.ts';

interface AdminDashboardScreenProps {
    onLogout: () => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ onLogout }) => {
    const [astronauts, setAstronauts] = useState<AstronautData[]>([]);
    const [selectedAstronaut, setSelectedAstronaut] = useState<AstronautData | null>(null);
    const [activeTab, setActiveTab] = useState('symptoms');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const allAstronauts = await maitriApiService.getAllAstronauts();
            setAstronauts(allAstronauts);
            if (selectedAstronaut) {
                const refreshedData = allAstronauts.find(a => a.name === selectedAstronaut.name);
                setSelectedAstronaut(refreshedData || null);
            } else if (allAstronauts.length > 0) {
                setSelectedAstronaut(allAstronauts[0]);
            }
        } catch (error) {
            console.error("Failed to fetch astronaut data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedAstronaut]);

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        socketService.connect();
        
        const handleUpdate = (updatedAstronaut: AstronautData) => {
            setAstronauts(prev => 
                prev.map(astro => astro.name === updatedAstronaut.name ? updatedAstronaut : astro)
            );
            if (selectedAstronaut?.name === updatedAstronaut.name) {
                setSelectedAstronaut(updatedAstronaut);
            }
        };

        socketService.on('astronaut-data-updated', handleUpdate);

        return () => {
            socketService.off('astronaut-data-updated', handleUpdate);
            socketService.disconnect();
        };
    }, [selectedAstronaut?.name]);
    
    // State for various forms
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [replyingToSymptom, setReplyingToSymptom] = useState<SymptomLog | null>(null);
    const [replyText, setReplyText] = useState('');
    const [procName, setProcName] = useState('');
    const [procSteps, setProcSteps] = useState([{ id: `step-${Date.now()}`, text: '' }]);
    const [massName, setMassName] = useState('');
    const [massSets, setMassSets] = useState(4);
    const [massDuration, setMassDuration] = useState(45);
    const [massRest, setMassRest] = useState(60);
    const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
    const [earthlinkFrom, setEarthlinkFrom] = useState('Mission Control');
    const [earthlinkText, setEarthlinkText] = useState('');
    const [earthlinkPhoto, setEarthlinkPhoto] = useState<string | null>(null);
    const [earthlinkVideo, setEarthlinkVideo] = useState<string | null>(null);

    const handleReplySubmit = async () => {
        if (!replyText || !replyingToSymptom || !selectedAstronaut) return;
        setIsSubmitting(true);
        try {
            await maitriApiService.addDoctorAdvice(selectedAstronaut.name, { text: replyText, symptomLogId: replyingToSymptom.id });
            setReplyText('');
            setIsReplyModalOpen(false);
        } catch (error) { console.error("Failed to send reply:", error); }
        finally { setIsSubmitting(false); }
    };

    const handleProcedureSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!procName || procSteps.some(s => !s.text.trim()) || !selectedAstronaut) return;
        setIsSubmitting(true);
        try {
            await maitriApiService.assignProcedure(selectedAstronaut.name, { name: procName, steps: procSteps });
            setProcName('');
            setProcSteps([{ id: `step-${Date.now()}`, text: '' }]);
        } catch (error) { console.error("Failed to assign procedure:", error); }
        finally { setIsSubmitting(false); }
    };
    
    const handleMassSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!massName || !selectedAstronaut) return;
        setIsSubmitting(true);
        try {
            await maitriApiService.assignMassProtocol(selectedAstronaut.name, { name: massName, sets: massSets, duration: massDuration, rest: massRest });
            setMassName('');
        } catch (error) { console.error("Failed to assign MASS protocol:", error); }
        finally { setIsSubmitting(false); }
    };
    
    const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0] && selectedAstronaut) {
            setNewPhotoPreview(await blobToDataURL(e.target.files[0]));
        }
    };
    
    const handlePhotoUpdate = async () => {
        if(newPhotoPreview && selectedAstronaut) {
            setIsSubmitting(true);
            try {
                await maitriApiService.updateAstronautPhoto(selectedAstronaut.name, newPhotoPreview);
                setNewPhotoPreview(null);
            } catch(error) { console.error("Failed to update photo:", error); }
            finally { setIsSubmitting(false); }
        }
    };

    const handleEarthlinkFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
        if (e.target.files?.[0]) {
            const dataUrl = await blobToDataURL(e.target.files[0]);
            if (type === 'photo') setEarthlinkPhoto(dataUrl);
            if (type === 'video') setEarthlinkVideo(dataUrl);
            e.target.value = '';
        }
    };
    
    const handleEarthlinkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!earthlinkText.trim() && !earthlinkPhoto && !earthlinkVideo) || !selectedAstronaut) return;
        setIsSubmitting(true);
        try {
            const message: Omit<EarthlinkMessage, 'id' | 'date' | 'viewed'> = {
                from: earthlinkFrom,
                ...(earthlinkText && { text: earthlinkText }),
                ...(earthlinkPhoto && { photoUrl: earthlinkPhoto }),
                ...(earthlinkVideo && { videoUrl: earthlinkVideo }),
            };
            await maitriApiService.sendEarthlinkMessage(selectedAstronaut.name, message);
            setEarthlinkFrom('Mission Control');
            setEarthlinkText('');
            setEarthlinkPhoto(null);
            setEarthlinkVideo(null);
        } catch (error) { console.error("Failed to send Earthlink message:", error); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-space-dark text-gray-800 dark:text-gray-200 font-sans">
            <aside className="w-full md:w-72 bg-gray-200 dark:bg-gray-900 p-4 flex flex-col border-b md:border-b-0 md:border-r border-gray-300 dark:border-slate-500/20 flex-shrink-0">
                <div className="flex items-center space-x-2 text-2xl font-bold text-gray-800 dark:text-white mb-4 md:mb-8 px-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>Base Station</span>
                </div>
                <h3 className="px-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Crew Roster</h3>
                <nav className="flex-grow space-y-2 overflow-y-auto">
                    {astronauts.map(astro => (
                        <button key={astro.name} onClick={() => setSelectedAstronaut(astro)}
                            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${selectedAstronaut?.name === astro.name ? 'bg-accent-cyan text-white' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}>
                            <Avatar name={astro.name} photoUrl={astro.photoUrl} className="w-10 h-10 rounded-full text-lg" />
                            <span className="font-semibold capitalize">{astro.name}</span>
                        </button>
                    ))}
                </nav>
                <div className="mt-auto pt-4">
                    <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span className="font-semibold">Logout</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 p-4 md:p-8 overflow-y-auto scrollbar-thin">
                {isLoading ? <p>Loading Crew Data...</p> : !selectedAstronaut ? <p>Select an astronaut to view data.</p> :
                (<div className="animate-fade-in">
                    <h1 className="text-2xl md:text-3xl font-bold mb-6 capitalize">Managing: {selectedAstronaut.name}</h1>
                    <div className="flex border-b border-gray-300 dark:border-slate-500/20 mb-6 overflow-x-auto">
                        {['symptoms', 'logs', 'mass', 'procedures', 'earthlink', 'profile'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-semibold capitalize flex-shrink-0 ${activeTab === tab ? 'text-accent-cyan border-b-2 border-accent-cyan' : 'text-gray-500'}`}>{tab}</button>
                        ))}
                    </div>
                    
                    {activeTab === 'symptoms' && <div>...</div>}
                    {activeTab === 'logs' && <div>...</div>}
                    {/* Add other tab contents here similarly */}
                </div>)}
            </main>

            {isReplyModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setIsReplyModalOpen(false)}>
                    <div className="bg-gray-100 dark:bg-space-dark p-6 rounded-lg shadow-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">Reply to {replyingToSymptom?.symptom}</h2>
                        <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={5} className="w-full p-2 bg-gray-200 dark:bg-gray-800 rounded-md mb-4"/>
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setIsReplyModalOpen(false)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg">Cancel</button>
                            <button onClick={handleReplySubmit} disabled={isSubmitting} className="px-4 py-2 bg-accent-cyan text-white font-bold rounded-lg disabled:bg-gray-500">{isSubmitting ? "Sending..." : "Send Advice"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
