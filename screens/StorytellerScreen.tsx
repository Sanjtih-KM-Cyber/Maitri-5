

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Screen, CaptainLog } from '../types.ts';
import GlassCard from '../components/GlassCard.tsx';
import { generateCreativeText } from '../services/geminiService.ts';
import { blobToDataURL } from '../utils.ts';

interface StorytellerScreenProps {
  navigateTo: (screen: Screen, context?: any) => void;
  onClose: () => void;
  onSaveLog: (log: Omit<CaptainLog, 'id' | 'date'>) => Promise<void>;
  pastLogs: CaptainLog[];
}

const StorytellerScreen: React.FC<StorytellerScreenProps> = ({ navigateTo, onClose, onSaveLog, pastLogs }) => {
  const [logText, setLogText] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [video, setVideo] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const photoUrl = photo ? URL.createObjectURL(photo) : null;
  const videoUrl = video ? URL.createObjectURL(video) : null;

   const openCamera = useCallback(async (mode: 'photo' | 'video') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: mode === 'video' });
            streamRef.current = stream;
            setCaptureMode(mode);
            setIsCameraOpen(true);
        } catch (err) { console.error("Error accessing camera/mic:", err); }
    }, []);
    
    // Cleanup effect to ensure camera stream is released on component unmount
    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, []);
    
    useEffect(() => {
        if (isCameraOpen && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraOpen]);
    
    const closeCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setIsCameraOpen(false);
        setIsRecording(false);
        setCaptureMode(null);
    }, []);

    const handlePhotoCapture = useCallback(() => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            canvas.toBlob(blob => { if(blob) setPhoto(blob); closeCamera(); }, 'image/jpeg');
        }
    }, [closeCamera]);
    
    const handleStartRecording = useCallback(() => {
        if (streamRef.current) {
            recordedChunksRef.current = [];
            const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };
            recorder.onstop = () => {
                const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                setVideo(videoBlob);
                closeCamera();
            };
            recorder.start();
            setIsRecording(true);
        }
    }, [closeCamera]);

    const handleStopRecording = useCallback(() => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    }, []);


  const handleSave = async () => {
    if ((!logText && !photo && !video) || isSaving) {
        return;
    }
    
    setIsSaving(true);
    const logData: Omit<CaptainLog, 'id' | 'date'> = { 
        text: logText, 
        photo: photo ? await blobToDataURL(photo) : undefined, 
        video: video ? await blobToDataURL(video) : undefined 
    };
    await onSaveLog(logData);

    setLogText(''); 
    setPhoto(null); 
    setVideo(null);
    setIsSaving(false);
    // Add a success confirmation if desired, e.g., using a toast
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setSummary('');
    try {
        const logHistory = pastLogs.slice(-7).map(log => `On ${new Date(log.date).toLocaleDateString()}, the log was: "${log.text}"`).join('\n\n');
        if (logHistory.length === 0) {
            setSummary("No past logs available to summarize. Write a few entries first!");
            return;
        }
        const systemInstruction = "You are an AI assistant analyzing a captain's log. Read the following entries and provide a concise, semi-formal, third-person summary highlighting key activities, expressed sentiments, and overall tone for the week.";
        const result = await generateCreativeText(logHistory, systemInstruction);
        setSummary(result);
    } catch (error) {
        setSummary("There was an error generating the summary. Please try again.");
    } finally {
        setIsGeneratingSummary(false);
    }
  };
  
  const handleMessageAssist = () => {
    navigateTo(Screen.Chat, "I need help writing a message home. I'm feeling a bit tired. Can you help me draft something based on my thoughts?");
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
       {isCameraOpen && (
             <div className="fixed inset-0 z-[110] bg-black/80 flex flex-col items-center justify-center p-4">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto max-h-[70%] rounded-lg mb-4"></video>
                <div className="flex items-center space-x-4">
                    <button onClick={closeCamera} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg">Cancel</button>
                    {captureMode === 'photo' && <button onClick={handlePhotoCapture} className="px-4 py-2 bg-accent-cyan text-white font-bold rounded-lg">Capture Photo</button>}
                    {captureMode === 'video' && !isRecording && <button onClick={handleStartRecording} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg">Start Recording</button>}
                    {captureMode === 'video' && isRecording && <button onClick={handleStopRecording} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg animate-pulse">Stop Recording</button>}
                </div>
            </div>
        )}
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Storyteller: Captain's Log</h1>
            <button onClick={onClose} className="p-2 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Log Entry for: <span className="text-accent-cyan">{today}</span></h2>
            <textarea id="log-entry" rows={8} value={logText} onChange={(e) => setLogText(e.target.value)} className="w-full p-2 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-accent-cyan focus:border-accent-cyan" placeholder="Dictate or type your thoughts for the day..."></textarea>
            <div className="grid grid-cols-2 gap-4 my-4">
                <div className="p-2 border border-dashed rounded-lg flex flex-col items-center justify-center min-h-[120px]">
                    {photoUrl ? <img src={photoUrl} alt="Log" className="rounded-lg max-h-28" /> : <span>No Photo Attached</span>}
                    <button type="button" onClick={() => openCamera('photo')} className="mt-2 text-sm text-accent-cyan font-semibold">{photoUrl ? 'Change Photo' : 'Take Photo'}</button>
                </div>
                 <div className="p-2 border border-dashed rounded-lg flex flex-col items-center justify-center min-h-[120px]">
                    {videoUrl ? <video src={videoUrl} controls className="rounded-lg max-h-28" /> : <span>No Video Attached</span>}
                    <button type="button" onClick={() => openCamera('video')} className="mt-2 text-sm text-accent-cyan font-semibold">{videoUrl ? 'Change Video' : 'Record Video'}</button>
                </div>
            </div>
            <button onClick={handleSave} disabled={isSaving} className="w-full mt-2 bg-accent-cyan text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 transition-colors disabled:bg-gray-500">{isSaving ? 'Saving...' : 'Save Log Entry'}</button>
        </GlassCard>
        
        <div className="space-y-6">
            <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">AI-Assisted Log Summary</h2>
                <button onClick={handleGenerateSummary} disabled={isGeneratingSummary} className="w-full bg-accent-cyan/80 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center justify-center">
                  {isGeneratingSummary && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                  {isGeneratingSummary ? 'Analyzing Entries...' : 'Generate Weekly Summary'}
                </button>
                {summary && (
                    <div className="mt-4 p-4 bg-gray-200/50 dark:bg-gray-900/50 rounded-lg max-h-48 overflow-y-auto scrollbar-thin">
                        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{summary}</p>
                    </div>
                )}
            </GlassCard>
            
            <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Earth Link</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">Feeling too tired to write? Let MAITRI help you craft a message to your family.</p>
                <button onClick={handleMessageAssist} className="w-full bg-accent-cyan/80 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-500 transition-colors">Draft Message to Earth (AI Assisted)</button>
            </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default StorytellerScreen;