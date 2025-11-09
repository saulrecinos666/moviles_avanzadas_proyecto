import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../context/UserContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const ConsultasScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todas'); // todas, programada, completada, cancelada

  useEffect(() => {
    loadConsultas();
  }, []);

  const loadConsultas = async () => {
    try {
      setLoading(true);
      const result = await db.getAllAsync(
        `SELECT c.*, m.nombre as medicoNombre, m.especialidad, m.fotoPerfil as medicoFoto
         FROM consultas c
         JOIN medicos m ON c.medicoId = m.id
         WHERE c.pacienteId = ?
         ORDER BY c.fecha DESC, c.hora DESC`,
        [user.id]
      );
      setConsultas(result);
    } catch (error) {
      console.error('Error cargando consultas:', error);
      Alert.alert('Error', 'No se pudieron cargar las consultas');
    } finally {
      setLoading(false);
    }
  };

  const cancelarConsulta = async (consultaId) => {
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
              await db.runAsync(
                'UPDATE consultas SET estado = ? WHERE id = ?',
                ['cancelada', consultaId]
              );
              loadConsultas();
              Alert.alert('Éxito', 'Consulta cancelada correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar la consulta');
            }
          }
        }
      ]
    );
  };

  const calificarConsulta = async (consultaId) => {
    // Aquí se podría abrir un modal para calificar
    Alert.alert('Calificar', 'Funcionalidad de calificación próximamente');
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
        onPress={() => navigation.navigate('DetalleConsulta', { consulta: item })}
      >
        <View style={styles.consultaHeader}>
          <View style={styles.medicoInfo}>
            <Text style={styles.medicoNombre}>{item.medicoNombre}</Text>
            <Text style={styles.especialidad}>{item.especialidad}</Text>
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
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => cancelarConsulta(item.id)}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color="#F44336" />
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          )}
          {item.estado === 'completada' && !item.calificacion && (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => calificarConsulta(item.id)}
            >
              <MaterialCommunityIcons name="star" size={20} color="#FFA500" />
              <Text style={styles.rateButtonText}>Calificar</Text>
            </TouchableOpacity>
          )}
          {item.estado === 'completada' && (
            <TouchableOpacity
              style={styles.verRecetaButton}
              onPress={() => navigation.navigate('Recetas', { consultaId: item.id })}
            >
              <MaterialCommunityIcons name="file-document" size={20} color="#2196F3" />
              <Text style={styles.verRecetaText}>Ver Receta</Text>
            </TouchableOpacity>
          )}
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
            <TouchableOpacity
              style={styles.agendarButton}
              onPress={() => navigation.navigate('BusquedaMedicos')}
            >
              <Text style={styles.agendarButtonText}>Agendar Consulta</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('BusquedaMedicos')}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
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
  medicoInfo: {
    flex: 1,
  },
  medicoNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  especialidad: {
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
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  cancelButtonText: {
    marginLeft: 6,
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  rateButtonText: {
    marginLeft: 6,
    color: '#FFA500',
    fontSize: 14,
    fontWeight: '600',
  },
  verRecetaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  verRecetaText: {
    marginLeft: 6,
    color: '#2196F3',
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
  agendarButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  agendarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default ConsultasScreen;

