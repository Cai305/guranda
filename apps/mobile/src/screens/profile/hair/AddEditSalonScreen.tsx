import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { fetchApi } from '../../../utils/api';

// Johannesburg — a reasonable default so the form is submittable without a
// GPS fix (which expo-location can't provide on web at all); "Use my
// location" overwrites this with a real fix on native.
const DEFAULT_LAT = -26.2041;
const DEFAULT_LNG = 28.0473;

export default function AddEditSalonScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const existing = route.params?.salon;
  const isEdit = !!existing;

  const [businessName, setBusinessName] = useState(existing?.businessName || '');
  const [bio, setBio] = useState(existing?.bio || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [lat, setLat] = useState((existing?.lat ?? DEFAULT_LAT).toString());
  const [lng, setLng] = useState((existing?.lng ?? DEFAULT_LNG).toString());
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const styles = useThemedStyles(({ COLORS, SPACING, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    optional: { color: COLORS.textMuted, fontWeight: '400' },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: 14 },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    locateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
    locateBtnText: { color: COLORS.primary, fontSize: 12.5, fontWeight: '700' },
    errorText: { color: '#ef4444', fontSize: 13 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    saveBtn: { backgroundColor: '#38BDF8', borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  }));

  const useMyLocation = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Use the Guranda mobile app to set your location automatically, or enter it manually below.');
      return;
    }
    setLocating(true);
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let status = existingStatus;
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to set your salon\'s position automatically.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(pos.coords.latitude.toString());
      setLng(pos.coords.longitude.toString());
    } catch {
      Alert.alert('Could not get your location', 'Enter it manually below instead.');
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!businessName.trim()) { setError('Business name is required'); return; }
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) { setError('Latitude and longitude must be numbers'); return; }
    setSaving(true);
    setError('');
    try {
      const body = { businessName: businessName.trim(), bio: bio.trim() || undefined, address: address.trim() || undefined, lat: parsedLat, lng: parsedLng };
      const res = isEdit
        ? await fetchApi('/hair/mine', { method: 'PATCH', body: JSON.stringify(body) })
        : await fetchApi('/hair/mine', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save');
      }
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Salon' : 'Set Up My Salon'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 20, paddingBottom: 100 }}>
        <View>
          <Text style={styles.label}>Business name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Jessica Braids & Beauty" placeholderTextColor={COLORS.textMuted} value={businessName} onChangeText={setBusinessName} />
        </View>
        <View>
          <Text style={styles.label}>Address <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={styles.input} placeholder="e.g. 123 Braamfontein St, Johannesburg" placeholderTextColor={COLORS.textMuted} value={address} onChangeText={setAddress} />
        </View>
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.label, { marginBottom: 0 }]}>Location</Text>
            <TouchableOpacity style={styles.locateBtn} onPress={useMyLocation} disabled={locating}>
              {locating ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="locate" size={14} color={COLORS.primary} />}
              <Text style={styles.locateBtnText}>Use my location</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <TextInput style={styles.input} placeholder="Latitude" placeholderTextColor={COLORS.textMuted} value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" />
            </View>
            <View style={styles.half}>
              <TextInput style={styles.input} placeholder="Longitude" placeholderTextColor={COLORS.textMuted} value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" />
            </View>
          </View>
        </View>
        <View>
          <Text style={styles.label}>Bio <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Your experience, specialties…" placeholderTextColor={COLORS.textMuted} value={bio} onChangeText={setBio} multiline />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Create Salon'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
