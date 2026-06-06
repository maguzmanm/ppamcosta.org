import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLES = ['COORDINADOR', 'AUXILIAR', 'ENCARGADO_PUNTO', 'AUXILIAR_PUNTO', 'ENCARGADO_EXPERIENCIAS', 'PUBLICADOR'];
const ROLE_LABELS: Record<string, string> = {
  COORDINADOR: 'Coordinador',
  AUXILIAR: 'Auxiliar',
  ENCARGADO_PUNTO: 'Encargado de Punto',
  AUXILIAR_PUNTO: 'Auxiliar de Punto',
  ENCARGADO_EXPERIENCIAS: 'Encargado de Experiencias',
  PUBLICADOR: 'Publicador',
};
const ROLE_COLORS: Record<string, string> = {
  COORDINADOR: '#1a365d',
  AUXILIAR: '#2b6cb0',
  ENCARGADO_PUNTO: '#38a169',
  AUXILIAR_PUNTO: '#38a169',
  ENCARGADO_EXPERIENCIAS: '#805ad5',
  PUBLICADOR: '#718096',
};

interface UserItem {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  publisher: { id: string; firstName: string; lastName: string; congregation?: { name: string } };
}

export default function UsersScreen() {
  const { isCoordinator } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const fetch = useCallback(async () => {
    try {
      const { data: userData } = await api.get('/auth/users');
      setUsers(userData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const s = search.toLowerCase();
    return users.filter(u =>
      u.publisher.firstName.toLowerCase().includes(s) ||
      u.publisher.lastName.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s)
    );
  }, [users, search]);

  const openRolePicker = (user: UserItem) => {
    if (!isCoordinator) return;
    setSelectedUser(user);
    setRoleModalVisible(true);
  };

  const changeRole = async (role: string) => {
    if (!selectedUser) return;
    try {
      await api.put(`/auth/users/${selectedUser.id}/role`, { role });
      setRoleModalVisible(false);
      fetch();
    } catch (err: unknown) {
      Alert.alert('Error', (err as any)?.response?.data?.error || 'No se pudo cambiar');
    }
  };

  const renderItem = ({ item }: { item: UserItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => openRolePicker(item)}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.name}>{item.publisher.firstName} {item.publisher.lastName}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[item.role] || '#718096' }]}>
          <Text style={styles.roleText}>{ROLE_LABELS[item.role]}</Text>
        </View>
      </View>
      {item.publisher.congregation && (
        <Text style={styles.cong}>🏛 {item.publisher.congregation.name}</Text>
      )}
      {isCoordinator && <Text style={styles.hint}>Toca para cambiar rol ✏️</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar usuario..."
          placeholderTextColor="#a0aec0"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>No hay usuarios</Text>}
        />
      )}

      {/* Modal selector de rol */}
      <Modal visible={roleModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRoleModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Cambiar rol de{'\n'}{selectedUser?.publisher.firstName} {selectedUser?.publisher.lastName}
            </Text>
            <Text style={styles.modalSub}>
              Rol actual: {selectedUser ? ROLE_LABELS[selectedUser.role] : ''}
            </Text>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleOption, selectedUser?.role === role && styles.roleOptionActive]}
                onPress={() => changeRole(role)}
              >
                <View style={[styles.roleDot, { backgroundColor: ROLE_COLORS[role] }]} />
                <Text style={[styles.roleOptionText, selectedUser?.role === role && styles.roleOptionTextActive]}>
                  {ROLE_LABELS[role]}
                </Text>
                {selectedUser?.role === role && <Text style={styles.currentTag}>Actual</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setRoleModalVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc', padding: 16 },
  topRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchInput: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#e2e8f0', color: '#2d3748',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '600', color: '#2d3748' },
  email: { fontSize: 13, color: '#a0aec0', marginTop: 2 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  roleText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  cong: { fontSize: 14, color: '#718096', marginTop: 8 },
  hint: { fontSize: 11, color: '#a0aec0', textAlign: 'right', marginTop: 8 },
  empty: { textAlign: 'center', color: '#a0aec0', marginTop: 40, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3748', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#a0aec0', textAlign: 'center', marginBottom: 16 },
  roleOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, marginBottom: 6,
    backgroundColor: '#f7fafc',
  },
  roleOptionActive: { backgroundColor: '#ebf8ff', borderWidth: 2, borderColor: '#2b6cb0' },
  roleDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  roleOptionText: { fontSize: 16, color: '#4a5568', flex: 1 },
  roleOptionTextActive: { fontWeight: '600', color: '#2b6cb0' },
  currentTag: { fontSize: 12, color: '#a0aec0', fontStyle: 'italic' },
  cancelBtn: { marginTop: 12, padding: 14, alignItems: 'center' },
  cancelText: { fontSize: 16, color: '#a0aec0' },
});
