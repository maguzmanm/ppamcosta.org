import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import FormModal from '../components/FormModal';
import type { Location } from '../types';

interface UserBrief {
  id: string;
  email: string;
  role: string;
  publisher: { id: string; firstName: string; lastName: string; marriedLastName?: string };
}

const formatName = (p: { firstName: string; lastName: string; marriedLastName?: string }) =>
  p.marriedLastName ? `${p.firstName} de ${p.marriedLastName}` : `${p.firstName} ${p.lastName}`;

const ELIGIBLE_ROLES = ['ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'COORDINADOR', 'AUXILIAR'];

export default function LocationsScreen() {
  const { isCoordinator } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [encargadoModal, setEncargadoModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [editing, setEditing] = useState<Location | null>(null);
  const [mapLocation, setMapLocation] = useState<Location | null>(null);

  const fetch = useCallback(async () => {
    try {
      const locRes = await api.get('/locations');
      setLocations(locRes.data.filter((l: Location) => l.isActive));
      // Solo coordinador puede ver usuarios para asignar encargados
      if (isCoordinator) {
        try {
          const userRes = await api.get('/auth/users');
          setUsers(userRes.data);
        } catch { /* sin permisos, no se muestran usuarios */ }
      }
    } catch (err) {
      console.error('Error cargando puntos:', err);
    } finally {
      setLoading(false);
    }
  }, [isCoordinator]);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const handleSave = async (formData: Record<string, string>) => {
    try {
      if (editing) {
        await api.put(`/locations/${editing.id}`, formData);
      } else {
        await api.post('/locations', formData);
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
    Alert.alert('Eliminar', `¿Desactivar ${editing.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await api.delete(`/locations/${editing.id}`);
        setModalVisible(false); setEditing(null); fetch();
      }},
    ]);
  };

  const openEncargados = (location: Location) => {
    setSelectedLocation(location);
    setEncargadoModal(true);
  };

  const assignToLocation = async (userId: string, roleAtLocation: string) => {
    if (!selectedLocation) return;
    try {
      await api.post(`/locations/${selectedLocation.id}/assign`, { userId, roleAtLocation });
      fetch();
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error || 'No se pudo asignar');
    }
  };

  const removeFromLocation = async (userId: string) => {
    if (!selectedLocation) return;
    try {
      await api.delete(`/locations/${selectedLocation.id}/assign/${userId}`);
      fetch();
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error || 'No se pudo quitar');
    }
  };

  const isAssigned = (userId: string) =>
    selectedLocation?.locationAssignments?.some(a => a.userId === userId);

  const getAssignedRole = (userId: string) =>
    selectedLocation?.locationAssignments?.find(a => a.userId === userId)?.roleAtLocation;

  const renderItem = ({ item }: { item: Location }) => (
    <TouchableOpacity style={styles.card} onPress={() => isCoordinator && (setEditing(item), setModalVisible(true))}>
      <Text style={styles.name}>📍 {item.name}</Text>
      <Text style={styles.address}>{item.address}</Text>
      {(item.latitude || item.longitude) && (
        <View style={styles.coordsRow}>
          <Text style={styles.coords}>🌐 {item.latitude?.toFixed(6)}, {item.longitude?.toFixed(6)}</Text>
          <TouchableOpacity style={styles.mapBtn} onPress={() => setMapLocation(item)}>
            <Text style={styles.mapBtnText}>🗺 Ver mapa</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
      {item.locationAssignments && item.locationAssignments.length > 0 && (
        <View style={styles.encargados}>
          <Text style={styles.encargadosTitle}>Encargados:</Text>
          {item.locationAssignments.map((a) => (
            <Text key={a.id} style={styles.encargadoName}>
              👤 {formatName(a.user?.publisher || { firstName: '', lastName: '' })}
              {' '}({a.roleAtLocation === 'ENCARGADO_PUNTO' ? 'Encargado' : 'Auxiliar'})
            </Text>
          ))}
        </View>
      )}
      {isCoordinator && (
        <View style={styles.manageRow}>
          <TouchableOpacity style={styles.manageBtn} onPress={() => openEncargados(item)}>
            <Text style={styles.manageBtnText}>👤 Gestionar encargados</Text>
          </TouchableOpacity>
          <Text style={styles.editHint}>Toca para editar ✏️</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isCoordinator && (
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditing(null); setModalVisible(true); }}>
          <Text style={styles.addBtnText}>+ Nuevo punto</Text>
        </TouchableOpacity>
      )}
      {loading ? (
        <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
      <FormModal
        visible={modalVisible}
        title={editing ? 'Editar Punto' : 'Nuevo Punto'}
        fields={[
          { key: 'name', label: 'Nombre', value: editing?.name || '' },
          { key: 'address', label: 'Dirección', value: editing?.address || '' },
          { key: 'latitude', label: 'Latitud', value: editing?.latitude?.toString() || '', keyboardType: 'numeric' as const },
          { key: 'longitude', label: 'Longitud', value: editing?.longitude?.toString() || '', keyboardType: 'numeric' as const },
          { key: 'notes', label: 'Notas', value: editing?.notes || '' },
        ]}
        onSave={handleSave}
        onCancel={() => { setModalVisible(false); setEditing(null); }}
        onDelete={editing ? handleDelete : undefined}
      />

      {/* Modal mapa */}
      <Modal visible={!!mapLocation} transparent animationType="fade">
        <View style={styles.mapOverlay}>
          <View style={styles.mapContent}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>📍 {mapLocation?.name}</Text>
              <TouchableOpacity onPress={() => setMapLocation(null)}>
                <Text style={styles.mapClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {mapLocation?.latitude && mapLocation?.longitude ? (
              <MapView
                style={styles.mapView}
                initialRegion={{
                  latitude: mapLocation.latitude,
                  longitude: mapLocation.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
              >
                <Marker
                  coordinate={{ latitude: mapLocation.latitude, longitude: mapLocation.longitude }}
                  title={mapLocation.name}
                  description={mapLocation.address}
                />
              </MapView>
            ) : (
              <Text style={styles.mapNoCoords}>Sin coordenadas para mostrar</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal gestionar encargados */}
      <Modal visible={encargadoModal} transparent animationType="slide">
        <View style={styles.encOverlay}>
          <View style={styles.encContent}>
            <Text style={styles.encTitle}>👤 {selectedLocation?.name}</Text>
            <Text style={styles.encSub}>Gestionar encargados y auxiliares</Text>

            <Text style={styles.encSection}>📋 Asignados actualmente:</Text>
            {selectedLocation?.locationAssignments?.length === 0 && (
              <Text style={styles.encEmpty}>Sin encargados asignados</Text>
            )}
            {selectedLocation?.locationAssignments?.map((a) => (
              <View key={a.id} style={styles.encItem}>
                <Text style={styles.encName}>
                  👤 {formatName(a.user?.publisher || { firstName: '', lastName: '' })}
                  <Text style={styles.encRole}> ({a.roleAtLocation === 'ENCARGADO_PUNTO' ? 'Encargado' : 'Auxiliar'})</Text>
                </Text>
                <TouchableOpacity onPress={() => removeFromLocation(a.userId)}>
                  <Text style={styles.encRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.encSection}>➕ Asignar usuario:</Text>
            {users
              .filter(u => !isAssigned(u.id))
              .slice(0, 10)
              .map((u) => (
                <View key={u.id} style={styles.encItem}>
                  <Text style={styles.encName}>
                    {formatName(u.publisher)}
                  </Text>
                  <View style={styles.encActions}>
                    <TouchableOpacity style={styles.encAssignBtn} onPress={() => assignToLocation(u.id, 'ENCARGADO_PUNTO')}>
                      <Text style={styles.encAssignText}>Encargado</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.encAuxBtn} onPress={() => assignToLocation(u.id, 'AUXILIAR_PUNTO')}>
                      <Text style={styles.encAuxText}>Auxiliar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

            <TouchableOpacity style={styles.encCloseBtn} onPress={() => setEncargadoModal(false)}>
              <Text style={styles.encCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  name: { fontSize: 17, fontWeight: '600', color: '#2d3748', marginBottom: 4 },
  address: { fontSize: 14, color: '#718096', marginBottom: 4 },
  coords: { fontSize: 13, color: '#a0aec0', marginBottom: 4 },
  notes: { fontSize: 13, color: '#a0aec0', fontStyle: 'italic', marginTop: 4 },
  encargados: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  encargadosTitle: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginBottom: 4 },
  encargadoName: { fontSize: 13, color: '#718096', marginLeft: 4 },
  editHint: { fontSize: 11, color: '#a0aec0', textAlign: 'right', marginTop: 8 },
  manageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  manageBtn: { backgroundColor: '#ebf8ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  manageBtnText: { fontSize: 13, color: '#2b6cb0', fontWeight: '500' },
  // Modal encargados
  encOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  encContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  encTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3748', textAlign: 'center', marginBottom: 2 },
  encSub: { fontSize: 13, color: '#a0aec0', textAlign: 'center', marginBottom: 16 },
  encSection: { fontSize: 14, fontWeight: '600', color: '#4a5568', marginTop: 12, marginBottom: 8 },
  encEmpty: { fontSize: 13, color: '#a0aec0', fontStyle: 'italic', textAlign: 'center', padding: 10 },
  encItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  encName: { fontSize: 14, color: '#2d3748', flex: 1 },
  encRole: { fontSize: 12, color: '#718096' },
  encRemove: { fontSize: 18, color: '#e53e3e', paddingHorizontal: 10 },
  encActions: { flexDirection: 'row', gap: 6 },
  encAssignBtn: { backgroundColor: '#c6f6d5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  encAssignText: { fontSize: 12, color: '#22543d', fontWeight: '600' },
  encAuxBtn: { backgroundColor: '#bee3f8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  encAuxText: { fontSize: 12, color: '#2b6cb0', fontWeight: '600' },
  encCloseBtn: { marginTop: 16, padding: 14, alignItems: 'center' },
  encCloseText: { fontSize: 16, color: '#a0aec0' },
  // Mapa
  coordsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mapBtn: { backgroundColor: '#ebf8ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  mapBtnText: { fontSize: 12, color: '#2b6cb0', fontWeight: '500' },
  mapOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  mapContent: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', height: 400 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  mapTitle: { fontSize: 16, fontWeight: '600', color: '#2d3748', flex: 1 },
  mapClose: { fontSize: 22, color: '#a0aec0', paddingHorizontal: 8 },
  mapView: { flex: 1 },
  mapNoCoords: { textAlign: 'center', color: '#a0aec0', padding: 40, fontSize: 14 },
});
