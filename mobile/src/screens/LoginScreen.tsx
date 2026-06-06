import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

type Step = 'login' | 'forgot' | 'reset';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('login');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Ingresa email y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error de conexión';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Ingresa tu email');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      Alert.alert('✅', `Código enviado: ${res.data.code}\n\n(En producción se enviaría por email)`);
      setResetCode(res.data.code);
      setStep('reset');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error de conexión';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) {
      Alert.alert('Error', 'Ingresa el código y la nueva contraseña');
      return;
    }
    if (newPassword.length < 4) {
      Alert.alert('Error', 'La contraseña debe tener al menos 4 caracteres');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        code: resetCode,
        newPassword,
      });
      Alert.alert('✅', 'Contraseña actualizada. Ya puedes iniciar sesión.');
      setStep('login');
      setPassword('');
      setNewPassword('');
      setResetCode('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error de conexión';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep('login');
    setResetCode('');
    setNewPassword('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>PPAM</Text>
        <Text style={styles.subtitle}>
          Predicación Pública Áreas Metropolitanas
        </Text>

        {step === 'login' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#a0aec0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#a0aec0"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Iniciar sesión</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotBtn} onPress={() => setStep('forgot')}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'forgot' && (
          <>
            <Text style={styles.stepTitle}>Recuperar contraseña</Text>
            <Text style={styles.stepSub}>Ingresa tu email y te enviaremos un código</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#a0aec0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Enviar código</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotBtn} onPress={goBack}>
              <Text style={styles.forgotText}>← Volver al inicio de sesión</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'reset' && (
          <>
            <Text style={styles.stepTitle}>Nueva contraseña</Text>
            <Text style={styles.stepSub}>Ingresa el código recibido y tu nueva contraseña</Text>

            <TextInput
              style={styles.input}
              placeholder="Código de 6 dígitos"
              placeholderTextColor="#a0aec0"
              keyboardType="number-pad"
              maxLength={6}
              value={resetCode}
              onChangeText={setResetCode}
            />
            <TextInput
              style={styles.input}
              placeholder="Nueva contraseña"
              placeholderTextColor="#a0aec0"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Cambiar contraseña</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotBtn} onPress={goBack}>
              <Text style={styles.forgotText}>← Volver al inicio de sesión</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a365d',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#2d3748',
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#2b6cb0',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  forgotText: {
    color: '#a0aec0',
    fontSize: 14,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 4,
  },
  stepSub: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
  },
});
