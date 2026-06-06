import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import type { Notification as NotifType, NotificationPreferences } from '../types';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotifType[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreferences>({ pushEnabled: true, emailEnabled: true });
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const [notifRes, prefsRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/notifications/preferences'),
        ]);
        setNotifications(notifRes.data);
        setPrefs(prefsRes.data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []));

  const togglePref = async (key: 'pushEnabled' | 'emailEnabled') => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await api.put('/notifications/preferences', updated);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const TYPE_ICONS: Record<string, string> = {
    turno_asignado: '📋',
    recordatorio: '⏰',
    turno_respuesta: '↩️',
    experiencia_pendiente: '📝',
    anuncio: '📢',
    cambio_turno: '🔄',
  };

  const renderItem = ({ item }: { item: NotifType }) => (
    <TouchableOpacity style={[styles.notifCard, !item.readAt && styles.unread]}>
      <Text style={styles.notifIcon}>{TYPE_ICONS[item.type] || '🔔'}</Text>
      <View style={styles.notifContent}>
        <Text style={styles.notifTitle}>{item.title}</Text>
        <Text style={styles.notifBody}>{item.body}</Text>
        <Text style={styles.notifDate}>
          {new Date(item.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.prefsCard}>
        <Text style={styles.prefsTitle}>⚙️ Preferencias</Text>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Notificaciones push</Text>
          <Switch value={prefs.pushEnabled} onValueChange={() => togglePref('pushEnabled')} trackColor={{ false: '#cbd5e0', true: '#bee3f8' }} thumbColor={prefs.pushEnabled ? '#2b6cb0' : '#f4f3f4'} />
        </View>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Notificaciones por email</Text>
          <Switch value={prefs.emailEnabled} onValueChange={() => togglePref('emailEnabled')} trackColor={{ false: '#cbd5e0', true: '#bee3f8' }} thumbColor={prefs.emailEnabled ? '#2b6cb0' : '#f4f3f4'} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Historial</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2b6cb0" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>No tienes notificaciones</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc', padding: 16 },
  prefsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  prefsTitle: { fontSize: 16, fontWeight: '600', color: '#2d3748', marginBottom: 12 },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  prefLabel: { fontSize: 15, color: '#4a5568' },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#2d3748', marginBottom: 10 },
  notifCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  unread: { borderLeftWidth: 4, borderLeftColor: '#2b6cb0' },
  notifIcon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: '600', color: '#2d3748' },
  notifBody: { fontSize: 13, color: '#718096', marginTop: 2 },
  notifDate: { fontSize: 11, color: '#a0aec0', marginTop: 4 },
  empty: { textAlign: 'center', color: '#a0aec0', marginTop: 40, fontSize: 16 },
});
