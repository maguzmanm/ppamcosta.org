import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import FormModal from '../components/FormModal';
import type { Circuit } from '../types';

export default function CircuitsScreen() {
  const { isCoordinator } = useAuth();
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Circuit | null>(null);

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get('/circuits');
      setCircuits(data);
      setForbidden(false);
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        const msg = (err as any)?.response?.data?.error || (err as any)?.message || 'Error de conexión';
        Alert.alert('Error al cargar circuitos', msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const handleSave = async (formData: Record<string, string>) => {
    try {
      if (editing) {
        await api.put(`/circuits/${editing.id}`, formData);
      } else {
        await api.post('/circuits', formData);
      }
      setModalVisible(false);
      setEditing(null);
      fetch();
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    Alert.alert('Eliminar', `¿Eliminar circuito "${editing.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await api.delete(`/circuits/${editing.id}`);
        setModalVisible(false); setEditing(null); fetch();
      }},
    ]);
  };

  const renderItem = ({ item }: { item: Circuit }) => (
    <TouchableOpacity style={styles.card} onPress={() => isCoordinator && (setEditing(item), setModalVisible(true))}>
      <Text style={styles.name}>🔄 {item.name}</Text>
      <Text style={styles.count}>{item._count?.congregations || 0} congregaciones</Text>
      {isCoordinator && <Text style={styles.editHint}>Toca para editar ✏️</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isCoordinator && (
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditing(null); setModalVisible(true); }}>
          <Text style={styles.addBtnText}>+ Nuevo circuito</Text>
        </TouchableOpacity>
      )}
      {loading ? (
        <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 40 }} />
      ) : forbidden ? (
        <View style={styles.forbiddenContainer}>
          <Text style={styles.forbiddenIcon}>🔒</Text>
          <Text style={styles.forbiddenText}>No tienes permisos para ver esta sección</Text>
        </View>
      ) : (
        <FlatList
          data={circuits}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>No hay circuitos</Text>}
        />
      )}
      <FormModal
        visible={modalVisible}
        title={editing ? 'Editar Circuito' : 'Nuevo Circuito'}
        fields={[{ key: 'name', label: 'Nombre', value: editing?.name || '' }]}
        onSave={handleSave}
        onCancel={() => { setModalVisible(false); setEditing(null); }}
        onDelete={editing ? handleDelete : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc', padding: 16 },
  addBtn: { backgroundColor: '#2b6cb0', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  name: { fontSize: 17, fontWeight: '600', color: '#2d3748' },
  count: { fontSize: 14, color: '#718096', marginTop: 4 },
  editHint: { fontSize: 11, color: '#a0aec0', textAlign: 'right', marginTop: 8 },
  empty: { textAlign: 'center', color: '#a0aec0', marginTop: 40, fontSize: 16 },
  forbiddenContainer: { alignItems: 'center', marginTop: 60 },
  forbiddenIcon: { fontSize: 48, marginBottom: 16 },
  forbiddenText: { fontSize: 16, color: '#718096', textAlign: 'center' },
});
