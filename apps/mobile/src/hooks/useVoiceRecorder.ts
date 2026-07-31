import { useCallback, useRef, useState } from 'react';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';

// Deliberately simpler than useVoiceCapture.ts — that hook is built around
// on-device SPEECH-TO-TEXT for the AI orb (its web path never records real
// audio, it just transcribes). A chat voice message needs the actual
// recorded clip to upload and play back, so this one always records.
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const startedAtRef = useRef(0);

  const start = useCallback(async () => {
    setError(null);
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Microphone permission was denied.');
        return false;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAtRef.current = Date.now();
      setIsRecording(true);
      return true;
    } catch (e: any) {
      setError(e.message || 'Could not start recording.');
      return false;
    }
  }, [recorder]);

  /** Returns null if nothing usable was recorded (too short, or never started). */
  const stop = useCallback(async (): Promise<{ uri: string; durationMs: number } | null> => {
    setIsRecording(false);
    const durationMs = Date.now() - startedAtRef.current;
    try {
      await recorder.stop();
    } catch {
      // already stopped/never started
    }
    const uri = recorder.uri;
    if (!uri || durationMs < 500) return null;
    return { uri, durationMs };
  }, [recorder]);

  const cancel = useCallback(async () => {
    setIsRecording(false);
    try {
      await recorder.stop();
    } catch {
      // no-op
    }
  }, [recorder]);

  return { start, stop, cancel, isRecording, error };
}
