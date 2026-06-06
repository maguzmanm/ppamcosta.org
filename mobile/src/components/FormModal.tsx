import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';

interface FormField {
  key: string;
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
}

interface Props {
  visible: boolean;
  title: string;
  fields: FormField[];
  onSave: (data: Record<string, string>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  children?: React.ReactNode;
}

export default function FormModal({ visible, title, fields, onSave, onCancel, onDelete, deleteLabel, children }: Props) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Initialize only when modal opens
  React.useEffect(() => {
    if (visible) {
      const initial: Record<string, string> = {};
      fields.forEach((f) => { initial[f.key] = f.value || ''; });
      setFormData(initial);
    }
  }, [visible]);

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <ScrollView>
            <Text style={styles.title}>{title}</Text>

            {fields.map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={[styles.input, field.multiline && styles.textArea]}
                  value={formData[field.key] || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, [field.key]: text }))}
                  placeholder={field.placeholder || field.label}
                  placeholderTextColor="#a0aec0"
                  multiline={field.multiline}
                  keyboardType={field.keyboardType || 'default'}
                  secureTextEntry={field.secureTextEntry || false}
                />
              </View>
            ))}

            {children}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>💾 Guardar</Text>
              </TouchableOpacity>
              {onDelete && (
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                  <Text style={styles.deleteText}>🗑 {deleteLabel || 'Eliminar'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2d3748', marginBottom: 16, textAlign: 'center' },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#4a5568', marginBottom: 4 },
  input: {
    backgroundColor: '#f7fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#2d3748',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  actions: { marginTop: 16, gap: 10 },
  saveBtn: { backgroundColor: '#2b6cb0', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#fed7d7', borderRadius: 10, padding: 14, alignItems: 'center' },
  deleteText: { color: '#c53030', fontSize: 16, fontWeight: '600' },
  cancelBtn: { backgroundColor: '#e2e8f0', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: '#4a5568', fontSize: 16, fontWeight: '600' },
});
