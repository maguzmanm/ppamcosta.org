import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Experience } from '../types';

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: '⏳ Pendiente',
  APROBADO: '✅ Aprobado',
  RECHAZADO: '❌ Rechazado',
};

export default function ExperiencesScreen() {
  const { canManageExperiences } = useAuth();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get('/experiences');
      setExperiences(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const handleSubmit = async () => {
    if (!title || !content) { Alert.alert('Error', 'Completa todos los campos'); return; }
    try {
      await api.post('/experiences', { title, content });
      setTitle(''); setContent(''); setShowForm(false);
      Alert.alert('✅', 'Experiencia enviada para revisión');
      fetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error';
      Alert.alert('Error', msg);
    }
  };

  const handleReview = async (id: string, status: 'APROBADO' | 'RECHAZADO') => {
    try {
      await api.put(`/experiences/${id}/review`, { status });
      fetch();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const renderItem = ({ item }: { item: Experience }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.content}>{item.content}</Text>
      <View style={styles.footer}>
        <Text style={styles.author}>✍️ {item.publisher?.firstName} {item.publisher?.lastName}</Text>
        <Text style={[styles.status, { color: item.status === 'APROBADO' ? '#38a169' : item.status === 'RECHAZADO' ? '#e53e3e' : '#d69e2e' }]}>
          {STATUS_LABELS[item.status]}
        </Text>
      </View>
      {canManageExperiences && item.status === 'PENDIENTE' && (
        <View style={styles.reviewActions}>
          <TouchableOpacity style={styles.approveBtn} onPress={() => handleReview(item.id, 'APROBADO')}>
            <Text style={styles.approveText}>✅ Aprobar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReview(item.id, 'RECHAZADO')}>
            <Text style={styles.rejectText}>❌ Rechazar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.newBtn} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.newBtnText}>{showForm ? 'Cancelar' : '+ Nueva experiencia'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Título" placeholderTextColor="#a0aec0" value={title} onChangeText={setTitle} />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Cuenta tu experiencia..." placeholderTextColor="#a0aec0" value={content} onChangeText={setContent} multiline numberOfLines={4} />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Enviar para revisión</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={experiences}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>No hay experiencias aún</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc', padding: 16 },
  newBtn: { backgroundColor: '#2b6cb0', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  newBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  input: {
    backgroundColor: '#f7fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#2d3748', marginBottom: 10,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#38a169', borderRadius: 10, padding: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  title: { fontSize: 17, fontWeight: '600', color: '#2d3748', marginBottom: 6 },
  content: { fontSize: 14, color: '#4a5568', lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  author: { fontSize: 12, color: '#a0aec0' },
  status: { fontSize: 12, fontWeight: '600' },
  reviewActions: { flexDirection: 'row', marginTop: 10, gap: 8 },
  approveBtn: { flex: 1, backgroundColor: '#c6f6d5', borderRadius: 8, padding: 10, alignItems: 'center' },
  approveText: { color: '#22543d', fontWeight: '600' },
  rejectBtn: { flex: 1, backgroundColor: '#fed7d7', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectText: { color: '#742a2a', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#a0aec0', marginTop: 40, fontSize: 16 },
});
