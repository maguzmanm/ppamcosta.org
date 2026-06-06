import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import FormModal from '../components/FormModal';
import type { Publisher, Congregation } from '../types';

// Formatear teléfono chileno: +56 9 XXXX XXXX
const formatPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Si empieza con 56, lo tomamos como base; si no, asumimos que es el número local
  let num = digits;
  if (digits.startsWith('56') && digits.length >= 11) {
    num = digits; // +56 9 XXXX XXXX = 11 dígitos
  } else if (digits.length === 9) {
    num = '56' + digits; // 9 digitos locales → agregar 56
  } else if (digits.length === 8) {
    num = '569' + digits; // 8 digitos locales → agregar 569
  }
  // Formatear: +56 9 XXXX XXXX
  if (num.length >= 11) {
    return `+56 9 ${num.substring(3, 7)} ${num.substring(7, 11)}`;
  }
  // Fallback: mostrar tal cual
  return raw;
};

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

export default function PublishersScreen() {
  const { isCoordinator } = useAuth();
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Publisher | null>(null);

  const fetch = useCallback(async () => {
    try {
      const pubRes = await api.get('/publishers', { params: { search: search || undefined } });
      setPublishers(pubRes.data);
      // Solo coordinador necesita la lista de congregaciones (para crear/editar)
      if (isCoordinator) {
        try {
          const congRes = await api.get('/congregations');
          setCongregations(congRes.data);
        } catch { /* sin permisos */ }
      }
    } catch (err: any) {
      console.error('Error:', err?.message || err);
    } finally {
      setLoading(false);
    }
  }, [search, isCoordinator]);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const handleSave = async (formData: Record<string, string>) => {
    try {
      const payload: Record<string, string> = { ...formData, congregationId: selectedCongId, designations: JSON.stringify(selectedDesignations), gender: selectedGender, role: selectedRole };
      // Limpiar teléfono: guardar solo dígitos
      if (payload.phone) payload.phone = payload.phone.replace(/\D/g, '');
      // En edición, no enviar contraseña vacía
      if (editing && !payload.password) delete payload.password;
      if (editing) {
        await api.put(`/publishers/${editing.id}`, payload);
      } else {
        await api.post('/publishers', payload);
      }
      setModalVisible(false);
      setEditing(null);
      fetch();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || 'Error al guardar';
      Alert.alert('Error', msg);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    const action = editing.isActive ? 'desactivar' : 'activar';
    Alert.alert(
      editing.isActive ? 'Desactivar' : 'Activar',
      `¿${action} a ${editing.firstName} ${(editing as any).marriedLastName ? `de ${(editing as any).marriedLastName}` : editing.lastName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: editing.isActive ? 'Desactivar' : 'Activar',
          style: editing.isActive ? 'destructive' : 'default',
          onPress: async () => {
            await api.put(`/publishers/${editing.id}`, { isActive: !editing.isActive });
            setModalVisible(false); setEditing(null); fetch();
          },
        },
      ],
    );
  };

  const openCreate = () => {
    setEditing(null);
    setModalVisible(true);
  };

  const openEdit = (publisher: Publisher) => {
    setEditing(publisher);
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: Publisher }) => (
    <TouchableOpacity style={styles.card} onPress={() => isCoordinator && openEdit(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>
          {item.firstName} {(item as any).marriedLastName ? `de ${(item as any).marriedLastName}` : item.lastName}
        </Text>
        <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={styles.badgeText}>{item.isActive ? 'Activo' : 'Inactivo'}</Text>
        </View>
      </View>
      {item.congregation && (
        <Text style={styles.detail}>🏛 {item.congregation.name}</Text>
      )}
      {item.phone && <Text style={styles.detail}>📞 {formatPhone(item.phone)}</Text>}
      {(item as any).user && (
        <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[(item as any).user.role] || '#718096', alignSelf: 'flex-start', marginTop: 6 }]}>
          <Text style={styles.roleBadgeText}>{ROLE_LABELS[(item as any).user.role] || (item as any).user.role}</Text>
        </View>
      )}
      {isCoordinator && (
        <Text style={styles.editHint}>Toca para editar ✏️</Text>
      )}
    </TouchableOpacity>
  );

  const fields = [
    { key: 'firstName', label: 'Nombre', value: editing?.firstName || '' },
    { key: 'lastName', label: 'Apellido', value: editing?.lastName || '' },
    { key: 'marriedLastName', label: 'Apellido de casada (opcional)', value: (editing as any)?.marriedLastName || '' },
    { key: 'phone', label: 'Teléfono (+56 9 XXXX XXXX)', value: editing?.phone ? formatPhone(editing.phone) : '', keyboardType: 'phone-pad' as const },
    { key: 'email', label: 'Email (será su usuario)', value: editing?.email || '', keyboardType: 'email-address' as const },
    { key: 'password', label: 'Contraseña', value: '', placeholder: editing ? 'Dejar vacío para no cambiar' : 'Contraseña para iniciar sesión', secureTextEntry: true },
  ];

  // Congregación seleccionada
  // Designaciones
  const DESIGNATIONS = [
    'MISIONERO', 'PRECURSOR_ESPECIAL', 'BETEL', 'PRECURSOR_REGULAR',
    'PUBLICADOR', 'ANCIANO', 'SIERVO_MINISTERIAL',
  ];
  const DESIGNATION_LABELS: Record<string, string> = {
    MISIONERO: 'Misionero que sirve en el campo',
    PRECURSOR_ESPECIAL: 'Precursor especial',
    BETEL: 'Miembro de la familia Betel',
    PRECURSOR_REGULAR: 'Precursor regular',
    PUBLICADOR: 'Publicador',
    ANCIANO: 'Anciano',
    SIERVO_MINISTERIAL: 'Siervo ministerial',
  };
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>([]);
  React.useEffect(() => {
    if (editing) {
      try { setSelectedDesignations(JSON.parse((editing as any).designations || '[]')); }
      catch { setSelectedDesignations([]); }
    } else { setSelectedDesignations([]); }
  }, [editing]);

  const toggleDesignation = (des: string) => {
    setSelectedDesignations(prev =>
      prev.includes(des) ? prev.filter(d => d !== des) : [...prev, des]
    );
  };
  const [selectedGender, setSelectedGender] = useState('');
  React.useEffect(() => { setSelectedGender((editing as any)?.gender || ''); }, [editing]);
  const [selectedCongId, setSelectedCongId] = useState(editing?.congregationId || '');
  React.useEffect(() => { setSelectedCongId(editing?.congregationId || ''); }, [editing]);
  const [selectedRole, setSelectedRole] = useState('PUBLICADOR');
  React.useEffect(() => { setSelectedRole((editing as any)?.user?.role || 'PUBLICADOR'); }, [editing]);
  const selectedCong = congregations.find(c => c.id === selectedCongId);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar publicador..."
          placeholderTextColor="#a0aec0"
          value={search}
          onChangeText={setSearch}
        />
        {isCoordinator && (
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={publishers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <FormModal
        visible={modalVisible}
        title={editing ? 'Editar Publicador' : 'Nuevo Publicador'}
        fields={fields}
        onSave={handleSave}
        onCancel={() => { setModalVisible(false); setEditing(null); }}
        onDelete={editing ? handleDelete : undefined}
        deleteLabel={editing?.isActive ? 'Desactivar' : 'Activar'}
      >
        <View style={styles.congSection}>
          <Text style={styles.congLabel}>Congregación: {selectedCong?.name || 'Selecciona'}</Text>
          <View style={styles.congRow}>
            {congregations.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.congChip, selectedCongId === c.id && styles.congChipActive]}
                onPress={() => setSelectedCongId(c.id)}
              >
                <Text style={[styles.congChipText, selectedCongId === c.id && styles.congChipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.genderSection}>
          <Text style={styles.desLabel}>Sexo:</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, selectedGender === 'M' && styles.genderBtnActive]}
              onPress={() => setSelectedGender('M')}
            >
              <Text style={[styles.genderText, selectedGender === 'M' && styles.genderTextActive]}>♂ Masculino</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, selectedGender === 'F' && styles.genderBtnActive]}
              onPress={() => setSelectedGender('F')}
            >
              <Text style={[styles.genderText, selectedGender === 'F' && styles.genderTextActive]}>♀ Femenino</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.roleSection}>
          <Text style={styles.desLabel}>Perfil:</Text>
          <View style={styles.roleRow}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, selectedRole === r && styles.roleChipSel]}
                onPress={() => setSelectedRole(r)}
              >
                <Text style={[styles.roleChipText, selectedRole === r && styles.roleChipTextSel]}>{ROLE_LABELS[r]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.desSection}>
          <Text style={styles.desLabel}>Designaciones:</Text>
          {DESIGNATIONS.map((des) => (
            <TouchableOpacity
              key={des}
              style={styles.desRow}
              onPress={() => toggleDesignation(des)}
            >
              <Text style={styles.desCheck}>{selectedDesignations.includes(des) ? '☑' : '☐'}</Text>
              <Text style={[styles.desText, selectedDesignations.includes(des) && styles.desTextActive]}>
                {DESIGNATION_LABELS[des]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc', padding: 16 },
  topBar: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchInput: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#e2e8f0', color: '#2d3748',
  },
  addBtn: {
    backgroundColor: '#2b6cb0', borderRadius: 10, width: 50, height: 50,
    justifyContent: 'center', alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 26, fontWeight: '300', marginTop: -2 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 17, fontWeight: '600', color: '#2d3748' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#c6f6d5' },
  badgeInactive: { backgroundColor: '#fed7d7' },
  badgeText: { fontSize: 12, fontWeight: '500', color: '#2d3748' },
  detail: { fontSize: 14, color: '#718096', marginTop: 4 },
  editHint: { fontSize: 11, color: '#a0aec0', textAlign: 'right', marginTop: 8 },
  congSection: { marginTop: 4, marginBottom: 10 },
  congLabel: { fontSize: 14, fontWeight: '600', color: '#4a5568', marginBottom: 8 },
  congRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  congChip: {
    backgroundColor: '#edf2f7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 2, borderColor: '#edf2f7',
  },
  congChipActive: { backgroundColor: '#bee3f8', borderColor: '#2b6cb0' },
  congChipText: { fontSize: 13, color: '#4a5568' },
  congChipTextActive: { color: '#2b6cb0', fontWeight: '600' },
  desSection: { marginTop: 10 },
  desLabel: { fontSize: 14, fontWeight: '600', color: '#4a5568', marginBottom: 8 },
  desRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  desCheck: { fontSize: 20, marginRight: 10, color: '#4a5568' },
  desText: { fontSize: 14, color: '#718096' },
  desTextActive: { color: '#2b6cb0', fontWeight: '500' },
  genderSection: { marginTop: 10 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, backgroundColor: '#edf2f7', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: '#edf2f7' },
  genderBtnActive: { backgroundColor: '#bee3f8', borderColor: '#2b6cb0' },
  genderText: { fontSize: 14, color: '#718096', fontWeight: '500' },
  genderTextActive: { color: '#2b6cb0', fontWeight: '600' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  roleSection: { marginTop: 10 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  roleChip: { backgroundColor: '#edf2f7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  roleChipSel: { backgroundColor: '#2b6cb0' },
  roleChipText: { fontSize: 12, color: '#4a5568' },
  roleChipTextSel: { color: '#fff', fontWeight: '600' },
});
