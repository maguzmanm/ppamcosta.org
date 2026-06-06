import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, useWindowDimensions,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { Availability, TimeSlot } from '../types';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { mode, setMode, colors } = useTheme();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try {
      // Cargar franjas y disponibilidad por separado (si una falla, la otra no se pierde)
      const slotsRes = await api.get('/timeslots');
      setTimeSlots(slotsRes.data);
    } catch (err) {
      console.error('Error cargando horarios:', err);
    }
    try {
      const availRes = await api.get(`/publishers/${user?.publisherId}/availability`);
      setAvailabilities(availRes.data);
    } catch (err) {
      console.error('Error cargando disponibilidad:', err);
    }
    setLoading(false);
  }, [user?.publisherId]);

  useEffect(() => { fetch(); }, [fetch]);

  const { width } = useWindowDimensions();
  const isLandscape = width > 600;
  const dayBtnSize = isLandscape ? 48 : 40;
  const dayBtnFont = isLandscape ? 15 : 13;

  const isAvailable = (day: number, slotId: string) =>
    availabilities.some((a) => a.dayOfWeek === day && a.timeSlotId === slotId);

  const toggleAvailability = (day: number, slotId: string) => {
    setAvailabilities((prev) => {
      const exists = prev.find((a) => a.dayOfWeek === day && a.timeSlotId === slotId);
      if (exists) return prev.filter((a) => !(a.dayOfWeek === day && a.timeSlotId === slotId));
      return [...prev, { id: '', publisherId: user?.publisherId || '', dayOfWeek: day, timeSlotId: slotId, timeSlot: timeSlots.find((s) => s.id === slotId)! }];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = availabilities.map((a) => ({ dayOfWeek: a.dayOfWeek, timeSlotId: a.timeSlotId }));
      await api.put(`/publishers/${user?.publisherId}/availability`, { availabilities: payload });
      Alert.alert('✅', 'Disponibilidad actualizada');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 60 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.publisherName}</Text>
        <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
        <Text style={{ color: colors.textMuted, marginTop: 4 }}>{user?.role?.replace(/_/g, ' ')}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Apariencia</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        {(['light', 'dark', 'system'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: mode === m ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: mode === m ? '#fff' : colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
              {m === 'light' ? '☀️ Claro' : m === 'dark' ? '🌙 Oscuro' : '🖥 Sistema'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Mi Disponibilidad</Text>
      <Text style={styles.hint}>Selecciona los días y horarios en que puedes predicar</Text>

      {timeSlots.map((slot) => (
        <View key={slot.id} style={styles.slotBlock}>
          <Text style={styles.slotName}>{slot.name}</Text>
          <View style={styles.dayRow}>
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <TouchableOpacity
                key={day}
                style={[styles.dayBtn, isAvailable(day, slot.id) && styles.dayBtnActive, { width: dayBtnSize, height: dayBtnSize, borderRadius: dayBtnSize / 4 }]}
                onPress={() => toggleAvailability(day, slot.id)}
              >
                <Text style={[styles.dayText, isAvailable(day, slot.id) && styles.dayTextActive, { fontSize: dayBtnFont }]}>
                  {DAY_NAMES[day]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>💾 Guardar disponibilidad</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  profileCard: {
    backgroundColor: '#1a365d', borderRadius: 16, padding: 24, marginBottom: 20, alignItems: 'center',
  },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  profileEmail: { fontSize: 14, color: '#bee3f8', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2d3748', marginBottom: 6 },
  hint: { fontSize: 13, color: '#a0aec0', marginBottom: 16 },
  slotBlock: { marginBottom: 16 },
  slotName: { fontSize: 15, fontWeight: '600', color: '#4a5568', marginBottom: 8 },
  dayRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dayBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 2, borderColor: '#e2e8f0',
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  dayBtnActive: { backgroundColor: '#2b6cb0', borderColor: '#2b6cb0' },
  dayText: { fontSize: 13, color: '#718096', fontWeight: '500' },
  dayTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#38a169', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
