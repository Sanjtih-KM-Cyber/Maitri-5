import React, { useState, useRef, useEffect } from 'react';
import { AstronautData, SymptomLog, DoctorAdvice, MissionProcedure, MassProtocol, EarthlinkMessage } from '../types.ts';
import { maitriApiService } from '../services/maitriApiService.ts';
import Avatar from '../components/Avatar.tsx';
import { blobToDataURL } from '../utils.ts';
import { socketService } from '../services/socketService.ts';

interface AdminDashboardScreenProps {
    onLogout: () => void;
}

// Fix: Changed to a named export to resolve a potential module resolution issue.
export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ onLogout }) => {
    const [astronauts, setAstronauts] = useState<AstronautData[]>([]);
    const [selectedAstronaut, setSelectedAstronaut] = useState<AstronautData | null>(null);
    const [activeTab, setActiveTab] = useState('symptoms');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const allAstronauts = await maitriApiService.getAllAstronauts();
            setAstronauts(allAstronauts);
            if (!selectedAstronaut && allAstronauts.length > 0) {
                setSelectedAstronaut(allAstronauts[0]);
            } else if (selectedAstronaut) {
                // Refresh data for the currently selected astronaut
                const refreshedData = allAstronauts.find(a => a.name === selectedAstronaut.name);
                setSelectedAstronaut(refreshedData || allAstronauts[0] || null);
            }
        } catch (error) {
            console.error("Failed to fetch astronaut data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        socketService.connect();
        
        socketService.on('astronaut-data-updated', (updatedAstronaut: AstronautData) => {
            setAstronauts(prevAstronauts => 
                prevAstronauts.map(astro => 
                    astro.name === updatedAstronaut.name ? updatedAstronaut : astro
                )
            );
            
            if (selectedAstronaut?.name === updatedAstronaut.name) {
                setSelectedAstronaut(updatedAstronaut);
            }
        });

        return () => {
            socketService.disconnect();
        };
    }, [selectedAstronaut]);
    
    // Reply Modal State
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [replyingToSymptom, setReplyingToSymptom] = useState<SymptomLog | null>(null);
    const [replyText, setReplyText] = useState('');

    // Procedure Form State
    const [procName, setProcName] = useState('');
    const [procSteps, setProcSteps] = useState([{ id: `step-${Date.now()}`, text: '' }]);

    // MASS Protocol Form State
    const [massName, setMassName] = useState('');
    const [massSets, setMassSets] = useState(4);
    const [massDuration, setMassDuration] = useState(45);
    const [massRest, setMassRest] = useState(60);

    // Profile Photo State
    const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Earthlink Form State
    const [earthlinkFrom, setEarthlinkFrom] = useState('Mission Control');
    const [earthlinkText, setEarthlinkText] = useState('');
    const [earthlinkPhoto, setEarthlinkPhoto] = useState<string | null>(null);
    const [earthlinkVideo, setEarthlinkVideo] = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    
    const handleSelectAstronaut = (astronaut: AstronautData) => {
        setSelectedAstronaut(astronaut);
        setActiveTab('symptoms');
    };

    const handleReplySubmit = async () => {
        if (!replyText || !replyingToSymptom || !selectedAstronaut) return;
        setIsSubmitting(true);
        try {
            await maitriApiService.addDoctorAdvice(selectedAstronaut.name, {
                text: replyText,
                symptomLogId: replyingToSymptom.id,
            });
            // Data will refresh via socket event, no need to call fetchAllData
            setReplyText('');
            setIsReplyModalOpen(false);
            setReplyingToSymptom(null);
        } catch (error) { console.error("Failed to send reply:", error); }
        finally { setIsSubmitting(false); }
    };

    const handleProcedureSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!procName || procSteps.some(s => !s.text) || !selectedAstronaut) return;
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
        if (e.target.files && e.target.files[0] && selectedAstronaut) {
            const file = e.target.files[0];
            const dataUrl = await blobToDataURL(file);
            setNewPhotoPreview(dataUrl);
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
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const dataUrl = await blobToDataURL(file);
            if (type === 'photo') setEarthlinkPhoto(dataUrl);
            if (type === 'video') setEarthlinkVideo(dataUrl);
            e.target.value = ''; // Allow re-uploading the same file
        }
    };
    
    const handleEarthlinkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!earthlinkText && !earthlinkPhoto && !earthlinkVideo) || !selectedAstronaut) return;
        setIsSubmitting(true);
        try {
            const message: Omit<EarthlinkMessage, 'id' | 'date' | 'viewed'> = {
                from: earthlinkFrom,
                ...(earthlinkText && { text: earthlinkText }),
                ...(earthlinkPhoto && { photoUrl: earthlinkPhoto }),
                ...(earthlinkVideo && { videoUrl: earthlinkVideo }),
            };
            await maitriApiService.sendEarthlinkMessage(selectedAstronaut.name, message);
            // Reset form
            setEarthlinkFrom('Mission Control');
            setEarthlinkText('');
            setEarthlinkPhoto(null);
            setEarthlinkVideo(null);
        } catch (error) {
            console.error("Failed to send Earthlink message:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-space-dark text-gray-800 dark:text-gray-200 font-sans">
            {/* Sidebar */}
            <aside className="w-full md:w-72 bg-gray-200 dark:bg-gray-900 p-4 flex flex-col border-b md:border-b-0 md:border-r border-gray-300 dark:border-slate-500/20 flex-shrink-0">
                 <div className="flex items-center space-x-2 text-2xl font-bold text-gray-800 dark:text-white mb-4 md:mb-8 px-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>Base Station</span>
                </div>
                <h3 className="px-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Crew Roster</h3>
                <nav className="flex-grow space-y-2 overflow-y-auto">
                    {astronauts.map(astro => (
                        <button key={astro.name} onClick={() => handleSelectAstronaut(astro)}
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

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto scrollbar-thin">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">Loading Crew Data...</div>
                ) : selectedAstronaut ? (
                    <div className="animate-fade-in">
                        <h1 className="text-2xl md:text-3xl font-bold mb-6 capitalize">Managing: {selectedAstronaut.name}</h1>
                        <div className="flex border-b border-gray-300 dark:border-slate-500/20 mb-6 overflow-x-auto">
                           {['symptoms', 'logs', 'mass', 'procedures', 'earthlink', 'profile'].map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-semibold capitalize flex-shrink-0 ${activeTab === tab ? 'text-accent-cyan border-b-2 border-accent-cyan' : 'text-gray-500'}`}>{tab}</button>
                           ))}
                        </div>
                        
                        {/* Tab Content */}
                        {activeTab === 'symptoms' && (
                            <div className="space-y-4">
                                {selectedAstronaut.symptomLogs.length > 0 ? [...selectedAstronaut.symptomLogs].reverse().map(log => (
                                    <div key={log.id} className="p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold">{log.symptom} <span className="font-normal text-sm capitalize">({log.severity})</span></p>
                                                <p className="text-xs text-gray-500">{new Date(log.date).toLocaleString()}</p>
                                                {log.notes && <p className="mt-2 text-sm italic">"{log.notes}"</p>}
                                                <div className="flex items-start space-x-4 mt-2">
                                                    {log.photo && <img src={log.photo} alt="Symptom" className="max-h-40 rounded-lg" />}
                                                    {log.video && <video src={log.video} controls className="max-h-40 rounded-lg w-60" />}
                                                </div>
                                            </div>
                                            <button onClick={() => { setReplyingToSymptom(log); setIsReplyModalOpen(true); }} className="px-3 py-1 bg-accent-cyan text-white text-sm font-bold rounded-lg flex-shrink-0">Reply</button>
                                        </div>
                                    </div>
                                )) : <div className="text-center p-8 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg"><p className="text-gray-500">No symptoms logged for {selectedAstronaut.name}.</p></div>}
                            </div>
                        )}
                         {activeTab === 'logs' && (
                             <div className="space-y-4">
                                {selectedAstronaut.captainLogs.length > 0 ? [...selectedAstronaut.captainLogs].reverse().map(log => (
                                    <div key={log.id} className="p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg">
                                        <p className="font-bold text-gray-500 text-sm">{new Date(log.date).toLocaleString()}</p>
                                        {log.text && <p className="mt-1">{log.text}</p>}
                                        {log.photo && <img src={log.photo} alt="log" className="mt-2 rounded-lg max-h-40" />}
                                        {log.video && <video src={log.video} controls className="mt-2 rounded-lg max-h-60" />}
                                    </div>
                                )) : <div className="text-center p-8 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg"><p className="text-gray-500">No captain's logs found for {selectedAstronaut.name}.</p></div>}
                            </div>
                        )}
                        {activeTab === 'mass' && (
                            <form onSubmit={handleMassSubmit} className="p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg space-y-4 max-w-md">
                               <h3 className="text-xl font-bold">Assign M.A.S.S. Protocol</h3>
                               <input type="text" value={massName} onChange={e => setMassName(e.target.value)} placeholder="Protocol Name" required className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-md"/>
                               <div className="grid grid-cols-3 gap-4">
                                   <div><label className="text-sm">Sets</label><input type="number" value={massSets} onChange={e => setMassSets(parseInt(e.target.value))} required className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-md"/></div>
                                   <div><label className="text-sm">Duration (min)</label><input type="number" value={massDuration} onChange={e => setMassDuration(parseInt(e.target.value))} required className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-md"/></div>
                                   <div><label className="text-sm">Rest (sec)</label><input type="number" value={massRest} onChange={e => setMassRest(parseInt(e.target.value))} required className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-md"/></div>
                               </div>
                               <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-accent-cyan text-white font-bold rounded-lg disabled:bg-gray-500">{isSubmitting ? "Assigning..." : "Assign Protocol"}</button>
                            </form>
                        )}
                        {activeTab === 'procedures' && (
                             <form onSubmit={handleProcedureSubmit} className="p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg space-y-4 max-w-md">
                                <h3 className="text-xl font-bold">Assign New Procedure</h3>
                                <input type="text" value={procName} onChange={e => setProcName(e.target.value)} placeholder="Procedure Name" required className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-md"/>
                                {procSteps.map((step, index) => (
                                    <input key={step.id} type="text" value={step.text} onChange={e => {
                                        const newSteps = [...procSteps]; newSteps[index].text = e.target.value; setProcSteps(newSteps);
                                    }} placeholder={`Step ${index + 1}`} required className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-md"/>
                                ))}
                                <button type="button" onClick={() => setProcSteps([...procSteps, {id: `step-${Date.now()}`, text: ''}])} className="text-sm text-accent-cyan">+ Add Step</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-accent-cyan text-white font-bold rounded-lg disabled:bg-gray-500">{isSubmitting ? "Assigning..." : "Assign Procedure"}</button>
                            </form>
                        )}
                        {activeTab === 'earthlink' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                <form onSubmit={handleEarthlinkSubmit} className="p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg space-y-4">
                                    <h3 className="text-xl font-bold">Send Earthlink Message</h3>
                                    <div><label className="text-sm">From</label><input type="text" value={earthlinkFrom} onChange={e => setEarthlinkFrom(e.target.value)} placeholder="e.g., Mission Control" required className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-md"/></div>
                                    <div><label className="text-sm">Message</label><textarea value={earthlinkText} onChange={e => setEarthlinkText(e.target.value)} rows={4} placeholder="Type your message here..." className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-md"/></div>
                                    <div className="flex space-x-4">
                                        <div className="flex-1"><label className="text-sm">Attach Photo</label><input type="file" onChange={(e) => handleEarthlinkFileChange(e, 'photo')} accept="image/*" className="w-full text-sm"/>{earthlinkPhoto && <img src={earthlinkPhoto} alt="upload preview" className="mt-2 rounded max-h-24"/>}</div>
                                        <div className="flex-1"><label className="text-sm">Attach Video</label><input type="file" onChange={(e) => handleEarthlinkFileChange(e, 'video')} accept="video/*" className="w-full text-sm"/>{earthlinkVideo && <video src={earthlinkVideo} controls className="mt-2 rounded max-h-24"/>}</div>
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-accent-cyan text-white font-bold rounded-lg disabled:bg-gray-500">{isSubmitting ? "Sending..." : "Send Message"}</button>
                                </form>

                                <div className="p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg">
                                    <h3 className="text-xl font-bold mb-4">Earthlink Log</h3>
                                    <div className="space-y-3 max-h-[65vh] overflow-y-auto scrollbar-thin pr-2">
                                        {selectedAstronaut.earthlinkMessages && selectedAstronaut.earthlinkMessages.length > 0 ? 
                                            [...selectedAstronaut.earthlinkMessages]
                                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                .map(msg => {
                                                    const isFromAstronaut = msg.from.toLowerCase() === selectedAstronaut.name.toLowerCase();
                                                    return (
                                                        <div key={msg.id} className={`p-3 rounded-lg ${isFromAstronaut ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : 'bg-gray-500/10 border-l-2 border-gray-400'}`}>
                                                            <div className="flex justify-between items-center">
                                                                <p className="font-bold text-sm capitalize">{msg.from}</p>
                                                                <p className="text-xs text-gray-500">{new Date(msg.date).toLocaleString()}</p>
                                                            </div>
                                                            {msg.text && <p className="mt-2 text-sm">{msg.text}</p>}
                                                            {msg.photoUrl && <a href={msg.photoUrl} target="_blank" rel="noopener noreferrer"><img src={msg.photoUrl} alt="earthlink" className="mt-2 rounded max-h-32 hover:opacity-80 transition-opacity" /></a>}
                                                            {msg.videoUrl && <video src={msg.videoUrl} controls className="mt-2 rounded-lg max-h-40" />}
                                                        </div>
                                                    )
                                                })
                                        : <p className="p-4 text-center text-gray-500">No Earthlink messages found.</p>
                                        }
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'profile' && (
                            <div className="p-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg space-y-4 max-w-md">
                                <h3 className="text-xl font-bold">Update Profile Photo</h3>
                                <input type="file" ref={fileInputRef} onChange={handlePhotoFileChange} accept="image/*" className="w-full text-sm"/>
                                {(newPhotoPreview || (selectedAstronaut && selectedAstronaut.photoUrl)) && (
                                    <div className="mt-2">
                                        <p className="text-sm mb-1">Preview:</p>
                                        <img src={newPhotoPreview || selectedAstronaut.photoUrl || ''} alt="profile preview" className="rounded-lg max-h-48"/>
                                    </div>
                                )}
                                {newPhotoPreview && <button onClick={handlePhotoUpdate} disabled={isSubmitting} className="px-4 py-2 bg-accent-cyan text-white font-bold rounded-lg disabled:bg-gray-500">{isSubmitting ? "Updating..." : "Update Photo"}</button>}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex justify-center items-center h-full"><p>Select an astronaut from the roster to view their data.</p></div>
                )}
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
