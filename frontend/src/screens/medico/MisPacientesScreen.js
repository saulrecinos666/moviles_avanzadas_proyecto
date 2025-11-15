import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../../context/UserContext';
import RoleService from '../../services/RoleService';

const MisPacientesScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const userRole = user?.rol || 'medico';
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    // Validar permisos
    if (!RoleService.canPerformAction(userRole, 'ver_pacientes')) {
      Alert.alert(
        'Acceso Denegado',
        'No tienes permisos para ver pacientes.',
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
    loadPacientes();
  }, [userRole]);

  const loadPacientes = async () => {
    try {
      setLoading(true);
      console.log('Cargando pacientes para médico:', user?.email, user?.id);
      
      // Obtener ID del médico desde usuarios
      const medicoUsuario = await db.getFirstAsync(
        'SELECT id FROM usuarios WHERE (firebaseUid = ? OR email = ?) AND rol = ?',
        [user.id, user.email, 'medico']
      );
      
      if (!medicoUsuario) {
        console.log('Médico no encontrado en usuarios');
        setPacientes([]);
        setLoading(false);
        return;
      }
      
      // Obtener también el ID de la tabla medicos si existe
      let medicoTabla = null;
      try {
        medicoTabla = await db.getFirstAsync(
          'SELECT id FROM medicos WHERE firebaseUid = ? OR email = ?',
          [user.id, user.email]
        );
      } catch (e) {
        console.log('No se pudo buscar en tabla medicos:', e);
      }
      
      // Obtener pacientes únicos que tienen consultas con este médico
      // Buscar con todos los IDs posibles del médico
      const medicoIdsPosibles = [medicoUsuario.id];
      if (medicoTabla && medicoTabla.id) {
        medicoIdsPosibles.push(medicoTabla.id);
      }
      
      // Primero buscar las consultas directamente
      const placeholders = medicoIdsPosibles.map(() => '?').join(',');
      const consultasDelMedico = await db.getAllAsync(
        `SELECT DISTINCT pacienteId 
         FROM consultas 
         WHERE medicoId IN (${placeholders})`,
        medicoIdsPosibles
      );
      
      console.log('Consultas encontradas para el médico:', consultasDelMedico?.length || 0);
      
      let pacientesConConsultas = [];
      
      if (consultasDelMedico && consultasDelMedico.length > 0) {
        // Obtener los IDs de pacientes únicos
        const pacienteIds = [...new Set(consultasDelMedico.map(c => c.pacienteId).filter(Boolean))];
        console.log('IDs de pacientes encontrados:', pacienteIds);
        
        // Buscar pacientes - el pacienteId puede ser id numérico o firebaseUid string
        for (const pacienteId of pacienteIds) {
          // Intentar buscar por id numérico
          let paciente = null;
          if (!isNaN(pacienteId) && pacienteId.toString() === parseInt(pacienteId).toString()) {
            paciente = await db.getFirstAsync(
              'SELECT * FROM usuarios WHERE id = ? AND rol = ? AND activo = 1',
              [parseInt(pacienteId), 'paciente']
            );
          }
          
          // Si no se encontró, buscar por firebaseUid
          if (!paciente) {
            paciente = await db.getFirstAsync(
              'SELECT * FROM usuarios WHERE firebaseUid = ? AND rol = ? AND activo = 1',
              [pacienteId.toString(), 'paciente']
            );
          }
          
          if (paciente) {
            // Obtener estadísticas de consultas
            const stats = await db.getFirstAsync(
              `SELECT COUNT(*) as totalConsultas, MAX(fecha) as ultimaConsulta
               FROM consultas 
               WHERE (pacienteId = ? OR pacienteId = ?) AND medicoId IN (${placeholders})`,
              [paciente.id, paciente.firebaseUid, ...medicoIdsPosibles]
            );
            
            pacientesConConsultas.push({
              ...paciente,
              totalConsultas: stats?.totalConsultas || 0,
              ultimaConsulta: stats?.ultimaConsulta || null
            });
          }
        }
        
        // Ordenar por última consulta
        pacientesConConsultas.sort((a, b) => {
          if (!a.ultimaConsulta) return 1;
          if (!b.ultimaConsulta) return -1;
          return new Date(b.ultimaConsulta) - new Date(a.ultimaConsulta);
        });
      }
      
      console.log('Pacientes con consultas encontrados:', pacientesConConsultas?.length || 0);
      
      // Si no hay resultados, buscar todas las consultas para debug
      if (!pacientesConConsultas || pacientesConConsultas.length === 0) {
        const todasLasConsultas = await db.getAllAsync('SELECT DISTINCT medicoId, pacienteId FROM consultas LIMIT 10');
        console.log('Primeras 10 consultas (medicoId, pacienteId):', todasLasConsultas);
        console.log('ID del médico buscando:', medicoUsuario.id);
      }
      
      setPacientes(pacientesConConsultas || []);
    } catch (error) {
      console.error('Error cargando pacientes:', error);
      // Si falla la consulta con JOIN, intentar método alternativo
      try {
        const consultas = await db.getAllAsync(
          'SELECT DISTINCT pacienteId FROM consultas WHERE medicoId = (SELECT id FROM usuarios WHERE (firebaseUid = ? OR email = ?) AND rol = ?)',
          [user.id, user.email, 'medico']
        );
        
        if (consultas && consultas.length > 0) {
          const pacienteIds = consultas.map(c => c.pacienteId).filter(Boolean);
          const placeholders = pacienteIds.map(() => '?').join(',');
          const pacientes = await db.getAllAsync(
            `SELECT * FROM usuarios WHERE id IN (${placeholders}) AND rol = ? AND activo = 1 ORDER BY nombre`,
            [...pacienteIds, 'paciente']
          );
          setPacientes(pacientes || []);
        } else {
          setPacientes([]);
        }
      } catch (e2) {
        console.error('Error en método alternativo:', e2);
        Alert.alert('Error', 'No se pudieron cargar los pacientes');
        setPacientes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const pacientesFiltrados = busqueda.trim()
    ? pacientes.filter(p => 
        p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.email?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : pacientes;

  const verHistorialPaciente = (paciente) => {
    // Navegar a historial del paciente (si existe esa pantalla)
    Alert.alert('Historial', `Ver historial de ${paciente.nombre}`);
  };

  const iniciarChat = (paciente) => {
    navigation.navigate('Conversaciones', { 
      abrirChatCon: {
        id: paciente.id,
        nombre: paciente.nombre,
        firebaseUid: paciente.firebaseUid
      }
    });
  };

  const renderPaciente = ({ item }) => (
    <TouchableOpacity
      style={styles.pacienteCard}
      onPress={() => verHistorialPaciente(item)}
    >
      <View style={styles.pacienteHeader}>
        <View style={styles.pacienteInfo}>
          <Text style={styles.pacienteNombre}>{item.nombre}</Text>
          <Text style={styles.pacienteEmail}>{item.email}</Text>
          {item.telefono && (
            <Text style={styles.pacienteTelefono}>
              <MaterialCommunityIcons name="phone" size={14} color="#666" /> {item.telefono}
            </Text>
          )}
        </View>
        <View style={styles.consultasBadge}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color="#2196F3" />
          <Text style={styles.consultasText}>{item.totalConsultas || 0}</Text>
        </View>
      </View>

      {item.ultimaConsulta && (
        <View style={styles.ultimaConsulta}>
          <MaterialCommunityIcons name="clock-outline" size={14} color="#999" />
          <Text style={styles.ultimaConsultaText}>
            Última consulta: {new Date(item.ultimaConsulta).toLocaleDateString('es-ES')}
          </Text>
        </View>
      )}

      <View style={styles.pacienteActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => verHistorialPaciente(item)}
        >
          <MaterialCommunityIcons name="clipboard-text" size={18} color="#2196F3" />
          <Text style={styles.actionButtonText}>Historial</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => iniciarChat(item)}
        >
          <MaterialCommunityIcons name="message-text" size={18} color="#2196F3" />
          <Text style={styles.actionButtonText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando pacientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar paciente..."
          value={busqueda}
          onChangeText={setBusqueda}
          placeholderTextColor="#999"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <MaterialCommunityIcons name="close-circle" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={pacientesFiltrados}
        renderItem={renderPaciente}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No tienes pacientes asignados</Text>
            <Text style={styles.emptySubtext}>
              Los pacientes aparecerán aquí cuando agenden consultas contigo
            </Text>
          </View>
        }
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    padding: 15,
  },
  pacienteCard: {
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
  pacienteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
  pacienteEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pacienteTelefono: {
    fontSize: 13,
    color: '#666',
  },
  consultasBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  consultasText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  ultimaConsulta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  ultimaConsultaText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#999',
  },
  pacienteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginLeft: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
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
});

export default MisPacientesScreen;
