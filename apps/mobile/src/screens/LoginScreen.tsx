import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { COLORS, TYPOGRAPHY, BRAND } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, sessionExpired, clearSessionExpired } = useAuth();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchApi('/users/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      clearSessionExpired();
      login(data.user, data.token);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/guranda-logo.png')}
        style={styles.logoMark}
        resizeMode="contain"
      />
      <Text style={styles.tagline}>{BRAND.tagline}</Text>

      {sessionExpired && (
        <View style={styles.sessionBanner}>
          <Text style={styles.sessionBannerText}>Your session expired. Please log in again.</Text>
        </View>
      )}

      <View style={styles.form}>
        <TextInput 
          style={styles.input} 
          placeholder="Phone Number or Username"
          placeholderTextColor={COLORS.textMuted}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          secureTextEntry
          placeholderTextColor={COLORS.textMuted}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
             <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={isLoading}>
          <Text style={styles.linkText}>Don't have an account? Register</Text>
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
    alignItems: 'center',
  },
  logoMark: {
    width: 220,
    height: 220,
    marginBottom: 4,
  },
  tagline: {
    ...TYPOGRAPHY.body2,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  sessionBanner: {
    marginTop: 24,
    width: '100%',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 12,
    padding: 12,
  },
  sessionBannerText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginTop: 40,
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
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
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
  }
});
