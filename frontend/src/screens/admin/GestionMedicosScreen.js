import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../../context/UserContext';
import RoleService from '../../services/RoleService';

const GestionMedicosScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const userRole = user?.rol || 'admin';
  const [medicos, setMedicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    // Validar permisos
    if (!RoleService.canPerformAction(userRole, 'gestionar_medicos')) {
      Alert.alert(
        'Acceso Denegado',
        'No tienes permisos para gestionar médicos.',
        [
          {
            text: 'OK',
            onPress: () => {
              const redirectScreen = RoleService.isMedico(userRole) 
                ? 'DashboardMedico' 
                : 'Dashboard';
              navigation.replace(redirectScreen);
            }
          }
        ]
      );
      return;
    }
    loadMedicos();
  }, [userRole]);

  const loadMedicos = async () => {
    try {
      setLoading(true);
      // Cargar médicos desde la tabla usuarios con rol 'medico'
      const usuariosMedicos = await db.getAllAsync(
        'SELECT * FROM usuarios WHERE rol = ? AND activo = 1 ORDER BY fechaRegistro DESC',
        ['medico']
      );
      
      // También intentar cargar de la tabla medicos (por compatibilidad)
      let medicosTabla = [];
      try {
        medicosTabla = await db.getAllAsync(
          'SELECT * FROM medicos WHERE activo = 1 ORDER BY fechaRegistro DESC'
        );
      } catch (e) {
        console.log('Tabla medicos vacía o no existe');
      }
      
      // Combinar y mapear usuarios médicos al formato esperado
      const medicosMapeados = usuariosMedicos.map(u => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        telefono: u.telefono,
        especialidad: 'Medicina General', // Valor por defecto
        subespecialidad: null,
        numeroLicencia: null,
        experiencia: null,
        idiomas: 'Español',
        direccion: u.direccion || '',
        ciudad: u.ciudad || '',
        disponible: 1,
        calificacion: 0,
        totalCalificaciones: 0,
        fotoPerfil: u.fotoPerfil || '',
        biografia: null,
        precioConsulta: null,
        fechaRegistro: u.fechaRegistro,
        firebaseUid: u.firebaseUid,
        activo: u.activo
      }));
      
      // Combinar con médicos de la tabla medicos (evitar duplicados)
      const todosMedicos = [...medicosMapeados];
      medicosTabla.forEach(m => {
        if (!todosMedicos.find(med => med.firebaseUid === m.firebaseUid)) {
          todosMedicos.push(m);
        }
      });
      
      setMedicos(todosMedicos);
    } catch (error) {
      console.error('Error cargando médicos:', error);
      Alert.alert('Error', 'No se pudieron cargar los médicos');
    } finally {
      setLoading(false);
    }
  };

  const desactivarMedico = async (medicoId, nombre) => {
    if (!RoleService.canPerformAction(userRole, 'gestionar_medicos')) {
      Alert.alert('Error', 'No tienes permisos para desactivar médicos');
      return;
    }

    Alert.alert(
      'Desactivar Médico',
      `¿Estás seguro de desactivar a ${nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(
                'UPDATE medicos SET activo = 0 WHERE id = ?',
                [medicoId]
              );
              loadMedicos();
              Alert.alert('Éxito', 'Médico desactivado correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo desactivar el médico');
            }
          }
        }
      ]
    );
  };

  const medicosFiltrados = busqueda.trim()
    ? medicos.filter(m => 
        m.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.especialidad?.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.email?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : medicos;

  const renderMedico = ({ item }) => (
    <View style={styles.medicoCard}>
      <View style={styles.medicoHeader}>
        <View style={styles.medicoInfo}>
          <Text style={styles.medicoNombre}>{item.nombre}</Text>
          <Text style={styles.medicoEspecialidad}>{item.especialidad}</Text>
          {item.subespecialidad && (
            <Text style={styles.medicoSubespecialidad}>{item.subespecialidad}</Text>
          )}
          <Text style={styles.medicoEmail}>{item.email}</Text>
          {item.numeroLicencia && (
            <Text style={styles.medicoLicencia}>
              <MaterialCommunityIcons name="certificate" size={14} color="#666" /> 
              {' '}Licencia: {item.numeroLicencia}
            </Text>
          )}
        </View>
        <View style={styles.medicoRating}>
          <MaterialCommunityIcons name="star" size={20} color="#FFA500" />
          <Text style={styles.ratingText}>
            {item.calificacion ? item.calificacion.toFixed(1) : 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.medicoActions}>
        <TouchableOpacity
          style={styles.desactivarButton}
          onPress={() => desactivarMedico(item.id, item.nombre)}
        >
          <MaterialCommunityIcons name="account-remove" size={18} color="#F44336" />
          <Text style={styles.desactivarButtonText}>Desactivar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando médicos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar médico..."
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
        data={medicosFiltrados}
        renderItem={renderMedico}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="doctor" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay médicos registrados</Text>
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
  medicoCard: {
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
  medicoHeader: {
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
  medicoEspecialidad: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 2,
  },
  medicoSubespecialidad: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  medicoEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  medicoLicencia: {
    fontSize: 12,
    color: '#666',
  },
  medicoRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFA500',
  },
  medicoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  desactivarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 20,
  },
  desactivarButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
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
});

export default GestionMedicosScreen;
