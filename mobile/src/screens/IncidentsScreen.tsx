import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Incident {
  id: string;
  title: string;
  description: string;
  status: string;
  response?: string;
  reportedBy: { publisher: { firstName: string; lastName: string } };
  respondedBy?: { publisher: { firstName: string; lastName: string } };
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  ABIERTO: '🔴 Abierto',
  RESPONDIDO: '🟡 Respondido',
  CERRADO: '🟢 Cerrado',
};
const STATUS_COLORS: Record<string, string> = {
  ABIERTO: '#e53e3e',
  RESPONDIDO: '#d69e2e',
  CERRADO: '#38a169',
};

export default function IncidentsScreen() {
  const { role } = useAuth();
  const isAdmin = role === 'COORDINADOR' || role === 'AUXILIAR';
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [respondModal, setRespondModal] = useState(false);
  const [selIncident, setSelIncident] = useState<Incident | null>(null);
  const [response, setResponse] = useState('');

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get('/incidents');
      setIncidents(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const handleCreate = async () => {
    if (!title || !desc) { Alert.alert('Error', 'Completa todos los campos'); return; }
    try {
      await api.post('/incidents', { title, description: desc });
      setTitle(''); setDesc(''); setShowForm(false);
      fetch();
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error || 'Error');
    }
  };

  const openRespond = (incident: Incident) => {
    setSelIncident(incident);
    setResponse(incident.response || '');
    setRespondModal(true);
  };

  const handleRespond = async (status: string) => {
    if (!selIncident || !response) { Alert.alert('Error', 'Escribe una respuesta'); return; }
    try {
      await api.put(`/incidents/${selIncident.id}/respond`, { response, status });
      setRespondModal(false);
      fetch();
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error || 'Error');
    }
  };

  const renderItem = ({ item }: { item: Incident }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: STATUS_COLORS[item.status] }]}
      onPress={() => role === 'COORDINADOR' && openRespond(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
          <Text style={styles.badgeText}>{STATUS_LABELS[item.status]}</Text>
        </View>
      </View>
      <Text style={styles.desc} numberOfLines={3}>{item.description}</Text>
      <Text style={styles.meta}>
        ✍️ {item.reportedBy?.publisher?.firstName} · {new Date(item.createdAt).toLocaleDateString('es-CL')}
      </Text>
      {item.response && (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>Respuesta:</Text>
          <Text style={styles.responseText}>{item.response}</Text>
        </View>
      )}
      {role === 'COORDINADOR' && item.status !== 'CERRADO' && (
        <Text style={styles.respondHint}>Toca para responder ✏️</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.newBtn} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.newBtnText}>{showForm ? 'Cancelar' : '+ Reportar incidente'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Título" placeholderTextColor="#a0aec0" value={title} onChangeText={setTitle} />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Describe el incidente..." placeholderTextColor="#a0aec0" value={desc} onChangeText={setDesc} multiline numberOfLines={4} />
          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
            <Text style={styles.submitText}>Enviar reporte</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>No hay incidentes</Text>}
        />
      )}

      {/* Modal responder */}
      <Modal visible={respondModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Responder incidente</Text>
            <Text style={styles.modalSub}>{selIncident?.title}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Escribe la respuesta..."
              placeholderTextColor="#a0aec0"
              value={response}
              onChangeText={setResponse}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.respBtn} onPress={() => handleRespond('RESPONDIDO')}>
                <Text style={styles.respBtnText}>💬 Responder</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => handleRespond('CERRADO')}>
                <Text style={styles.closeBtnText}>✅ Cerrar</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setRespondModal(false)}>
              <Text style={styles.cancelResp}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc', padding: 16 },
  newBtn: { backgroundColor: '#e53e3e', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  newBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  input: { backgroundColor: '#f7fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, color: '#2d3748', marginBottom: 10 },
  textArea: { height: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#e53e3e', borderRadius: 10, padding: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#2d3748', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  desc: { fontSize: 14, color: '#4a5568', lineHeight: 20, marginBottom: 6 },
  meta: { fontSize: 12, color: '#a0aec0' },
  responseBox: { backgroundColor: '#f0fff4', padding: 10, borderRadius: 8, marginTop: 8 },
  responseLabel: { fontSize: 12, fontWeight: '600', color: '#38a169' },
  responseText: { fontSize: 13, color: '#2d3748', marginTop: 2 },
  respondHint: { fontSize: 11, color: '#2b6cb0', textAlign: 'right', marginTop: 8 },
  empty: { textAlign: 'center', color: '#a0aec0', marginTop: 40, fontSize: 16 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3748', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  respBtn: { flex: 1, backgroundColor: '#d69e2e', borderRadius: 10, padding: 14, alignItems: 'center' },
  respBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  closeBtn: { flex: 1, backgroundColor: '#38a169', borderRadius: 10, padding: 14, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelResp: { textAlign: 'center', color: '#a0aec0', marginTop: 12, fontSize: 16 },
});
