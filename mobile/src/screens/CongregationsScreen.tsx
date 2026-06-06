import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import FormModal from '../components/FormModal';
import type { Congregation, Circuit } from '../types';

export default function CongregationsScreen() {
  const { isCoordinator } = useAuth();
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Congregation | null>(null);
  const [selectedCircuitId, setSelectedCircuitId] = useState('');

  const fetch = useCallback(async () => {
    try {
      const [congRes, circRes] = await Promise.all([
        api.get('/congregations'),
        api.get('/circuits'),
      ]);
      setCongregations(congRes.data);
      setCircuits(circRes.data);
      setForbidden(false);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setForbidden(true);
      } else {
        console.error('Error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  React.useEffect(() => {
    setSelectedCircuitId(editing?.circuitId || '');
  }, [editing]);

  const handleSave = async (formData: Record<string, string>) => {
    try {
      const payload = { ...formData, circuitId: selectedCircuitId };
      if (editing) {
        await api.put(`/congregations/${editing.id}`, payload);
      } else {
        await api.post('/congregations', payload);
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
    Alert.alert('Eliminar', `¿Eliminar "${editing.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await api.delete(`/congregations/${editing.id}`);
        setModalVisible(false); setEditing(null); fetch();
      }},
    ]);
  };

  const renderItem = ({ item }: { item: Congregation }) => (
    <TouchableOpacity style={styles.card} onPress={() => isCoordinator && (setEditing(item), setModalVisible(true))}>
      <Text style={styles.name}>🏛 {item.name}</Text>
      <Text style={styles.circuit}>Circuito: {item.circuit?.name || 'Sin circuito'}</Text>
      <Text style={styles.count}>{item._count?.publishers || 0} publicadores</Text>
      {isCoordinator && <Text style={styles.editHint}>Toca para editar ✏️</Text>}
    </TouchableOpacity>
  );

  const selectedCircuit = circuits.find(c => c.id === selectedCircuitId);

  return (
    <View style={styles.container}>
      {isCoordinator && (
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditing(null); setModalVisible(true); }}>
          <Text style={styles.addBtnText}>+ Nueva congregación</Text>
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
          data={congregations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>No hay congregaciones</Text>}
        />
      )}
      <FormModal
        visible={modalVisible}
        title={editing ? 'Editar Congregación' : 'Nueva Congregación'}
        fields={[{ key: 'name', label: 'Nombre', value: editing?.name || '' }]}
        onSave={handleSave}
        onCancel={() => { setModalVisible(false); setEditing(null); }}
        onDelete={editing ? handleDelete : undefined}
      >
        <View style={styles.circuitSection}>
          <Text style={styles.circuitLabel}>Circuito: {selectedCircuit?.name || 'Selecciona'}</Text>
          <View style={styles.circuitRow}>
            {circuits.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.circuitChip, selectedCircuitId === c.id && styles.circuitChipActive]}
                onPress={() => setSelectedCircuitId(c.id)}
              >
                <Text style={[styles.circuitChipText, selectedCircuitId === c.id && styles.circuitChipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </FormModal>
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
  circuit: { fontSize: 14, color: '#718096', marginTop: 4 },
  count: { fontSize: 13, color: '#a0aec0', marginTop: 2 },
  editHint: { fontSize: 11, color: '#a0aec0', textAlign: 'right', marginTop: 8 },
  empty: { textAlign: 'center', color: '#a0aec0', marginTop: 40, fontSize: 16 },
  forbiddenContainer: { alignItems: 'center', marginTop: 60 },
  forbiddenIcon: { fontSize: 48, marginBottom: 16 },
  forbiddenText: { fontSize: 16, color: '#718096', textAlign: 'center' },
  circuitSection: { marginTop: 4, marginBottom: 10 },
  circuitLabel: { fontSize: 14, fontWeight: '600', color: '#4a5568', marginBottom: 8 },
  circuitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  circuitChip: {
    backgroundColor: '#edf2f7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 2, borderColor: '#edf2f7',
  },
  circuitChipActive: { backgroundColor: '#bee3f8', borderColor: '#2b6cb0' },
  circuitChipText: { fontSize: 13, color: '#4a5568' },
  circuitChipTextActive: { color: '#2b6cb0', fontWeight: '600' },
});
