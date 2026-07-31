import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export interface VoiceCaptureResult {
  /** Transcribed text, or null if this platform can't transcribe on-device. */
  text: string | null;
  durationMs: number;
}

// Web uses the browser's built-in Web Speech API. Native uses on-device
// speech recognition (iOS SFSpeechRecognizer / Android SpeechRecognizer) via
// expo-speech-recognition — no cloud API key, no per-request cost, no
// network round-trip for the recognition itself. Requires a custom dev
// client build (won't run in plain Expo Go).
export function useVoiceCapture() {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const startedAtRef = useRef(0);
  const nativeActiveRef = useRef(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const canTranscribeWeb = Platform.OS === 'web'
    && typeof window !== 'undefined'
    && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const canTranscribeNative = Platform.OS !== 'web';

  // Native speech events — the hook must be called unconditionally, but the
  // listeners only act while a native recognition session is actually active.
  useSpeechRecognitionEvent('result', (event) => {
    if (!nativeActiveRef.current) return;
    const chunk = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      finalTranscriptRef.current += `${chunk} `;
      setInterimText('');
    } else {
      setInterimText(chunk);
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    if (!nativeActiveRef.current) return;
    setError(event.message || event.error || 'Speech recognition error');
  });

  useEffect(() => () => {
    if (nativeActiveRef.current) ExpoSpeechRecognitionModule.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setInterimText('');
    finalTranscriptRef.current = '';
    startedAtRef.current = Date.now();

    if (canTranscribeWeb) {
      const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscriptRef.current += `${chunk} `;
          else interim += chunk;
        }
        setInterimText(interim);
      };
      recognition.onerror = (event: any) => setError(event.error || 'Speech recognition error');
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      return;
    }

    if (canTranscribeNative) {
      try {
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!granted) {
          setError('Microphone/speech recognition permission was denied.');
          return;
        }
        nativeActiveRef.current = true;
        ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
        setIsListening(true);
      } catch (e: any) {
        setError(e.message || 'Could not start speech recognition.');
      }
      return;
    }

    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Microphone permission was denied.');
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsListening(true);
    } catch (e: any) {
      setError(e.message || 'Could not start recording.');
    }
  }, [canTranscribeWeb, canTranscribeNative, recorder]);

  const stop = useCallback(async (): Promise<VoiceCaptureResult> => {
    const durationMs = Date.now() - startedAtRef.current;
    setIsListening(false);

    if (canTranscribeWeb) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      const text = `${finalTranscriptRef.current} ${interimText}`.trim();
      setInterimText('');
      return { text: text || null, durationMs };
    }

    if (canTranscribeNative) {
      ExpoSpeechRecognitionModule.stop();
      nativeActiveRef.current = false;
      const text = `${finalTranscriptRef.current} ${interimText}`.trim();
      setInterimText('');
      return { text: text || null, durationMs };
    }

    try {
      await recorder.stop();
    } catch {
      // already stopped or never started — nothing to clean up
    }
    return { text: null, durationMs };
  }, [canTranscribeWeb, canTranscribeNative, interimText, recorder]);

  return { start, stop, isListening, interimText, error, canTranscribe: canTranscribeWeb || canTranscribeNative };
}
