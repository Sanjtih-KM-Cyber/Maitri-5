
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Screen, SymptomLog, DoctorAdvice, DailyCheckInLog, MassProtocol } from '../types';
import GlassCard from '../components/GlassCard';
import WellnessDashboard from '../components/WellnessDashboard';
import BreathingExercise from '../components/BreathingExercise';
import { blobToDataURL } from '../utils';
import { maitriService } from '../services/databaseService';

interface GuardianScreenProps {
  navigateTo: (screen: Screen) => void;
  onClose: () => void;
  symptomLogs: SymptomLog[];
  doctorAdvice: DoctorAdvice[];
  dailyLogs: DailyCheckInLog[];
  onSymptomLog: (log: Omit<SymptomLog, 'id' | 'date'>) => Promise<void>;
  onToggleSleepSession: () => void;
  isSleepSessionActive: boolean;
  massProtocols: MassProtocol[];
  onMassProtocolClick: (protocol: MassProtocol) => void;
  onDataRefresh: () => void;
  screenContext?: any;
}

const GuardianScreen: React.FC<GuardianScreenProps> = ({ 
  navigateTo, onClose, symptomLogs, doctorAdvice, dailyLogs, onSymptomLog, 
  onToggleSleepSession, isSleepSessionActive, massProtocols, onMassProtocolClick,
  onDataRefresh, screenContext
}) => {
  // Form state
  const [symptom, setSymptom] = useState('');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [video, setVideo] = useState<Blob | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [isBreathingExerciseOpen, setIsBreathingExerciseOpen] = useState(false);

  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const [mediaContext, setMediaContext] = useState<{logId: string; mediaType: 'photo' | 'video'} | null>(null);

  const photoUrl = photo ? URL.createObjectURL(photo) : null;
  const videoUrl = video ? URL.createObjectURL(video) : null;
  
  // Handle context from voice assistant
  useEffect(() => {
    if (screenContext?.openCameraForMostRecentLog) {
        const mediaType = screenContext.openCameraForMostRecentLog as 'photo' | 'video';
        const latestLog = [...symptomLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        if (latestLog) {
            setMediaContext({ logId: latestLog.id, mediaType });
            openCamera(mediaType);
        }
    }
  }, [screenContext, symptomLogs]);


  const openCamera = useCallback(async (mode: 'photo' | 'video') => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: mode === 'video' });
        streamRef.current = stream;
        setCaptureMode(mode);
        setIsCameraOpen(true);
    } catch (err) { console.error("Error accessing camera/mic:", err); }
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
    setMediaContext(null); // Clear context on close
  }, []);

  const handlePhotoCapture = useCallback(async () => {
    if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(async blob => { 
            if(blob) {
                if (mediaContext) {
                    const dataUrl = await blobToDataURL(blob);
                    await maitriService.addMediaToSymptomLog(mediaContext.logId, dataUrl, 'photo');
                    onDataRefresh();
                } else {
                    setPhoto(blob);
                }
            }
            closeCamera(); 
        }, 'image/jpeg');
    }
  }, [closeCamera, mediaContext, onDataRefresh]);

  const handleStartRecording = useCallback(() => {
    if (streamRef.current) {
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunksRef.current.push(event.data);
        };
        recorder.onstop = async () => {
            const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
             if (mediaContext) {
                const dataUrl = await blobToDataURL(videoBlob);
                await maitriService.addMediaToSymptomLog(mediaContext.logId, dataUrl, 'video');
                onDataRefresh();
            } else {
                setVideo(videoBlob);
            }
            closeCamera();
        };
        recorder.start();
        setIsRecording(true);
    }
  }, [closeCamera, mediaContext, onDataRefresh]);
  
  const handleStopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptom || isLogging) return;
    
    setIsLogging(true);
    const logData: Omit<SymptomLog, 'id' | 'date'> = { 
        symptom, 
        severity, 
        notes, 
        photo: photo ? await blobToDataURL(photo) : undefined,
        video: video ? await blobToDataURL(video) : undefined,
    };
    
    await onSymptomLog(logData);

    setSymptom(''); setSeverity('mild'); setNotes(''); setPhoto(null); setVideo(null);
    setIsLogging(false);
  };

  const getAdviceForLog = (logId: string) => doctorAdvice.find(advice => advice.symptomLogId === logId);

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
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
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Guardian Health Monitor</h1>
          <button onClick={onClose} className="p-2 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WellnessDashboard dailyLogs={dailyLogs} symptomLogs={symptomLogs} />
          
          <div className="space-y-6">
            <GlassCard className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Log a New Symptom</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="symptom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Symptom</label>
                  <input type="text" id="symptom" value={symptom} onChange={e => setSymptom(e.target.value)} required className="w-full p-2 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent-cyan focus:border-accent-cyan"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Severity</label>
                  <div className="flex space-x-2">
                    {(['mild', 'moderate', 'severe'] as const).map(level => (
                      <button key={level} type="button" onClick={() => setSeverity(level)} className={`flex-1 p-2 rounded-md font-semibold text-sm capitalize ${severity === level ? 'bg-accent-cyan text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{level}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
                  <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full p-2 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent-cyan focus:border-accent-cyan"></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2 border border-dashed rounded-lg flex flex-col items-center justify-center min-h-[100px]">
                      {photoUrl ? <img src={photoUrl} alt="Symptom" className="rounded-lg max-h-24" /> : <span className="text-sm text-gray-500">No Photo</span>}
                      <button type="button" onClick={() => openCamera('photo')} className="mt-2 text-sm text-accent-cyan font-semibold">{photoUrl ? 'Change' : 'Take Photo'}</button>
                  </div>
                   <div className="p-2 border border-dashed rounded-lg flex flex-col items-center justify-center min-h-[100px]">
                      {videoUrl ? <video src={videoUrl} controls className="rounded-lg max-h-24" /> : <span className="text-sm text-gray-500">No Video</span>}
                      <button type="button" onClick={() => openCamera('video')} className="mt-2 text-sm text-accent-cyan font-semibold">{videoUrl ? 'Change' : 'Record Video'}</button>
                  </div>
                </div>
                 <button type="submit" disabled={isLogging} className="w-full p-3 bg-accent-cyan text-white rounded-lg font-bold hover:bg-cyan-500 transition-colors disabled:bg-gray-500">{isLogging ? 'Logging...' : 'Log Symptom'}</button>
              </form>
            </GlassCard>
            
            <GlassCard className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">M.A.S.S. Protocol</h2>
              <div className="space-y-3">
                 {massProtocols.length > 0 ? massProtocols.map(protocol => (
                    <button key={protocol.id} onClick={() => onMassProtocolClick(protocol)} className="w-full p-3 bg-accent-cyan/80 text-white rounded-lg font-bold hover:bg-cyan-500 transition-colors text-left">
                        {protocol.name}
                        <span className="block text-xs font-normal opacity-80">{protocol.sets} Sets / {protocol.duration} min work / {protocol.rest}s rest</span>
                    </button>
                 )) : <p className="text-gray-500 italic">No M.A.S.S. protocols assigned.</p>}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Mindfulness & Sleep</h2>
               <div className="space-y-3">
                 <button onClick={() => setIsBreathingExerciseOpen(true)} className="w-full p-3 bg-accent-cyan/80 text-white rounded-lg font-bold hover:bg-cyan-500 transition-colors">Start Guided Breathing</button>
                 <button onClick={onToggleSleepSession} className={`w-full p-3 text-white rounded-lg font-bold transition-colors ${isSleepSessionActive ? 'bg-red-500/80 hover:bg-red-500' : 'bg-indigo-600/80 hover:bg-indigo-600'}`}>
                    {isSleepSessionActive ? 'End Sleep Session' : 'Start Sleep Session'}
                 </button>
               </div>
            </GlassCard>
          </div>
        </div>

        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Recent Symptom History</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin pr-2">
            {symptomLogs.length > 0 ? [...symptomLogs].reverse().map(log => (
              <div key={log.id} className="p-3 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg">
                <p className="font-semibold">{log.symptom} <span className="text-sm capitalize font-normal">({log.severity})</span> - <span className="text-xs text-gray-500">{new Date(log.date).toLocaleDateString()}</span></p>
                {log.notes && <p className="text-sm italic mt-1">"{log.notes}"</p>}
                <div className="flex space-x-4 mt-2">
                    {log.photo && <a href={log.photo} target="_blank" rel="noopener noreferrer" className="text-accent-cyan text-sm font-semibold">View Photo</a>}
                    {log.video && <a href={log.video} target="_blank" rel="noopener noreferrer" className="text-accent-cyan text-sm font-semibold">View Video</a>}
                </div>
                {getAdviceForLog(log.id) && (
                  <div className="mt-2 p-2 bg-green-500/10 rounded-md">
                    <p className="font-bold text-sm text-green-700 dark:text-green-300">Doctor's Advice:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{getAdviceForLog(log.id)?.text}</p>
                  </div>
                )}
              </div>
            )) : <p className="text-gray-500">No symptoms logged yet.</p>}
          </div>
        </GlassCard>
      </div>
      <BreathingExercise isOpen={isBreathingExerciseOpen} onClose={() => setIsBreathingExerciseOpen(false)} />
    </>
  );
};

export default GuardianScreen;
