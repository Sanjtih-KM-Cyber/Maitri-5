
// utils.ts

/**
 * Converts a Blob object to a Base64 data URL.
 * This is useful for saving images captured from the camera to a format
 * that can be stored in state or a database.
 * @param blob The Blob object to convert.
 * @returns A promise that resolves with the data URL string.
 */
export const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Encodes a Uint8Array into a Base64 string.
 * Required for sending raw audio data to the Gemini Live API.
 * @param bytes The byte array to encode.
 * @returns The Base64 encoded string.
 */
export const encode = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Decodes a Base64 string into a Uint8Array.
 * Required for processing audio data received from the Gemini Live API.
 * @param base64 The Base64 string to decode.
 * @returns The decoded Uint8Array.
 */
export const decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Decodes raw PCM audio data from a Uint8Array into an AudioBuffer for playback.
 * This is a crucial step because the browser's native decodeAudioData expects
 * file headers (like WAV or MP3), which are not present in the raw stream from Gemini.
 * @param data The raw PCM audio data.
 * @param ctx The AudioContext to use for creating the buffer.
 * @param sampleRate The sample rate of the audio (e.g., 24000 for Gemini output).
 * @param numChannels The number of audio channels (typically 1).
 * @returns A promise that resolves with the decoded AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // The input data is 16-bit PCM, so we create an Int16Array view on the buffer.
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert the 16-bit integer sample back to a floating-point value between -1.0 and 1.0.
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
