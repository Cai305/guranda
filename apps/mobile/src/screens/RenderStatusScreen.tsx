import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

const POLL_MS = 2500;

// Rendering happens server-side (video-render.service's ffmpeg pipeline) —
// this screen just polls until the project flips out of RENDERING, then
// hands off to the existing PerformancePreviewScreen (in "resume" mode) for
// caption + draft/publish, same last step every other performance uses.
export default function RenderStatusScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const projectId: string = route?.params?.projectId;
  const [status, setStatus] = useState<'RENDERING' | 'READY' | 'FAILED'>('RENDERING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    try {
      const res = await fetchApi(`/video-projects/${projectId}`, { headers: { 'Cache-Control': 'no-cache' } });
      const project = await res.json();
      if (!mountedRef.current) return;
      if (project.status === 'READY' && project.resultPerformance) {
        const rp = project.resultPerformance;
        navigation.replace('PerformancePreview', {
          performanceId: rp.id,
          song: rp.song ?? undefined,
          mode: 'EDITED',
          videoUri: rp.videoUrl,
          offsetMs: 0,
          caption: rp.caption ?? '',
        });
        return;
      }
      if (project.status === 'FAILED') {
        setStatus('FAILED');
        setErrorMessage(project.errorMessage || 'Something went wrong while rendering your video.');
        return;
      }
      timerRef.current = setTimeout(poll, POLL_MS);
    } catch {
      timerRef.current = setTimeout(poll, POLL_MS);
    }
  }, [projectId, navigation]);

  useEffect(() => {
    mountedRef.current = true;
    poll();
    return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = async () => {
    setRetrying(true);
    setStatus('RENDERING');
    setErrorMessage(null);
    try {
      const res = await fetchApi(`/video-projects/${projectId}/render`, { method: 'POST', body: JSON.stringify({ status: 'DRAFT' }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      poll();
    } catch (e: any) {
      setStatus('FAILED');
      setErrorMessage(e?.message || 'Could not restart the render.');
    } finally {
      setRetrying(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl, gap: 18 },
    title: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
    body: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
    btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 22, paddingVertical: 14, marginTop: 6 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    secondaryBtn: { paddingHorizontal: 22, paddingVertical: 10 },
    secondaryBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 13 },
  }));

  if (status === 'FAILED') {
    return (
      <SafeAreaView style={styles.container}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
        <Text style={styles.title}>Rendering failed</Text>
        <Text style={styles.body}>{errorMessage}</Text>
        <TouchableOpacity style={styles.btn} onPress={retry} disabled={retrying}>
          {retrying ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Try again</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Back to editor</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.title}>Putting it all together…</Text>
      <Text style={styles.body}>Trimming, mixing your music and baking in your edits. This usually takes under a minute.</Text>
    </SafeAreaView>
  );
}
