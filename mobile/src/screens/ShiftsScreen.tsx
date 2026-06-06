import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { ShiftAssignment, Location, TimeSlot, Publisher, Shift } from '../types';

const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: '#d69e2e',
  ACEPTADO: '#38a169',
  RECHAZADO: '#e53e3e',
  CANCELADO: '#a0aec0',
};

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADO: 'Aceptado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ShiftsScreen() {
  const { user, canCreateShifts, canViewShifts } = useAuth();
  const publisherId = user?.publisherId || '';
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // ─── Crear turno ───
  const [step, setStep] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availablePublishers, setAvailablePublishers] = useState<Publisher[]>([]);
  const [selLocation, setSelLocation] = useState<Location | null>(null);
  const [selDate, setSelDate] = useState('');
  const [selSlot, setSelSlot] = useState<TimeSlot | null>(null);
  const [selPublishers, setSelPublishers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editPublishers, setEditPublishers] = useState<Publisher[]>([]);

  const fetchAssignments = useCallback(async () => {
    try {
      const { data } = await api.get('/shifts/my');
      setAssignments(data);
    } catch (err) {
      console.error('Error cargando turnos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAssignments(); if (canViewShifts) fetchAllShifts(); }, [fetchAssignments, canViewShifts]));

  const fetchAllShifts = async () => {
    try {
      const { data } = await api.get('/shifts');
      setAllShifts(data);
    } catch (err) { /* ignore */ }
  };

  const handleRespond = async (shiftId: string, response: 'ACEPTADO' | 'RECHAZADO') => {
    try {
      await api.post(`/shifts/${shiftId}/respond`, { response });
      fetchAssignments();
    } catch (err) {
      console.error('Error respondiendo:', err);
    }
  };

  // ─── Flujo crear turno ───
  const startCreate = async () => {
    setShowCreate(true);
    setStep(0);
    setSelPublishers([]);
    try {
      const [locRes, slotRes] = await Promise.all([
        api.get('/locations/my'),
        api.get('/timeslots'),
      ]);
      setLocations(locRes.data);
      setTimeSlots(slotRes.data);
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    }
  };

  const selectLocation = (loc: Location) => {
    setSelLocation(loc);
    setStep(1);
  };

  // Generar próximos 7 días
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { label: `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`, value: d.toISOString().split('T')[0] };
  });

  const selectDate = async (date: string) => {
    setSelDate(date);
    setStep(2);
  };

  const selectSlot = async (slot: TimeSlot) => {
    setSelSlot(slot);
    setStep(3);
    try {
      const { data } = await api.get('/publishers/available-for-shift', {
        params: { date: selDate, timeSlotId: slot.id },
      });
      setAvailablePublishers(data);
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar los publicadores');
    }
  };

  const togglePublisher = (id: string) => {
    setSelPublishers(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const handleCancelShift = (shift: Shift) => {
    Alert.alert('Cancelar turno', `¿Cancelar el turno en ${shift.location?.name}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: async () => {
        await api.put(`/shifts/${shift.id}`, { status: 'CANCELADO' });
        fetchAllShifts(); fetchAssignments();
      }},
    ]);
  };

  const handleRemovePublisher = async (shiftId: string, pubId: string) => {
    await api.delete(`/shifts/${shiftId}/publishers/${pubId}`);
    fetchAllShifts(); fetchAssignments();
  };

  const openEdit = async (shift: Shift) => {
    setEditingShift(shift);
    setEditModal(true);
    try {
      const shiftDate = new Date(shift.date);
      const dayOfWeek = shiftDate.getUTCDay();
      const { data } = await api.get('/publishers/available-for-shift', {
        params: { date: shift.date.toString().split('T')[0], timeSlotId: shift.timeSlotId },
      });
      setEditPublishers(data);
    } catch (err) { /* ignore */ }
  };

  const addPublisherToShift = async (pubId: string) => {
    if (!editingShift) return;
    try {
      await api.post(`/shifts/${editingShift.id}/publishers`, { publisherId: pubId });
      fetchAllShifts(); fetchAssignments();
      // Refresh edit publishers list
      setEditPublishers(prev => prev.filter(p => p.id !== pubId));
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error || 'No se pudo agregar');
    }
  };

  const handleCreateShift = async () => {
    if (!selLocation || !selDate || !selSlot || selPublishers.length === 0) {
      Alert.alert('Error', 'Completa todos los pasos');
      return;
    }
    setCreating(true);
    try {
      await api.post('/shifts', {
        locationId: selLocation.id,
        date: selDate,
        timeSlotId: selSlot.id,
        maxPublishers: 2,
        publisherIds: selPublishers,
      });
      Alert.alert('✅', 'Turno creado exitosamente');
      setShowCreate(false);
      fetchAssignments();
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error || 'Error al crear turno');
    } finally {
      setCreating(false);
    }
  };

  const renderAssignment = ({ item }: { item: ShiftAssignment }) => {
    const shift = item.shift;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.location}>📍 {shift?.location?.name || 'Punto'}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
            <Text style={styles.badgeText}>{STATUS_LABELS[item.status]}</Text>
          </View>
        </View>
        {shift && (
          <>
            <Text style={styles.date}>
              📅 {new Date(shift.date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={styles.time}>🕐 {shift.timeSlot?.name}</Text>
            {shift.location?.address && <Text style={styles.address}>{shift.location.address}</Text>}
          </>
        )}
        {item.status === 'PENDIENTE' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleRespond(item.shiftId, 'ACEPTADO')}>
              <Text style={styles.acceptText}>✅ Aceptar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRespond(item.shiftId, 'RECHAZADO')}>
              <Text style={styles.rejectText}>❌ Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {canCreateShifts && (
          <TouchableOpacity style={styles.createBtn} onPress={startCreate}>
            <Text style={styles.createBtnText}>+ Crear turno</Text>
          </TouchableOpacity>
        )}
        {canViewShifts && (
          <TouchableOpacity style={[styles.toggleBtn, viewAll && styles.toggleBtnActive]} onPress={() => setViewAll(!viewAll)}>
            <Text style={[styles.toggleText, viewAll && styles.toggleTextActive]}>
              {viewAll ? 'Mis turnos' : 'Todos'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 40 }} />
      ) : viewAll && canViewShifts ? (
        allShifts.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No hay turnos</Text></View>
        ) : (
          <FlatList
            data={allShifts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, item.status === 'CANCELADO' && styles.cardCancelled]}
                onPress={() => item.status !== 'CANCELADO' && openEdit(item)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.location}>📍 {item.location?.name}</Text>
                  <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                    <Text style={styles.badgeText}>{STATUS_LABELS[item.status]}</Text>
                  </View>
                </View>
                <Text style={styles.date}>📅 {new Date(item.date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                <Text style={styles.time}>🕐 {item.timeSlot?.name}</Text>
                <Text style={styles.pubCount}>👥 {item.assignments?.length || 0}/{item.maxPublishers} publicadores</Text>
                {item.assignments?.map(a => (
                  <View key={a.id} style={styles.pubRow}>
                    <Text style={styles.pubNameAssign}>  {a.publisher.firstName} {a.publisher.lastName}</Text>
                    <Text style={[styles.pubStatus, { color: STATUS_COLORS[a.status] }]}>{STATUS_LABELS[a.status]}</Text>
                    {item.status !== 'CANCELADO' && (
                      <TouchableOpacity onPress={() => handleRemovePublisher(item.id, a.publisherId)}>
                        <Text style={styles.removePub}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {item.status !== 'CANCELADO' && (
                  <TouchableOpacity style={styles.cancelShiftBtn} onPress={() => handleCancelShift(item)}>
                    <Text style={styles.cancelShiftText}>Cancelar turno</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )
      ) : (
        assignments.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No tienes turnos asignados</Text></View>
        ) : (
          <FlatList
            data={assignments}
            keyExtractor={(item) => item.id}
            renderItem={renderAssignment}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )
      )}

      {/* Modal crear turno */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Crear Turno</Text>

            {step === 0 && (
              <>
                <Text style={styles.stepLabel}>1. Selecciona el punto:</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {locations.map(loc => (
                    <TouchableOpacity key={loc.id} style={styles.option} onPress={() => selectLocation(loc)}>
                      <Text style={styles.optionText}>📍 {loc.name}</Text>
                      <Text style={styles.optionSub}>{loc.address}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {step === 1 && (
              <>
                <Text style={styles.stepLabel}>📍 {selLocation?.name}</Text>
                <Text style={styles.stepLabel}>2. Selecciona la fecha:</Text>
                {nextDays.map(d => (
                  <TouchableOpacity key={d.value} style={styles.option} onPress={() => selectDate(d.value)}>
                    <Text style={styles.optionText}>📅 {d.label}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.stepLabel}>📍 {selLocation?.name} · 📅 {selDate}</Text>
                <Text style={styles.stepLabel}>3. Selecciona el horario:</Text>
                {timeSlots.map(slot => (
                  <TouchableOpacity key={slot.id} style={styles.option} onPress={() => selectSlot(slot)}>
                    <Text style={styles.optionText}>🕐 {slot.name}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {step === 3 && (
              <>
                <Text style={styles.stepLabel}>
                  📍 {selLocation?.name} · 📅 {selDate} · 🕐 {selSlot?.name}
                </Text>
                <Text style={styles.stepLabel}>4. Publicadores disponibles ({selPublishers.length}/2):</Text>
                <Text style={styles.priorityHint}>⭐ Ordenados: menos asignados primero</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {availablePublishers.map(pub => {
                    const isSel = selPublishers.includes(pub.id);
                    return (
                      <TouchableOpacity
                        key={pub.id}
                        style={[styles.pubOption, isSel && styles.pubOptionSel]}
                        onPress={() => togglePublisher(pub.id)}
                      >
                        <Text style={styles.pubName}>
                          {isSel ? '✅' : '⬜'} {pub.firstName} {pub.lastName}
                        </Text>
                        <Text style={styles.pubCong}>{pub.congregation?.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.finishBtn, selPublishers.length === 0 && styles.btnDisabled]}
                  onPress={handleCreateShift}
                  disabled={creating || selPublishers.length === 0}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.finishBtnText}>✅ Crear turno</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal editar turno */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Turno</Text>
            {editingShift && (
              <>
                <Text style={styles.stepLabel}>📍 {editingShift.location?.name}</Text>
                <Text style={styles.stepLabel}>📅 {new Date(editingShift.date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                <Text style={styles.stepLabel}>🕐 {editingShift.timeSlot?.name}</Text>

                <Text style={styles.sectionTitle}>Publicadores asignados:</Text>
                {editingShift.assignments?.map(a => (
                  <View key={a.id} style={styles.pubRow}>
                    <Text style={styles.pubNameAssign}>👤 {a.publisher.firstName} {a.publisher.lastName}</Text>
                    <Text style={[styles.pubStatus, { color: STATUS_COLORS[a.status] }]}>{STATUS_LABELS[a.status]}</Text>
                    <TouchableOpacity onPress={() => handleRemovePublisher(editingShift.id, a.publisherId)}>
                      <Text style={styles.removePub}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Agregar publicador:</Text>
                <ScrollView style={{ maxHeight: 200 }}>
                  {editPublishers
                    .filter(p => !editingShift.assignments?.some(a => a.publisherId === p.id))
                    .map(pub => (
                      <TouchableOpacity
                        key={pub.id}
                        style={styles.pubOption}
                        onPress={() => addPublisherToShift(pub.id)}
                      >
                        <Text style={styles.pubName}>➕ {pub.firstName} {pub.lastName}</Text>
                        <Text style={styles.pubCong}>{pub.congregation?.name}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>

                <TouchableOpacity style={styles.cancelShiftBtn} onPress={() => handleCancelShift(editingShift)}>
                  <Text style={styles.cancelShiftText}>Cancelar turno</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
              <Text style={styles.cancelText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc', padding: 16 },
  topRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  createBtn: { flex: 1, backgroundColor: '#2b6cb0', borderRadius: 10, padding: 14, alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggleBtn: { backgroundColor: '#edf2f7', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14 },
  toggleBtnActive: { backgroundColor: '#2b6cb0' },
  toggleText: { fontSize: 14, color: '#4a5568', fontWeight: '500' },
  toggleTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  location: { fontSize: 17, fontWeight: '600', color: '#2d3748' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '500', color: '#fff' },
  date: { fontSize: 14, color: '#4a5568', marginTop: 4 },
  time: { fontSize: 14, color: '#4a5568', marginTop: 2 },
  address: { fontSize: 13, color: '#a0aec0', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 12, gap: 10 },
  acceptBtn: { flex: 1, backgroundColor: '#c6f6d5', borderRadius: 8, padding: 12, alignItems: 'center' },
  acceptText: { color: '#22543d', fontWeight: '600' },
  rejectBtn: { flex: 1, backgroundColor: '#fed7d7', borderRadius: 8, padding: 12, alignItems: 'center' },
  rejectText: { color: '#742a2a', fontWeight: '600' },
  // Admin: todos los turnos
  cardCancelled: { opacity: 0.6 },
  pubCount: { fontSize: 13, color: '#718096', marginTop: 6, marginBottom: 4 },
  pubRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingLeft: 4 },
  pubNameAssign: { fontSize: 14, color: '#4a5568', flex: 1 },
  pubStatus: { fontSize: 12, marginRight: 8 },
  removePub: { fontSize: 16, color: '#e53e3e', paddingHorizontal: 8 },
  cancelShiftBtn: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', alignItems: 'center' },
  cancelShiftText: { fontSize: 14, color: '#e53e3e', fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#2d3748', marginBottom: 8 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#a0aec0' },
  // Modal crear turno
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2d3748', textAlign: 'center', marginBottom: 16 },
  stepLabel: { fontSize: 15, fontWeight: '600', color: '#4a5568', marginBottom: 8, marginTop: 4 },
  option: { backgroundColor: '#f7fafc', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  optionText: { fontSize: 16, color: '#2d3748' },
  optionSub: { fontSize: 13, color: '#a0aec0', marginTop: 2 },
  pubOption: { backgroundColor: '#f7fafc', padding: 12, borderRadius: 10, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pubOptionSel: { backgroundColor: '#c6f6d5', borderWidth: 2, borderColor: '#38a169' },
  pubName: { fontSize: 15, color: '#2d3748', flex: 1 },
  pubCong: { fontSize: 12, color: '#a0aec0' },
  priorityHint: { fontSize: 12, color: '#d69e2e', fontStyle: 'italic', marginBottom: 8 },
  finishBtn: { backgroundColor: '#38a169', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  btnDisabled: { opacity: 0.5 },
  finishBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { marginTop: 8, padding: 14, alignItems: 'center' },
  cancelText: { fontSize: 16, color: '#a0aec0' },
});
