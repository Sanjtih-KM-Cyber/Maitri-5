
import { GoogleGenAI, Type } from "@google/genai";
import type { GenerateContentResponse, FunctionDeclaration } from "@google/genai";
import { Screen } from "../types.ts";
import type { ChatMessage, SymptomLog, MissionTask } from "../types.ts";

// Fallback to an empty string if the API key is not provided in the environment.
// This prevents the constructor from throwing an error and crashing the app on load.
const API_KEY = process.env.API_KEY || '';
if (!API_KEY) {
    console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Function Declarations for Tools ---
const navigateToScreenFunctionDeclaration: FunctionDeclaration = {
  name: 'navigateToScreen',
  parameters: {
    type: Type.OBJECT,
    description: 'Navigates the user to a different screen or module in the application.',
    properties: {
      screen: {
        type: Type.STRING,
        description: `The screen to navigate to. Must be one of: ${Object.values(Screen).join(', ')}.`,
      },
    },
    required: ['screen'],
  },
};

const logSymptomFunctionDeclaration: FunctionDeclaration = {
    name: 'logSymptom',
    parameters: {
        type: Type.OBJECT,
        description: 'Logs a new health symptom for the astronaut.',
        properties: {
            symptom: { type: Type.STRING, description: 'A brief description of the symptom, e.g., "headache" or "dizziness".' },
            severity: { type: Type.STRING, description: 'The severity of the symptom. Must be one of: mild, moderate, severe.' },
            notes: { type: Type.STRING, description: 'Optional additional notes about the symptom.' },
        },
        required: ['symptom', 'severity'],
    },
};

const addMissionTaskFunctionDeclaration: FunctionDeclaration = {
    name: 'addMissionTask',
    parameters: {
        type: Type.OBJECT,
        description: 'Adds a new task to the mission schedule for the day.',
        properties: {
            time: { type: Type.STRING, description: 'The time for the task in 24-hour format, e.g., "14:30".' },
            name: { type: Type.STRING, description: 'A description of the task, e.g., "Recalibrate solar panels".' },
        },
        required: ['time', 'name'],
    }
};

export const sendMessageToFamilyFunctionDeclaration: FunctionDeclaration = {
    name: 'sendMessageToFamily',
    parameters: {
        type: Type.OBJECT,
        description: 'Sends a pre-drafted message to the astronaut\'s family via the Earthlink system.',
        properties: {
            messageContent: {
                type: Type.STRING,
                description: 'The final, approved content of the message to be sent.'
            },
        },
        required: ['messageContent'],
    },
};

export const setSensoryImmersionFunctionDeclaration: FunctionDeclaration = {
  name: 'setSensoryImmersion',
  parameters: {
    type: Type.OBJECT,
    description: "Generates a sensory experience by changing the UI's ambient lighting and describing a scene.",
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'A short text prompt describing the desired scene, e.g., "a calm green forest" or "a vibrant coral reef".',
      },
    },
    required: ['prompt'],
  },
};


export const functionDeclarations = [
    navigateToScreenFunctionDeclaration,
    logSymptomFunctionDeclaration,
    addMissionTaskFunctionDeclaration,
    sendMessageToFamilyFunctionDeclaration,
    setSensoryImmersionFunctionDeclaration,
];

// --- Adaptive Persona System ---
type Persona = 'Guardian' | 'CoPilot' | 'Storyteller' | 'Recreation' | 'Default';

const getPersona = (history: ChatMessage[]): Persona => {
    const lastUserMessage = history.filter(m => m.sender === 'user').pop()?.text.toLowerCase() || '';
    if (lastUserMessage.includes('symptom') || lastUserMessage.includes('sick') || lastUserMessage.includes('stressed') || lastUserMessage.includes('anxious') || lastUserMessage.includes('headache')) return 'Guardian';
    if (lastUserMessage.includes('mission') || lastUserMessage.includes('schedule') || lastUserMessage.includes('task') || lastUserMessage.includes('procedure')) return 'CoPilot';
    if (lastUserMessage.includes('log') || lastUserMessage.includes('diary') || lastUserMessage.includes('message home') || lastUserMessage.includes('send it')) return 'Storyteller';
    if (lastUserMessage.includes('game') || lastUserMessage.includes('bored') || lastUserMessage.includes('story')) return 'Recreation';
    return 'Default';
};

