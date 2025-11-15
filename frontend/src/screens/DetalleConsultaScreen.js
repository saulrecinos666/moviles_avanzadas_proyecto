import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../context/UserContext';
import RoleService from '../services/RoleService';

const DetalleConsultaScreen = ({ navigation, route }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const userRole = user?.rol || 'paciente';
  const { consulta } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [showRecetaModal, setShowRecetaModal] = useState(false);
  const [formDataReceta, setFormDataReceta] = useState({
    medicamentos: '',
    instrucciones: '',
    diagnostico: consulta?.diagnostico || '',
    notas: ''
  });

  if (!consulta) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No se encontró la consulta</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const fecha = new Date(consulta.fecha);
  const fechaFormateada = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'programada': return '#2196F3';
      case 'completada': return '#4CAF50';
      case 'cancelada': return '#F44336';
      default: return '#666';
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case 'programada': return 'Programada';
      case 'completada': return 'Completada';
      case 'cancelada': return 'Cancelada';
      default: return estado;
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'programada': return 'calendar-clock';
      case 'completada': return 'check-circle';
      case 'cancelada': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const cancelarConsulta = async () => {
    if (!RoleService.canPerformAction(userRole, 'ver_consultas_propias')) {
      Alert.alert('Error', 'No tienes permisos para cancelar consultas');
      return;
    }

    Alert.alert(
      'Cancelar Consulta',
      '¿Estás seguro de que deseas cancelar esta consulta?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await db.runAsync(
                'UPDATE consultas SET estado = ? WHERE id = ?',
                ['cancelada', consulta.id]
              );
              Alert.alert(
                'Éxito',
                'Consulta cancelada correctamente',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (error) {
              console.error('Error cancelando consulta:', error);
              Alert.alert('Error', 'No se pudo cancelar la consulta');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const calificarConsulta = () => {
    Alert.alert('Calificar', 'Funcionalidad de calificación próximamente');
  };

  const iniciarChat = () => {
    if (RoleService.isMedico(userRole)) {
      // Si es médico, necesita el paciente
      navigation.navigate('Conversaciones', {
        abrirChatCon: {
          id: consulta.pacienteId,
          nombre: consulta.pacienteNombre || 'Paciente',
          firebaseUid: consulta.pacienteId
        }
      });
    } else {
      // Si es paciente, necesita el médico
      navigation.navigate('Conversaciones', {
        abrirChatCon: {
          id: consulta.medicoId,
          nombre: consulta.medicoNombre || 'Médico',
          firebaseUid: consulta.medicoId,
          especialidad: consulta.especialidad
        }
      });
    }
  };

  const abrirModalReceta = () => {
    setFormDataReceta({
      medicamentos: '',
      instrucciones: '',
      diagnostico: consulta.diagnostico || '',
      notas: ''
    });
    setShowRecetaModal(true);
  };

  const crearReceta = async () => {
    if (!formDataReceta.medicamentos.trim()) {
      Alert.alert('Error', 'Por favor ingresa los medicamentos');
      return;
    }

    try {
      setLoading(true);
      
      // Obtener ID del médico desde usuarios
      const medicoUsuario = await db.getFirstAsync(
        'SELECT id FROM usuarios WHERE (firebaseUid = ? OR email = ?) AND rol = ?',
        [user.id, user.email, 'medico']
      );

      if (!medicoUsuario) {
        Alert.alert('Error', 'No se pudo identificar al médico');
        setLoading(false);
        return;
      }

      // Obtener el pacienteId correcto (puede ser id numérico o firebaseUid string)
      // Buscar el paciente en la tabla usuarios para obtener su id
      let pacienteIdFinal = consulta.pacienteId;
      const pacienteUsuario = await db.getFirstAsync(
        'SELECT id, firebaseUid FROM usuarios WHERE (id = ? OR firebaseUid = ?) AND rol = ?',
        [consulta.pacienteId, consulta.pacienteId, 'paciente']
      );
      
      if (pacienteUsuario) {
        // Usar el id numérico del paciente si está disponible, sino usar firebaseUid
        pacienteIdFinal = pacienteUsuario.id || pacienteUsuario.firebaseUid;
      }

      console.log('Guardando receta - consultaId:', consulta.id, 'pacienteId:', pacienteIdFinal, 'medicoId:', medicoUsuario.id);

      // Generar número de receta único
      const numeroReceta = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const fechaVencimiento = new Date();
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 3); // 3 meses de validez

      await db.runAsync(
        `INSERT INTO recetas 
         (consultaId, pacienteId, medicoId, numeroReceta, fechaEmision, fechaVencimiento, medicamentos, instrucciones, diagnostico, notas, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          consulta.id,
          pacienteIdFinal,
          medicoUsuario.id,
          numeroReceta,
          new Date().toISOString(),
          fechaVencimiento.toISOString(),
          formDataReceta.medicamentos.trim(),
          formDataReceta.instrucciones.trim() || null,
          formDataReceta.diagnostico.trim() || null,
          formDataReceta.notas.trim() || null,
          'activa'
        ]
      );
      
      console.log('Receta creada exitosamente');

      setShowRecetaModal(false);
      setFormDataReceta({
        medicamentos: '',
        instrucciones: '',
        diagnostico: consulta.diagnostico || '',
        notas: ''
      });
      
      Alert.alert(
        'Éxito',
        'Receta creada correctamente',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error creando receta:', error);
      Alert.alert('Error', 'No se pudo crear la receta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header con estado */}
      <View style={styles.header}>
        <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(consulta.estado) }]}>
          <MaterialCommunityIcons 
            name={getEstadoIcon(consulta.estado)} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.estadoText}>{getEstadoText(consulta.estado)}</Text>
        </View>
      </View>

      {/* Información del médico/paciente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {RoleService.isMedico(userRole) ? 'Paciente' : 'Médico'}
        </Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={24} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nombre</Text>
              <Text style={styles.infoValue}>
                {RoleService.isMedico(userRole) 
                  ? (consulta.pacienteNombre || 'Paciente')
                  : (consulta.medicoNombre || 'Médico')}
              </Text>
            </View>
          </View>
          {!RoleService.isMedico(userRole) && consulta.especialidad && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="stethoscope" size={24} color="#2196F3" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Especialidad</Text>
                <Text style={styles.infoValue}>{consulta.especialidad}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Fecha y hora */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fecha y Hora</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={24} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Fecha</Text>
              <Text style={styles.infoValue}>{fechaFormateada}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Hora</Text>
              <Text style={styles.infoValue}>{consulta.hora}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="timer" size={24} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Duración</Text>
              <Text style={styles.infoValue}>{consulta.duracion || 30} minutos</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="video" size={24} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tipo</Text>
              <Text style={styles.infoValue}>
                {consulta.tipo === 'virtual' ? 'Consulta Virtual' : 'Consulta Presencial'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Motivo y síntomas */}
      {consulta.motivo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motivo de la Consulta</Text>
          <View style={styles.textCard}>
            <Text style={styles.textContent}>{consulta.motivo}</Text>
          </View>
        </View>
      )}

      {consulta.sintomas && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Síntomas</Text>
          <View style={styles.textCard}>
            <Text style={styles.textContent}>{consulta.sintomas}</Text>
          </View>
        </View>
      )}

      {/* Diagnóstico */}
      {consulta.diagnostico && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnóstico</Text>
          <View style={[styles.textCard, styles.diagnosticoCard]}>
            <Text style={styles.textContent}>{consulta.diagnostico}</Text>
          </View>
        </View>
      )}

      {/* Notas */}
      {consulta.notas && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <View style={styles.textCard}>
            <Text style={styles.textContent}>{consulta.notas}</Text>
          </View>
        </View>
      )}

      {/* Calificación */}
      {consulta.calificacion && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calificación</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="star" size={24} color="#FFA500" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Puntuación</Text>
                <Text style={styles.infoValue}>
                  {consulta.calificacion} / 5
                </Text>
              </View>
            </View>
            {consulta.comentarioCalificacion && (
              <View style={styles.textCard}>
                <Text style={styles.textContent}>{consulta.comentarioCalificacion}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Acciones */}
      <View style={styles.actionsSection}>
        {consulta.estado === 'programada' && !RoleService.isMedico(userRole) && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelActionButton]}
            onPress={cancelarConsulta}
            disabled={loading}
          >
            <MaterialCommunityIcons name="close-circle" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Cancelar Consulta</Text>
          </TouchableOpacity>
        )}

        {consulta.estado === 'completada' && !consulta.calificacion && !RoleService.isMedico(userRole) && (
          <TouchableOpacity
            style={[styles.actionButton, styles.rateActionButton]}
            onPress={calificarConsulta}
          >
            <MaterialCommunityIcons name="star" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Calificar Consulta</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.chatActionButton]}
          onPress={iniciarChat}
        >
          <MaterialCommunityIcons name="message-text" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>
            {RoleService.isMedico(userRole) ? 'Chat con Paciente' : 'Chat con Médico'}
          </Text>
        </TouchableOpacity>

        {/* Botón de receta - Médico puede crear, paciente solo ver */}
        {RoleService.isMedico(userRole) ? (
          // Médico puede crear receta si la consulta está completada o programada
          (consulta.estado === 'completada' || consulta.estado === 'programada') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.recetaActionButton]}
              onPress={abrirModalReceta}
              disabled={loading}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Agregar Receta</Text>
            </TouchableOpacity>
          )
        ) : (
          // Paciente solo puede ver recetas si la consulta está completada
          consulta.estado === 'completada' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.recetaActionButton]}
              onPress={() => navigation.navigate('Recetas', { consultaId: consulta.id })}
            >
              <MaterialCommunityIcons name="file-document" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Ver Receta</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      )}

      {/* Modal para crear receta */}
      <Modal
        visible={showRecetaModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRecetaModal(false)}
      >
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Crear Receta</Text>
                <TouchableOpacity
                  onPress={() => setShowRecetaModal(false)}
                  style={styles.closeButton}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Paciente: {RoleService.isMedico(userRole) ? (consulta.pacienteNombre || 'Paciente') : (consulta.medicoNombre || 'Médico')}
              </Text>

              <Text style={styles.inputLabel}>Medicamentos *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Ingresa los medicamentos prescritos..."
                value={formDataReceta.medicamentos}
                onChangeText={(text) => setFormDataReceta({ ...formDataReceta, medicamentos: text })}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Instrucciones</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Instrucciones de uso y dosificación..."
                value={formDataReceta.instrucciones}
                onChangeText={(text) => setFormDataReceta({ ...formDataReceta, instrucciones: text })}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Diagnóstico</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Diagnóstico relacionado..."
                value={formDataReceta.diagnostico}
                onChangeText={(text) => setFormDataReceta({ ...formDataReceta, diagnostico: text })}
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Notas</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Notas adicionales..."
                value={formDataReceta.notas}
                onChangeText={(text) => setFormDataReceta({ ...formDataReceta, notas: text })}
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => {
                    setShowRecetaModal(false);
                    setFormDataReceta({
                      medicamentos: '',
                      instrucciones: '',
                      diagnostico: consulta.diagnostico || '',
                      notas: ''
                    });
                  }}
                >
                  <Text style={styles.cancelModalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveModalButton]}
                  onPress={crearReceta}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveModalButtonText}>Crear Receta</Text>
                  )}
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  estadoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  textCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  diagnosticoCard: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  textContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  actionsSection: {
    padding: 15,
    paddingBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  cancelActionButton: {
    backgroundColor: '#F44336',
  },
  rateActionButton: {
    backgroundColor: '#FF9800',
  },
  chatActionButton: {
    backgroundColor: '#9C27B0',
  },
  recetaActionButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalKeyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
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
    backgroundColor: '#FAFAFA',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelModalButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  saveModalButton: {
    backgroundColor: '#2196F3',
  },
  saveModalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default DetalleConsultaScreen;

