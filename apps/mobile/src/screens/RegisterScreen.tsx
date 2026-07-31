import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [isSelfCustodial, setIsSelfCustodial] = useState(false);
  const [loading, setLoading] = useState(false);
  // This IS the free first Username claim (apps/api/src/usernames/) — real-
  // time feedback here so the user doesn't discover a reserved/taken/too-
  // short name only after submitting the whole form.
  const [usernameAvailability, setUsernameAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { login } = useAuth();

  const onChangeUsername = (text: string) => {
    setUsername(text);
    setUsernameAvailability(null);
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    const label = text.trim();
    if (label.length < 3) return;
    usernameCheckTimer.current = setTimeout(() => {
      fetchApi(`/usernames/check?label=${encodeURIComponent(label)}`)
        .then(res => (res.ok ? res.json() : null))
        .then(setUsernameAvailability)
        .catch(() => {});
    }, 400);
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !occupation.trim()) {
      Alert.alert('Missing info', 'First name, last name and occupation are required to create your Guranda identity.');
      return;
    }
    if (usernameAvailability && !usernameAvailability.available) {
      Alert.alert('Username unavailable', usernameAvailability.reason || 'Choose a different username.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetchApi('/users/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          passwordHash: password, // In production, never send plain text if not over HTTPS
          isSelfCustodial,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          occupation: occupation.trim(),
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to register');

      Alert.alert('Welcome to Guranda', 'Your identity and wallet are ready. One Identity. One Economy. One Life.');
      login(data.user, data.token);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/guranda-logo.png')}
        style={styles.logoMark}
        resizeMode="contain"
      />
      <Text style={TYPOGRAPHY.h2}>Create your Guranda identity</Text>
      <Text style={[TYPOGRAPHY.body2, { marginTop: 6 }]}>
        One account for your social life, games, wallet and everything to come.
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Choose a Nickname"
          placeholderTextColor={COLORS.textMuted}
          value={username}
          onChangeText={onChangeUsername}
          autoCapitalize="none"
        />
        {username.trim().length >= 3 && usernameAvailability && (
          <Text style={[styles.availabilityText, { color: usernameAvailability.available ? '#22C55E' : '#F87171' }]}>
            {usernameAvailability.available ? 'Available! This is your free first username.' : usernameAvailability.reason}
          </Text>
        )}
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          placeholderTextColor={COLORS.textMuted}
          value={password}
          onChangeText={setPassword}
        />

        <Text style={[TYPOGRAPHY.body2, { marginTop: 4 }]}>
          A few personal details — required for every Guranda account.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor={COLORS.textMuted}
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder="Last name"
          placeholderTextColor={COLORS.textMuted}
          value={lastName}
          onChangeText={setLastName}
        />
        <TextInput
          style={styles.input}
          placeholder="Occupation"
          placeholderTextColor={COLORS.textMuted}
          value={occupation}
          onChangeText={setOccupation}
        />

        <View style={styles.custodyCard}>
          <Text style={[TYPOGRAPHY.body1, { fontWeight: '600' }]}>Wallet Custody Preference</Text>
          <Text style={[TYPOGRAPHY.body2, { marginTop: 5, marginBottom: 15 }]}>
            How would you like us to handle your Masheleni 2.0 wallet?
          </Text>
          
          <TouchableOpacity 
            style={[styles.radio, !isSelfCustodial && styles.radioActive]} 
            onPress={() => setIsSelfCustodial(false)}
          >
            <Text style={styles.radioText}>Platform Managed (Easy recovery)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.radio, isSelfCustodial && styles.radioActive]} 
            onPress={() => setIsSelfCustodial(true)}
          >
            <Text style={styles.radioText}>Self-Custodial (You own the keys)</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: 'center',
  },
  logoMark: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 4,
  },
  form: {
    width: '100%',
    marginTop: 20,
    gap: 15,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  custodyCard: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  radio: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  radioActive: {
    borderColor: COLORS.secondary,
    backgroundColor: 'rgba(0, 245, 212, 0.1)',
  },
  radioText: {
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 16,
  },
  linkText: {
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: 10,
  },
  availabilityText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: -8,
  },
});
