
import { useState, useEffect, useCallback } from 'react';

// A comprehensive regex to match most emojis, preventing them from being read aloud.
const EMOJI_REGEX = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;

interface VoiceProfile {
  nameMatch: RegExp;
  rate: number;
  pitch: number;
}

// Map Gemini voice names to desired system voice characteristics
const voiceProfileMap: { [key: string]: VoiceProfile } = {
    'Zephyr': { nameMatch: /Google US English|Samantha|Zira/, rate: 0.9, pitch: 1.0 }, // Default, pleasant female
    'Puck':   { nameMatch: /Google UK English Male|Daniel/, rate: 1.0, pitch: 0.8 }, // Crisp, slightly lower pitch male
    'Charon': { nameMatch: /Alex|Microsoft David/, rate: 0.9, pitch: 0.9 }, // Deeper, calm male voice
    'Kore':   { nameMatch: /Google UK English Female|Tessa|Kate/, rate: 1.0, pitch: 1.2 }, // Clear, slightly higher pitch female
    'Fenrir': { nameMatch: /Rishi|Aaron/, rate: 0.95, pitch: 0.7 }, // Deep, authoritative male
};


export const useTTS = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices.filter(v => v.lang.startsWith('en')));
      }
    };
    
    loadVoices();
    // Voices may load asynchronously.
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text: string, voiceName: string) => {
    if (!text || !window.speechSynthesis) return;
    
    const cleanText = text.replace(EMOJI_REGEX, '').replace(/\*\*/g, ''); // Also remove markdown
    if (!cleanText.trim()) return;

    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const profileKey = voiceName in voiceProfileMap ? voiceName : 'Zephyr';
    const profile = voiceProfileMap[profileKey];
    
    let selectedVoice = voices.find(v => profile.nameMatch.test(v.name));

    // Fallback logic if a profile match isn't found
    if (!selectedVoice) {
        selectedVoice = voices.find(v => v.name === 'Google US English') || 
                        voices.find(v => v.name === 'Microsoft Zira - English (United States)') || 
                        voices.find(v => v.lang === 'en-US' && v.default) ||
                        voices.find(v => v.lang.startsWith('en'));
    }

    if(selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.pitch = profile.pitch;
    utterance.rate = profile.rate;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
  }, [voices]);
  
  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, cancel, voices };
};
