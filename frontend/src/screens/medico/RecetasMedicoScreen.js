import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, FlatList, TextInput, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../../context/UserContext';
import RoleService from '../../services/RoleService';

const RecetasMedicoScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const userRole = user?.rol || 'medico';
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecetaModal, setShowRecetaModal] = useState(false);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState(null);
  const [formData, setFormData] = useState({
    medicamentos: '',
    instrucciones: '',
    diagnostico: '',
    notas: ''
  });

  useEffect(() => {
    // Validar permisos
    if (!RoleService.canPerformAction(userRole, 'crear_recetas')) {
      Alert.alert(
        'Acceso Denegado',
        'No tienes permisos para crear recetas.',
        [
          {
            text: 'OK',
            onPress: () => {
              const redirectScreen = RoleService.isAdmin(userRole) 
                ? 'DashboardAdmin' 
                : 'Dashboard';
              navigation.replace(redirectScreen);
            }
          }
        ]
      );
      return;
    }
  }, [userRole]);

  // Recargar recetas cuando la pantalla recibe foco
  useFocusEffect(
    React.useCallback(() => {
      if (RoleService.canPerformAction(userRole, 'crear_recetas')) {
        loadRecetas();
      }
    }, [userRole])
  );

  const loadRecetas = async () => {
    try {
      setLoading(true);
      console.log('Cargando recetas para médico:', user?.email, user?.id);
      
      // Obtener ID del médico desde usuarios (donde están los médicos con rol 'medico')
      const medicoUsuario = await db.getFirstAsync(
        'SELECT id FROM usuarios WHERE (firebaseUid = ? OR email = ?) AND rol = ?',
        [user.id, user.email, 'medico']
      );

      console.log('ID del médico encontrado en usuarios:', medicoUsuario?.id);

      // También intentar con la tabla medicos por compatibilidad
      let medicoTabla = null;
      try {
        medicoTabla = await db.getFirstAsync(
          'SELECT id FROM medicos WHERE firebaseUid = ? OR email = ?',
          [user.id, user.email]
        );
        if (medicoTabla) {
          console.log('ID del médico encontrado en medicos:', medicoTabla.id);
        }
      } catch (e) {
        console.log('No se pudo buscar en tabla medicos:', e);
      }

      if (!medicoUsuario && !medicoTabla) {
        console.log('Médico no encontrado');
        setRecetas([]);
        setLoading(false);
        return;
      }

      // Buscar recetas usando ambos IDs posibles
      const medicoIdsPosibles = [];
      if (medicoUsuario) medicoIdsPosibles.push(medicoUsuario.id);
      if (medicoTabla) medicoIdsPosibles.push(medicoTabla.id);

      const placeholders = medicoIdsPosibles.map(() => '?').join(',');

      let result = await db.getAllAsync(
        `SELECT r.*, 
                COALESCE(u1.nombre, u2.nombre, 'Paciente') as pacienteNombre, 
                c.fecha as fechaConsulta, 
                c.motivo
         FROM recetas r
         LEFT JOIN usuarios u1 ON (r.pacienteId = u1.id AND u1.rol = 'paciente')
         LEFT JOIN usuarios u2 ON (r.pacienteId = u2.firebaseUid AND u2.rol = 'paciente')
         JOIN consultas c ON r.consultaId = c.id
         WHERE r.medicoId IN (${placeholders})
         ORDER BY r.fechaEmision DESC`,
        medicoIdsPosibles
      );

      console.log('Recetas encontradas:', result?.length || 0);
      setRecetas(result || []);
    } catch (error) {
      console.error('Error cargando recetas:', error);
      Alert.alert('Error', 'No se pudieron cargar las recetas');
      setRecetas([]);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalReceta = async (consulta) => {
    setConsultaSeleccionada(consulta);
    setFormData({
      medicamentos: '',
      instrucciones: '',
      diagnostico: consulta.diagnostico || '',
      notas: ''
    });
    setShowRecetaModal(true);
  };

  const crearReceta = async () => {
    if (!consultaSeleccionada || !formData.medicamentos.trim()) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      // Generar número de receta único
      const numeroReceta = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const fechaVencimiento = new Date();
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 3); // 3 meses de validez

      await db.runAsync(
        `INSERT INTO recetas 
         (consultaId, pacienteId, medicoId, numeroReceta, fechaEmision, fechaVencimiento, medicamentos, instrucciones, diagnostico, notas, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          consultaSeleccionada.id,
          consultaSeleccionada.pacienteId,
          consultaSeleccionada.medicoId,
          numeroReceta,
          new Date().toISOString(),
          fechaVencimiento.toISOString(),
          formData.medicamentos.trim(),
          formData.instrucciones.trim() || null,
          formData.diagnostico.trim() || null,
          formData.notas.trim() || null,
          'activa'
        ]
      );

      setShowRecetaModal(false);
      setConsultaSeleccionada(null);
      setFormData({
        medicamentos: '',
        instrucciones: '',
        diagnostico: '',
        notas: ''
      });
      loadRecetas();
      Alert.alert('Éxito', 'Receta creada correctamente');
    } catch (error) {
      console.error('Error creando receta:', error);
      Alert.alert('Error', 'No se pudo crear la receta');
    }
  };

  const renderReceta = ({ item }) => {
    const fechaEmision = new Date(item.fechaEmision);
    const fechaVencimiento = item.fechaVencimiento ? new Date(item.fechaVencimiento) : null;
    const hoy = new Date();
    const estaVencida = fechaVencimiento && fechaVencimiento < hoy;

    return (
      <View style={styles.recetaCard}>
        <View style={styles.recetaHeader}>
          <View style={styles.recetaTitleContainer}>
            <MaterialCommunityIcons name="file-document" size={32} color="#2196F3" />
            <View style={styles.recetaTitle}>
              <Text style={styles.recetaNumero}>Receta #{item.numeroReceta}</Text>
              <Text style={styles.recetaPaciente}>{item.pacienteNombre}</Text>
            </View>
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: estaVencida ? '#F44336' : '#42A5F5' }]}>
            <Text style={styles.estadoText}>
              {item.estado === 'activa' && !estaVencida ? 'Activa' : 'Vencida'}
            </Text>
          </View>
        </View>

        <View style={styles.recetaInfo}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={18} color="#666" />
            <Text style={styles.infoText}>
              Emisión: {fechaEmision.toLocaleDateString('es-ES')}
            </Text>
          </View>
          {fechaVencimiento && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color="#666" />
              <Text style={styles.infoText}>
                Vencimiento: {fechaVencimiento.toLocaleDateString('es-ES')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.medicamentosContainer}>
          <Text style={styles.sectionTitle}>Medicamentos</Text>
          <Text style={styles.medicamentosText}>{item.medicamentos}</Text>
        </View>

        {item.instrucciones && (
          <View style={styles.instruccionesContainer}>
            <Text style={styles.sectionTitle}>Instrucciones</Text>
            <Text style={styles.instruccionesText}>{item.instrucciones}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando recetas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={recetas}
        renderItem={renderReceta}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No has creado recetas aún</Text>
            <Text style={styles.emptySubtext}>
              Las recetas se crean desde las consultas completadas
            </Text>
          </View>
        }
      />

      <Modal
        visible={showRecetaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRecetaModal(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Receta</Text>
            {consultaSeleccionada && (
              <Text style={styles.modalSubtitle}>
                Paciente: {consultaSeleccionada.pacienteNombre}
              </Text>
            )}

            <Text style={styles.inputLabel}>Medicamentos *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ingresa los medicamentos..."
              value={formData.medicamentos}
              onChangeText={(text) => setFormData({ ...formData, medicamentos: text })}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Instrucciones</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Instrucciones de uso..."
              value={formData.instrucciones}
              onChangeText={(text) => setFormData({ ...formData, instrucciones: text })}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Diagnóstico</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Diagnóstico..."
              value={formData.diagnostico}
              onChangeText={(text) => setFormData({ ...formData, diagnostico: text })}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Notas</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Notas adicionales..."
              value={formData.notas}
              onChangeText={(text) => setFormData({ ...formData, notas: text })}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRecetaModal(false);
                  setConsultaSeleccionada(null);
                  setFormData({
                    medicamentos: '',
                    instrucciones: '',
                    diagnostico: '',
                    notas: ''
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={crearReceta}
              >
                <Text style={styles.saveButtonText}>Crear Receta</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  listContainer: {
    padding: 15,
  },
  recetaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  recetaTitleContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  recetaTitle: {
    marginLeft: 12,
    flex: 1,
  },
  recetaNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recetaPaciente: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  estadoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  recetaInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
  },
  medicamentosContainer: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  medicamentosText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  instruccionesContainer: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  instruccionesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default RecetasMedicoScreen;
