import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import FormModal from '../components/FormModal';
import type { Announcement, News } from '../types';

type FeedItem = (Announcement & { _type: 'announcement' }) | (News & { _type: 'news' });

export default function AnnouncementsScreen() {
  const { isCoordinator } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const [annRes, newsRes] = await Promise.all([
        api.get('/announcements'),
        api.get('/news'),
      ]);
      const combined: FeedItem[] = [
        ...annRes.data.map((a: Announcement) => ({ ...a, _type: 'announcement' as const })),
        ...newsRes.data.map((n: News) => ({ ...n, _type: 'news' as const })),
      ].sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
      setItems(combined);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const handleCreate = async (formData: Record<string, string>) => {
    try {
      await api.post('/announcements', formData);
      setModalVisible(false);
      fetch();
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error || 'Error al crear');
    }
  };

  const renderItem = ({ item }: { item: FeedItem }) => (
    <View style={[styles.card, item._type === 'announcement' ? styles.cardAnnouncement : styles.cardNews]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{item._type === 'announcement' ? '📢' : '📰'}</Text>
        <Text style={styles.title}>{item.title}</Text>
      </View>
      <Text style={styles.content}>{item.content}</Text>
      <Text style={styles.date}>
        {new Date(item._type === 'announcement' ? (item as Announcement).publishedAt : (item as News).publishedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
        {' · '}{item._type === 'announcement' ? 'Anuncio' : 'Noticia'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {isCoordinator && (
        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.createBtnText}>+ Nuevo anuncio</Text>
        </TouchableOpacity>
      )}
      {loading ? (
        <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>No hay anuncios ni noticias</Text>}
        />
      )}
      <FormModal
        visible={modalVisible}
        title="Nuevo Anuncio"
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
  createBtn: { backgroundColor: '#d69e2e', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: {
    borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardAnnouncement: { backgroundColor: '#fffbeb', borderLeftColor: '#d69e2e' },
  cardNews: { backgroundColor: '#fff', borderLeftColor: '#2b6cb0' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { fontSize: 20, marginRight: 8 },
  title: { fontSize: 17, fontWeight: '600', color: '#2d3748', flex: 1 },
  content: { fontSize: 14, color: '#4a5568', lineHeight: 20, marginBottom: 8 },
  date: { fontSize: 12, color: '#a0aec0' },
  empty: { textAlign: 'center', color: '#a0aec0', marginTop: 40, fontSize: 16 },
});
