import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

interface ServiceRow {
  id: string | number;
  name: string;
  description: string;
  price: string;
}

export default function ManageCarWashScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, SPACING } = theme;
  const existing = route?.params?.carWash;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [desc, setDesc] = useState(existing?.description || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [services, setServices] = useState<ServiceRow[]>(
    existing?.services?.length
      ? existing.services.map((s: any) => ({
          id: s.id,
          name: s.name || '',
          description: s.description || '',
          price: s.price != null ? String(s.price) : '',
        }))
      : [{ id: Date.now(), name: '', description: '', price: '' }]
  );
  const [submitting, setSubmitting] = useState(false);

  const addService = () => {
    setServices([...services, { id: Date.now(), name: '', description: '', price: '' }]);
  };

  const updateService = (id: string | number, field: string, value: string) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeService = (id: string | number) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleSubmit = async () => {
    if (!name || !address) {
      Alert.alert('Missing fields', 'Please provide a name and address.');
      return;
    }

    const validServices = services.filter(s => s.name && s.price);

    try {
      setSubmitting(true);
      const res = isEdit
        ? await fetchApi(`/carwash/${existing.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              name,
              description: desc,
              address,
              services: validServices,
            }),
          })
        : await fetchApi('/carwash', {
            method: 'POST',
            body: JSON.stringify({
              name,
              description: desc,
              address,
              services: validServices,
            }),
          });

      if (!res.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} car wash`);
      }

      Alert.alert('Success', `Car wash ${isEdit ? 'updated' : 'created'} successfully!`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 40, height: 40,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    saveBtn: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: RADIUS.pill,
      justifyContent: 'center', alignItems: 'center',
    },
    saveText: { color: '#FFF', fontWeight: 'bold' },
    label: { ...TYPOGRAPHY.label, marginBottom: 8, marginTop: 16 },
    input: {
      backgroundColor: COLORS.glass,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      color: COLORS.text,
    },
    servicesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 },
    sectionTitle: { ...TYPOGRAPHY.h3 },
    serviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.02)',
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: COLORS.glassBorder,
      marginBottom: SPACING.md,
    },
    removeBtn: { padding: 8, marginLeft: 8 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>{isEdit ? 'Edit Car Wash' : 'Manage Car Wash'}</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <Text style={styles.label}>Car Wash Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Sparkle Wash"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 123 Main St"
          placeholderTextColor={COLORS.textMuted}
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Tell customers about your car wash"
          placeholderTextColor={COLORS.textMuted}
          multiline
          value={desc}
          onChangeText={setDesc}
        />

        <View style={styles.servicesHeader}>
          <Text style={styles.sectionTitle}>Services & Prices</Text>
          <TouchableOpacity onPress={addService}>
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {services.map((service) => (
          <View key={service.id} style={styles.serviceRow}>
            <View style={{ flex: 1, gap: 8 }}>
              <TextInput
                style={styles.input}
                placeholder="Service Name (e.g. Full Wash)"
                placeholderTextColor={COLORS.textMuted}
                value={service.name}
                onChangeText={t => updateService(service.id, 'name', t)}
              />
              <TextInput
                style={styles.input}
                placeholder="Description"
                placeholderTextColor={COLORS.textMuted}
                value={service.description}
                onChangeText={t => updateService(service.id, 'description', t)}
              />
              <TextInput
                style={styles.input}
                placeholder="Price (MSH)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={service.price}
                onChangeText={t => updateService(service.id, 'price', t)}
              />
            </View>
            {services.length > 1 && (
              <TouchableOpacity onPress={() => removeService(service.id)} style={styles.removeBtn}>
                <Ionicons name="trash" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