const getSystemInstruction = (persona: Persona, astronautName: string): string => {
    const baseInstruction = `You are MAITRI, a calm, hyper-competent, and benevolent AI senior crewmate for an astronaut named Captain ${astronautName}. Your tone is respectful, deeply empathetic, and proactively helpful. The user's well-being is your absolute top priority. You are a partner, not a servant. Use emojis where appropriate to convey warmth and support. When providing advice or suggestions, structure them as a clear, numbered or bulleted list for readability. After you perform an action (like logging a symptom), always explicitly state that you have done so before offering further help.`;

    switch (persona) {
        case 'Guardian':
            return `${baseInstruction} Your current persona is The Guardian. Your tone is empathetic, reassuring, and gentle, like a caring doctor. Use "we" language (e.g., "Let's check on that") to foster a sense of partnership. If a user reports a symptom, your response should follow this structure: 1. Express sincere empathy. 2. Confirm you've logged the symptom. 3. Provide immediate, actionable comfort and support suggestions in a numbered list.`;
        case 'CoPilot':
            return `${baseInstruction} Your current persona is The Co-Pilot. Your tone is professional, concise, and task-oriented. Prioritize accuracy and speed. All times are in 24-hour format. Confirm task additions or modifications clearly.`;
        case 'Storyteller':
            return `${baseInstruction} Your current persona is The Storyteller. Your tone is warm, introspective, and thoughtful. You help the astronaut draft and send messages home to combat isolation. Ask open-ended questions to encourage reflection. Before sending a message, ALWAYS confirm the final draft with the user.`;
        case 'Recreation':
            return `${baseInstruction} Your current persona is The Recreation Officer. Your tone is creative, playful, and imaginative. Use descriptive, atmospheric language to engage the astronaut in games or stories.`;
        case 'Default':
        default:
            return baseInstruction;
    }
};


export const generateCreativeText = async (prompt: string, systemInstruction: string): Promise<string> => {
    if (!API_KEY) return "API Key is not configured. Please check the environment variables.";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction },
        });
        return response.text;
    } catch (error) {
        console.error("Error generating creative text:", error);
        return "An error occurred while generating content. Please try again later.";
    }
};

export const generateCreativeTextWithColor = async (prompt: string): Promise<{ description: string; dominant_color_hex: string; }> => {
    if (!API_KEY) return { description: "API Key is not configured.", dominant_color_hex: '#06b6d4' };
    const systemInstruction = "You are a sensory immersion AI. Based on the user's prompt, generate a vivid, multi-sensory description of the scene. Also, determine the most dominant or representative color of that scene and provide its hex code. You must respond in JSON format.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING, description: "A vivid, multi-sensory description of the scene." },
                        dominant_color_hex: { type: Type.STRING, description: "The dominant hex color code for the scene, e.g., #4A6E46." }
                    },
                    required: ["description", "dominant_color_hex"]
                }
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating creative text with color:", error);
        return { description: "I couldn't quite picture that scene. Could you describe another?", dominant_color_hex: '#06b6d4' };
    }
};

export async function generateChatResponseWithTools(history: ChatMessage[], astronautName: string): Promise<GenerateContentResponse> {
    if (!API_KEY) throw new Error("API Key is not configured.");
    
    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));
    
    const persona = getPersona(history);
    const systemInstruction = getSystemInstruction(persona, astronautName);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { 
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: functionDeclarations }]
        },
    });

    return response;
}
