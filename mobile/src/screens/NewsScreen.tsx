import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import FormModal from '../components/FormModal';
import type { News } from '../types';

export default function NewsScreen() {
  const { isCoordinator } = useAuth();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get('/news');
      setNews(data);
    } catch (err) {
      console.error('Error cargando noticias:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const handleCreate = async (formData: Record<string, string>) => {
    try {
      await api.post('/news', formData);
      setModalVisible(false);
      fetch();
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error || 'Error al crear');
    }
  };

  const renderItem = ({ item }: { item: News }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
      <View style={styles.footer}>
        <Text style={styles.author}>
          ✍️ {item.author?.publisher?.firstName} {item.author?.publisher?.lastName}
        </Text>
        <Text style={styles.date}>
          {new Date(item.publishedAt).toLocaleDateString('es-CL')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isCoordinator && (
        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.createBtnText}>+ Nueva noticia</Text>
        </TouchableOpacity>
      )}
      {loading ? (
        <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>No hay noticias aún</Text>}
        />
      )}
      <FormModal
        visible={modalVisible}
        title="Nueva Noticia"
        fields={[
          { key: 'title', label: 'Título', value: '' },
          { key: 'content', label: 'Contenido', value: '', multiline: true },
        ]}
        onSave={handleCreate}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc', padding: 16 },
  createBtn: { backgroundColor: '#2b6cb0', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  title: { fontSize: 17, fontWeight: '600', color: '#2d3748', marginBottom: 6 },
  content: { fontSize: 14, color: '#4a5568', lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  author: { fontSize: 12, color: '#a0aec0' },
  date: { fontSize: 12, color: '#a0aec0' },
  empty: { textAlign: 'center', color: '#a0aec0', marginTop: 40, fontSize: 16 },
});
