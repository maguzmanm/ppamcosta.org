import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { ShiftAssignment } from '../types';

const formatPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 11) return `+56 9 ${digits.substring(3, 7)} ${digits.substring(7, 11)}`;
  if (digits.length >= 9) return `+56 9 ${digits.substring(1, 5)} ${digits.substring(5, 9)}`;
  return raw;
};

const ROLE_LABELS: Record<string, string> = {
  COORDINADOR: 'Coordinador',
  AUXILIAR: 'Auxiliar',
  ENCARGADO_PUNTO: 'Encargado de Punto',
  AUXILIAR_PUNTO: 'Auxiliar de Punto',
  ENCARGADO_EXPERIENCIAS: 'Encargado de Experiencias',
  PUBLICADOR: 'Publicador',
};

const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: '#d69e2e', ACEPTADO: '#38a169', RECHAZADO: '#e53e3e', CANCELADO: '#a0aec0',
};
const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente', ACEPTADO: 'Aceptado', RECHAZADO: 'Rechazado', CANCELADO: 'Cancelado',
};

export default function DashboardScreen() {
  const { user, logout, role } = useAuth();
  const { width } = useWindowDimensions();
  const isLandscape = width > 600;
  const [displayName, setDisplayName] = useState(user?.publisherName || '');
  const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [meRes, shiftRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/shifts/my'),
      ]);
      setDisplayName(`${meRes.data.publisher.firstName} ${meRes.data.publisher.lastName}`);
      setShifts(shiftRes.data);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    } finally {
      setLoadingShifts(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleRespond = async (shiftId: string, response: 'ACEPTADO' | 'RECHAZADO', locationId?: string) => {
    if (response === 'RECHAZADO' && locationId) {
      try {
        const { data: loc } = await api.get(`/locations/${locationId}`);
        const encargados = loc.locationAssignments || [];
        if (encargados.length > 0) {
          const nombres = encargados.map((a: any) =>
            `${a.user?.publisher?.firstName} ${a.user?.publisher?.lastName} (${a.roleAtLocation === 'ENCARGADO_PUNTO' ? 'Encargado' : 'Auxiliar'})`
          ).join('\n');
          Alert.alert(
            'Contacta al encargado',
            `Para cancelar un turno ya aceptado, comunícate con:\n\n${nombres}\n\nSolo el encargado o sus auxiliares pueden cancelarlo.`,
            [{ text: 'Entendido' }]
          );
          return;
        }
      } catch (e) { /* fallback */ }
    }
    // Solo permite rechazar pendientes
    try {
      await api.post(`/shifts/${shiftId}/respond`, { response });
      fetchData();
    } catch (err) {
      console.error('Error respondiendo:', err);
    }
  };

  const upcoming = shifts
    .filter(s => s.status === 'PENDIENTE' || s.status === 'ACEPTADO')
    .sort((a, b) => new Date(a.shift?.date || '').getTime() - new Date(b.shift?.date || '').getTime());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <View>
          <Text style={styles.greeting}>Hola, {displayName?.split(' ')[0] || 'Hermano'}!</Text>
          <Text style={styles.role}>{role ? ROLE_LABELS[role] : ''}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Mis proximos turnos</Text>

      {loadingShifts ? (
        <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 20 }} />
      ) : upcoming.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No tienes turnos pendientes</Text>
          <Text style={styles.emptySub}>Tus turnos apareceran aqui cuando te asignen</Text>
        </View>
      ) : (
        upcoming.map((item) => {
          const shift = item.shift;
          return (
            <View key={item.id} style={styles.shiftCard}>
              <View style={styles.shiftHeader}>
                <Text style={styles.shiftLoc}>📍 {shift?.location?.name || 'Punto'}</Text>
                <View style={[styles.shiftBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                  <Text style={styles.shiftBadgeText}>{STATUS_LABELS[item.status]}</Text>
                </View>
              </View>
              {shift && (
                <>
                  <Text style={styles.shiftDate}>📅 {new Date(shift.date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                  <Text style={styles.shiftTime}>🕐 {shift.timeSlot?.name}</Text>
                  {shift.location?.locationAssignments && shift.location.locationAssignments.length > 0 && (
                    <View style={styles.encSection}>
                      <Text style={styles.encTitle}>👤 Encargados del punto:</Text>
                      {shift.location.locationAssignments.map((a: any, i: number) => (
                        <View key={i} style={styles.encRow}>
                          <Text style={styles.encName}>
                            {a.user?.publisher?.firstName} {a.user?.publisher?.lastName}
                            <Text style={styles.encRole}> ({a.roleAtLocation === 'ENCARGADO_PUNTO' ? 'Encargado' : 'Auxiliar'})</Text>
                          </Text>
                          {a.user?.publisher?.phone && (
                            <Text style={styles.encPhone}>📞 {formatPhone(a.user.publisher.phone)}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
              {item.status === 'PENDIENTE' && (
                <View style={styles.shiftActions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleRespond(item.shiftId, 'ACEPTADO')}>
                    <Text style={styles.acceptText}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRespond(item.shiftId, 'RECHAZADO', shift?.location?.id)}>
                    <Text style={styles.rejectText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {item.status === 'ACEPTADO' && (
                <TouchableOpacity style={[styles.rejectBtn, { marginTop: 12 }]} onPress={() => handleRespond(item.shiftId, 'RECHAZADO', shift?.location?.id)}>
                  <Text style={styles.rejectText}>Ya no puedo asistir</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, backgroundColor: '#1a365d',
    marginHorizontal: -16, marginTop: -16, padding: 20, paddingTop: 50,
  },
  headerLandscape: { paddingTop: 24, paddingBottom: 16 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  role: { fontSize: 14, color: '#bee3f8', marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#fff', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2d3748', marginBottom: 12 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 30, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#718096', fontWeight: '500' },
  emptySub: { fontSize: 13, color: '#a0aec0', marginTop: 6 },
  shiftCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  shiftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  shiftLoc: { fontSize: 17, fontWeight: '600', color: '#2d3748' },
  shiftBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  shiftBadgeText: { fontSize: 12, fontWeight: '500', color: '#fff' },
  shiftDate: { fontSize: 14, color: '#4a5568', marginTop: 4 },
  shiftTime: { fontSize: 14, color: '#4a5568', marginTop: 2 },
  shiftActions: { flexDirection: 'row', marginTop: 12, gap: 10 },
  acceptBtn: { flex: 1, backgroundColor: '#c6f6d5', borderRadius: 8, padding: 12, alignItems: 'center' },
  acceptText: { color: '#22543d', fontWeight: '600' },
  rejectBtn: { flex: 1, backgroundColor: '#fed7d7', borderRadius: 8, padding: 12, alignItems: 'center' },
  rejectText: { color: '#742a2a', fontWeight: '600' },
  encSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  encTitle: { fontSize: 12, fontWeight: '600', color: '#718096', marginBottom: 6 },
  encRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  encName: { fontSize: 13, color: '#4a5568' },
  encRole: { fontSize: 11, color: '#a0aec0' },
  encPhone: { fontSize: 13, color: '#2b6cb0' },
});
