import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, FlatList, TextInput, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../../context/UserContext';
import RoleService from '../../services/RoleService';

const ConsultasMedicoScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const userRole = user?.rol || 'medico';
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [showDiagnosticoModal, setShowDiagnosticoModal] = useState(false);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState(null);
  const [diagnosticoText, setDiagnosticoText] = useState('');

  useEffect(() => {
    // Validar permisos
    if (!RoleService.canPerformAction(userRole, 'ver_consultas_asignadas')) {
      Alert.alert(
        'Acceso Denegado',
        'No tienes permisos para ver consultas.',
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
    loadConsultas();
  }, [userRole]);

  const loadConsultas = async () => {
    try {
      setLoading(true);
      console.log('Cargando consultas para médico:', user?.email, user?.id);
      
      // Obtener ID del médico desde usuarios (donde están los médicos con rol 'medico')
      const medicoUsuario = await db.getFirstAsync(
        'SELECT id FROM usuarios WHERE (firebaseUid = ? OR email = ?) AND rol = ?',
        [user.id, user.email, 'medico']
      );

      if (!medicoUsuario) {
        console.log('Médico no encontrado en usuarios');
        setConsultas([]);
        setLoading(false);
        return;
      }

      console.log('ID del médico encontrado:', medicoUsuario.id);

      // Buscar consultas usando el ID del médico de usuarios
      // Primero buscar directamente sin JOIN para verificar que existen
      let consultasEncontradas = await db.getAllAsync(
        `SELECT c.*
         FROM consultas c
         WHERE c.medicoId = ?
         ORDER BY c.fecha DESC, c.hora DESC`,
        [medicoUsuario.id]
      );
      
      console.log('Consultas encontradas sin JOIN:', consultasEncontradas?.length || 0);
      
      // Si hay consultas, obtener datos del paciente para cada una
      let result = [];
      if (consultasEncontradas && consultasEncontradas.length > 0) {
        for (const consulta of consultasEncontradas) {
          // Buscar paciente por id o firebaseUid
          let paciente = null;
          const pacienteId = consulta.pacienteId;
          
          // Intentar como número
          if (!isNaN(pacienteId) && pacienteId.toString() === parseInt(pacienteId).toString()) {
            paciente = await db.getFirstAsync(
              'SELECT nombre, telefono, email FROM usuarios WHERE id = ?',
              [parseInt(pacienteId)]
            );
          }
          
          // Si no se encontró, buscar por firebaseUid
          if (!paciente) {
            paciente = await db.getFirstAsync(
              'SELECT nombre, telefono, email FROM usuarios WHERE firebaseUid = ?',
              [pacienteId.toString()]
            );
          }
          
          result.push({
            ...consulta,
            pacienteNombre: paciente?.nombre || 'Paciente',
            pacienteTelefono: paciente?.telefono || null,
            pacienteEmail: paciente?.email || null
          });
        }
      }
      
      console.log('Consultas encontradas con medicoUsuario.id:', result?.length || 0);
      
      // También buscar todas las consultas para debug
      const todasConsultas = await db.getAllAsync('SELECT * FROM consultas LIMIT 10');
      console.log('Primeras 10 consultas en BD:', todasConsultas?.map(c => ({ id: c.id, medicoId: c.medicoId, pacienteId: c.pacienteId })));

      // Obtener también el ID de la tabla medicos si existe
      let medicoTabla = null;
      try {
        medicoTabla = await db.getFirstAsync(
          'SELECT id FROM medicos WHERE firebaseUid = ? OR email = ?',
          [user.id, user.email]
        );
        if (medicoTabla) {
          console.log('Médico también encontrado en tabla medicos con ID:', medicoTabla.id);
        }
      } catch (e) {
        console.log('No se pudo buscar en tabla medicos:', e);
      }

      // Si no hay resultados, intentar con la tabla medicos
      if ((!result || result.length === 0) && medicoTabla) {
        console.log('No se encontraron consultas con ID de usuarios, intentando con tabla medicos...');
        result = await db.getAllAsync(
          `SELECT c.*, u.nombre as pacienteNombre, u.telefono as pacienteTelefono, u.email as pacienteEmail
           FROM consultas c
           LEFT JOIN usuarios u ON (c.pacienteId = u.id OR c.pacienteId = u.firebaseUid)
           WHERE CAST(c.medicoId AS TEXT) = CAST(? AS TEXT)
           ORDER BY c.fecha DESC, c.hora DESC`,
          [medicoTabla.id]
        );
        console.log('Consultas encontradas con medicoTabla.id:', result?.length || 0);
      }
      
      // Si aún no hay resultados, buscar todas las consultas y ver qué medicoIds hay
      // También intentar buscar por todos los IDs posibles del médico
      if (!result || result.length === 0) {
        console.log('Buscando todas las consultas para ver qué medicoIds existen...');
        const todasLasConsultas = await db.getAllAsync('SELECT DISTINCT medicoId FROM consultas');
        console.log('medicoIds únicos en consultas:', todasLasConsultas?.map(c => c.medicoId));
        console.log('ID del médico actual (usuarios):', medicoUsuario.id);
        if (medicoTabla) {
          console.log('ID del médico actual (medicos):', medicoTabla.id);
        }
        
        // Intentar buscar consultas donde el medicoId coincida con cualquier ID relacionado al médico
        const medicoIdsPosibles = [medicoUsuario.id];
        if (medicoTabla && medicoTabla.id) {
          medicoIdsPosibles.push(medicoTabla.id);
        }
        
        if (medicoIdsPosibles.length > 1) {
          const placeholders = medicoIdsPosibles.map(() => '?').join(',');
          result = await db.getAllAsync(
            `SELECT c.*, u.nombre as pacienteNombre, u.telefono as pacienteTelefono, u.email as pacienteEmail
             FROM consultas c
             LEFT JOIN usuarios u ON (c.pacienteId = u.id OR c.pacienteId = u.firebaseUid)
             WHERE CAST(c.medicoId AS TEXT) IN (${placeholders.map(() => 'CAST(? AS TEXT)').join(',')})
             ORDER BY c.fecha DESC, c.hora DESC`,
            medicoIdsPosibles
          );
          console.log('Consultas encontradas con IDs múltiples:', result?.length || 0);
        }
      }

      console.log('Consultas encontradas:', result?.length || 0);
      setConsultas(result || []);
    } catch (error) {
      console.error('Error cargando consultas:', error);
      Alert.alert('Error', 'No se pudieron cargar las consultas');
      setConsultas([]);
    } finally {
      setLoading(false);
    }
  };

  const completarConsulta = async (consultaId) => {
    Alert.alert(
      'Completar Consulta',
      '¿Deseas marcar esta consulta como completada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          onPress: async () => {
            try {
              await db.runAsync(
                'UPDATE consultas SET estado = ? WHERE id = ?',
                ['completada', consultaId]
              );
              loadConsultas();
              Alert.alert('Éxito', 'Consulta completada correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo completar la consulta');
            }
          }
        }
      ]
    );
  };

  const abrirModalDiagnostico = (consulta) => {
    setConsultaSeleccionada(consulta);
    setDiagnosticoText(consulta.diagnostico || '');
    setShowDiagnosticoModal(true);
  };

  const guardarDiagnostico = async () => {
    if (!consultaSeleccionada || !diagnosticoText.trim()) {
      Alert.alert('Error', 'Por favor ingresa un diagnóstico');
      return;
    }

    try {
      await db.runAsync(
        'UPDATE consultas SET diagnostico = ? WHERE id = ?',
        [diagnosticoText.trim(), consultaSeleccionada.id]
      );
      setShowDiagnosticoModal(false);
      setConsultaSeleccionada(null);
      setDiagnosticoText('');
      loadConsultas();
      Alert.alert('Éxito', 'Diagnóstico agregado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el diagnóstico');
    }
  };

  const consultasFiltradas = filtroEstado === 'todas'
    ? consultas
    : consultas.filter(c => c.estado === filtroEstado);

  const renderConsulta = ({ item }) => {
    const fecha = new Date(item.fecha);
    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const getEstadoColor = (estado) => {
      switch (estado) {
        case 'programada': return '#2196F3';
        case 'completada': return '#42A5F5';
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

    return (
      <TouchableOpacity
        style={styles.consultaCard}
        onPress={() => {
          navigation.navigate('DetalleConsulta', { consulta: item });
        }}
      >
        <View style={styles.consultaHeader}>
          <View style={styles.pacienteInfo}>
            <Text style={styles.pacienteNombre}>{item.pacienteNombre}</Text>
            <Text style={styles.pacienteContacto}>{item.pacienteEmail}</Text>
            {item.pacienteTelefono && (
              <Text style={styles.pacienteTelefono}>
                <MaterialCommunityIcons name="phone" size={14} color="#666" /> {item.pacienteTelefono}
              </Text>
            )}
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
            <Text style={styles.estadoText}>{getEstadoText(item.estado)}</Text>
          </View>
        </View>

        <View style={styles.consultaFecha}>
          <MaterialCommunityIcons name="calendar" size={20} color="#666" />
          <Text style={styles.fechaText}>{fechaFormateada}</Text>
        </View>

        <View style={styles.consultaHora}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#666" />
          <Text style={styles.horaText}>{item.hora}</Text>
        </View>

        {item.motivo && (
          <View style={styles.motivoContainer}>
            <Text style={styles.motivoLabel}>Motivo:</Text>
            <Text style={styles.motivoText}>{item.motivo}</Text>
          </View>
        )}

        {item.diagnostico && (
          <View style={styles.diagnosticoContainer}>
            <Text style={styles.diagnosticoLabel}>Diagnóstico:</Text>
            <Text style={styles.diagnosticoText}>{item.diagnostico}</Text>
          </View>
        )}

        <View style={styles.consultaActions}>
          {item.estado === 'programada' && (
            <>
              <TouchableOpacity
                style={styles.completarButton}
                onPress={(e) => {
                  e.stopPropagation();
                  completarConsulta(item.id);
                }}
              >
                <MaterialCommunityIcons name="check-circle" size={20} color="#42A5F5" />
                <Text style={styles.completarButtonText}>Completar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.diagnosticoButton}
                onPress={(e) => {
                  e.stopPropagation();
                  abrirModalDiagnostico(item);
                }}
              >
                <MaterialCommunityIcons name="clipboard-text" size={20} color="#2196F3" />
                <Text style={styles.diagnosticoButtonText}>Diagnóstico</Text>
              </TouchableOpacity>
            </>
          )}
          {item.estado === 'completada' && (
            <TouchableOpacity
              style={styles.diagnosticoButton}
              onPress={(e) => {
                e.stopPropagation();
                abrirModalDiagnostico(item);
              }}
            >
              <MaterialCommunityIcons name="clipboard-text" size={20} color="#2196F3" />
              <Text style={styles.diagnosticoButtonText}>
                {item.diagnostico ? 'Editar Diagnóstico' : 'Agregar Diagnóstico'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.chatButton}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('Conversaciones', {
                abrirChatCon: {
                  id: item.pacienteId,
                  nombre: item.pacienteNombre || 'Paciente',
                  firebaseUid: item.pacienteId
                }
              });
            }}
          >
            <MaterialCommunityIcons name="message-text" size={20} color="#9C27B0" />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando consultas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filtroEstado === 'todas' && styles.filterButtonActive]}
          onPress={() => setFiltroEstado('todas')}
        >
          <Text style={[styles.filterText, filtroEstado === 'todas' && styles.filterTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filtroEstado === 'programada' && styles.filterButtonActive]}
          onPress={() => setFiltroEstado('programada')}
        >
          <Text style={[styles.filterText, filtroEstado === 'programada' && styles.filterTextActive]}>
            Programadas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filtroEstado === 'completada' && styles.filterButtonActive]}
          onPress={() => setFiltroEstado('completada')}
        >
          <Text style={[styles.filterText, filtroEstado === 'completada' && styles.filterTextActive]}>
            Completadas
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={consultasFiltradas}
        renderItem={renderConsulta}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-remove" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No tienes consultas {filtroEstado !== 'todas' ? filtroEstado : ''}</Text>
          </View>
        }
      />

      <Modal
        visible={showDiagnosticoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDiagnosticoModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Diagnóstico</Text>
            <TextInput
              style={styles.diagnosticoInput}
              placeholder="Ingresa el diagnóstico..."
              value={diagnosticoText}
              onChangeText={setDiagnosticoText}
              multiline
              numberOfLines={6}
              placeholderTextColor="#999"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDiagnosticoModal(false);
                  setConsultaSeleccionada(null);
                  setDiagnosticoText('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={guardarDiagnostico}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  filtersContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 15,
  },
  consultaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  consultaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  pacienteInfo: {
    flex: 1,
  },
  pacienteNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  pacienteContacto: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pacienteTelefono: {
    fontSize: 13,
    color: '#666',
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
  consultaFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fechaText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  consultaHora: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  horaText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  motivoContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  motivoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  motivoText: {
    fontSize: 14,
    color: '#333',
  },
  diagnosticoContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  diagnosticoLabel: {
    fontSize: 12,
    color: '#2196F3',
    marginBottom: 4,
    fontWeight: '600',
  },
  diagnosticoText: {
    fontSize: 14,
    color: '#333',
  },
  consultaActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  completarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  completarButtonText: {
    marginLeft: 6,
    color: '#42A5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  diagnosticoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  diagnosticoButtonText: {
    marginLeft: 6,
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#F3E5F5',
    borderRadius: 20,
  },
  chatButtonText: {
    marginLeft: 6,
    color: '#9C27B0',
    fontSize: 14,
    fontWeight: '600',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  diagnosticoInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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

export default ConsultasMedicoScreen;
