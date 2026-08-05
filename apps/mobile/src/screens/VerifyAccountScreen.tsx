import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Image, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi, uploadImage } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ID_TYPES = [
  { key: 'NATIONAL_ID', label: 'National ID' },
  { key: 'PASSPORT', label: 'Passport' },
  { key: 'DRIVERS_LICENSE', label: "Driver's Licence" },
];

async function pickAndUpload(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return null;
  return uploadImage(result.assets[0].uri);
}

export default function VerifyAccountScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING, TYPOGRAPHY } = theme;
  const { refreshVerification } = useAuth();
  const reason: string | undefined = route?.params?.reason;

  const STATUS_COPY: Record<string, { title: string; body: string; color: string; icon: string }> = {
    VERIFIED: { title: 'Verified', body: 'Your account is verified — the wallet and creator funds are fully unlocked.', color: '#10B981', icon: 'shield-checkmark' },
    PENDING: { title: 'Under review', body: 'Your submission is with the Guranda team for review. This usually covers business or certificate documents.', color: '#F59E0B', icon: 'time' },
    REJECTED: { title: 'Not approved', body: 'Your last submission was rejected — check the reason below and resubmit.', color: '#F87171', icon: 'close-circle' },
    UNVERIFIED: { title: 'Not verified yet', body: 'Verify your identity to unlock the wallet, creator funds and verified-only modules.', color: COLORS.textMuted, icon: 'shield-outline' },
  };

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<any>(null);

  const [idType, setIdType] = useState('NATIONAL_ID');
  const [idNumber, setIdNumber] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [uploadingId, setUploadingId] = useState(false);

  const [hasBusiness, setHasBusiness] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessReg, setBusinessReg] = useState('');
  const [businessDocs, setBusinessDocs] = useState<string[]>([]);
  const [uploadingBizDoc, setUploadingBizDoc] = useState(false);

  const [isGraduate, setIsGraduate] = useState(false);
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certFileUrl, setCertFileUrl] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);

  const load = useCallback(() => {
    fetchApi('/verification/me')
      .then(res => (res.ok ? res.json() : null))
      .then(setVerification)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const status: string = verification?.status || 'UNVERIFIED';
  const copy = STATUS_COPY[status];
  const canEdit = status === 'UNVERIFIED' || status === 'REJECTED';

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    reasonBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
      borderRadius: RADIUS.md, padding: 12, marginBottom: SPACING.md,
    },
    reasonText: { color: '#F59E0B', fontSize: 13, fontWeight: '600', flex: 1 },
    statusCard: {
      flexDirection: 'row', gap: 12, alignItems: 'flex-start',
      backgroundColor: COLORS.glass, borderWidth: 1, borderRadius: RADIUS.lg,
      padding: 14, marginBottom: SPACING.md,
    },
    statusTitle: { fontSize: 15, fontWeight: '800' },
    statusBody: { color: COLORS.textMuted, fontSize: 13, marginTop: 3, lineHeight: 18 },
    rejectionReason: { color: '#F87171', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
    personalCard: {
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: 12, marginBottom: SPACING.md,
    },
    personalLabel: { ...TYPOGRAPHY.label, fontSize: 10 },
    personalValue: { color: COLORS.text, fontWeight: '700', fontSize: 15, marginTop: 4 },
    personalSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, marginTop: SPACING.md, marginBottom: SPACING.sm },
    card: {
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.lg, padding: 14, gap: 10, marginBottom: SPACING.sm,
    },
    idTypeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    idTypeChip: {
      borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.pill,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    idTypeChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(139,92,246,0.15)' },
    idTypeText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
    idTypeTextActive: { color: COLORS.primary },
    input: {
      backgroundColor: COLORS.surface, color: COLORS.text, padding: 13,
      borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    },
    uploadBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed',
      borderRadius: RADIUS.sm, paddingVertical: 12,
    },
    uploadBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
    docPreview: { width: '100%', height: 140, borderRadius: RADIUS.sm, marginTop: 4 },
    docCount: { color: '#10B981', fontSize: 12, fontWeight: '600' },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 10,
    },
    toggleTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    toggleSub: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 2 },
    submitBtn: {
      backgroundColor: COLORS.primary, padding: 15, borderRadius: RADIUS.md,
      alignItems: 'center', marginTop: SPACING.md,
    },
    submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    footnote: { color: COLORS.textMuted, fontSize: 11.5, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 16 },
  }));

  const uploadId = async () => {
    try {
      setUploadingId(true);
      const url = await pickAndUpload();
      if (url) setIdDocumentUrl(url);
    } catch {
      Alert.alert('Upload failed', 'Could not upload your ID document — try again.');
    } finally {
      setUploadingId(false);
    }
  };

  const uploadBizDoc = async () => {
    try {
      setUploadingBizDoc(true);
      const url = await pickAndUpload();
      if (url) setBusinessDocs(prev => [...prev, url]);
    } catch {
      Alert.alert('Upload failed', 'Could not upload the document — try again.');
    } finally {
      setUploadingBizDoc(false);
    }
  };

  const uploadCert = async () => {
    try {
      setUploadingCert(true);
      const url = await pickAndUpload();
      if (url) setCertFileUrl(url);
    } catch {
      Alert.alert('Upload failed', 'Could not upload the certificate — try again.');
    } finally {
      setUploadingCert(false);
    }
  };

  const submit = async () => {
    if (!idNumber.trim() || !idDocumentUrl) {
      Alert.alert('Missing info', 'ID number and a photo of your ID document are required.');
      return;
    }
    if (hasBusiness && (!businessName.trim() || businessDocs.length === 0)) {
      Alert.alert('Missing business info', 'Business name and at least one supporting document are required.');
      return;
    }
    if (isGraduate && (!certTitle.trim() || !certFileUrl)) {
      Alert.alert('Missing certificate', 'Certificate title and file are required.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetchApi('/verification/submit', {
        method: 'POST',
        body: JSON.stringify({
          idType,
          idNumber: idNumber.trim(),
          idDocumentUrl,
          business: hasBusiness ? {
            name: businessName.trim(),
            registrationNumber: businessReg.trim() || undefined,
            documents: businessDocs,
          } : undefined,
          certificates: isGraduate ? [{
            title: certTitle.trim(),
            issuer: certIssuer.trim() || undefined,
            fileUrl: certFileUrl,
          }] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not submit verification');
      setVerification(data);
      await refreshVerification();
      Alert.alert(
        data.status === 'VERIFIED' ? 'Verified!' : 'Submitted for review',
        data.status === 'VERIFIED'
          ? 'Your account is verified — the wallet and creator funds are unlocked.'
          : 'Your business/certificate documents are with the Guranda team for review.',
      );
    } catch (e: any) {
      Alert.alert('Submit failed', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h2}>Verify your account</Text>
          <View style={{ width: 40 }} />
        </View>

        {reason && (
          <View style={styles.reasonBanner}>
            <Ionicons name="lock-closed" size={16} color="#F59E0B" />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}

        <View style={[styles.statusCard, { borderColor: copy.color + '55' }]}>
          <Ionicons name={copy.icon as any} size={22} color={copy.color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: copy.color }]}>{copy.title}</Text>
            <Text style={styles.statusBody}>{copy.body}</Text>
            {status === 'REJECTED' && verification?.rejectionReason && (
              <Text style={styles.rejectionReason}>Reason: {verification.rejectionReason}</Text>
            )}
          </View>
        </View>

        {verification && (
          <View style={styles.personalCard}>
            <Text style={styles.personalLabel}>PERSONAL INFO (from registration)</Text>
            <Text style={styles.personalValue}>{verification.firstName} {verification.lastName}</Text>
            <Text style={styles.personalSub}>{verification.occupation}</Text>
          </View>
        )}

        {canEdit && (
          <>
            <Text style={styles.sectionLabel}>IDENTITY DOCUMENT</Text>
            <View style={styles.card}>
              <View style={styles.idTypeRow}>
                {ID_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.idTypeChip, idType === t.key && styles.idTypeChipActive]}
                    onPress={() => setIdType(t.key)}
                  >
                    <Text style={[styles.idTypeText, idType === t.key && styles.idTypeTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="ID / passport number"
                placeholderTextColor={COLORS.textMuted}
                value={idNumber}
                onChangeText={setIdNumber}
              />
              <TouchableOpacity style={styles.uploadBtn} onPress={uploadId} disabled={uploadingId}>
                {uploadingId ? <ActivityIndicator color={COLORS.primary} /> : (
                  <>
                    <Ionicons name={idDocumentUrl ? 'checkmark-circle' : 'camera-outline'} size={18} color={idDocumentUrl ? '#10B981' : COLORS.primary} />
                    <Text style={styles.uploadBtnText}>{idDocumentUrl ? 'ID document uploaded' : 'Upload photo of ID document'}</Text>
                  </>
                )}
              </TouchableOpacity>
              {idDocumentUrl ? <Image source={{ uri: idDocumentUrl }} style={styles.docPreview} /> : null}
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>I have a business</Text>
                <Text style={styles.toggleSub}>List it with supporting documents — reviewed manually by an admin</Text>
              </View>
              <Switch value={hasBusiness} onValueChange={setHasBusiness} trackColor={{ true: COLORS.primary }} />
            </View>
            {hasBusiness && (
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  placeholder="Business name"
                  placeholderTextColor={COLORS.textMuted}
                  value={businessName}
                  onChangeText={setBusinessName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Registration number (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={businessReg}
                  onChangeText={setBusinessReg}
                />
                <TouchableOpacity style={styles.uploadBtn} onPress={uploadBizDoc} disabled={uploadingBizDoc}>
                  {uploadingBizDoc ? <ActivityIndicator color={COLORS.primary} /> : (
                    <>
                      <Ionicons name="document-attach-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.uploadBtnText}>Add supporting document</Text>
                    </>
                  )}
                </TouchableOpacity>
                {businessDocs.length > 0 && (
                  <Text style={styles.docCount}>{businessDocs.length} document{businessDocs.length > 1 ? 's' : ''} attached</Text>
                )}
              </View>
            )}

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>I'm a graduate</Text>
                <Text style={styles.toggleSub}>Upload a certificate — reviewed manually by an admin</Text>
              </View>
              <Switch value={isGraduate} onValueChange={setIsGraduate} trackColor={{ true: COLORS.primary }} />
            </View>
            {isGraduate && (
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  placeholder="Certificate / qualification title"
                  placeholderTextColor={COLORS.textMuted}
                  value={certTitle}
                  onChangeText={setCertTitle}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Issuing institution (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={certIssuer}
                  onChangeText={setCertIssuer}
                />
                <TouchableOpacity style={styles.uploadBtn} onPress={uploadCert} disabled={uploadingCert}>
                  {uploadingCert ? <ActivityIndicator color={COLORS.primary} /> : (
                    <>
                      <Ionicons name={certFileUrl ? 'checkmark-circle' : 'school-outline'} size={18} color={certFileUrl ? '#10B981' : COLORS.primary} />
                      <Text style={styles.uploadBtnText}>{certFileUrl ? 'Certificate uploaded' : 'Upload certificate'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit for verification</Text>}
            </TouchableOpacity>
            <Text style={styles.footnote}>
              ID-only submissions are approved instantly. Business or certificate submissions go to the Guranda team for manual review.
            </Text>
          </>
        )}

        {status === 'PENDING' && (
          <Text style={styles.footnote}>You'll be notified once an admin reviews your submission.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
