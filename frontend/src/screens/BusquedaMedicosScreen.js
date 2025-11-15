import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../context/UserContext';

const BusquedaMedicosScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const [medicos, setMedicos] = useState([]);
  const [medicosFiltrados, setMedicosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroIdioma, setFiltroIdioma] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('calificacion'); // calificacion, precio, nombre

  const especialidades = [
    'Medicina General',
    'Cardiología',
    'Dermatología',
    'Pediatría',
    'Ginecología',
    'Neurología',
    'Psiquiatría',
    'Oftalmología',
    'Otorrinolaringología',
    'Traumatología'
  ];

  const idiomas = ['Español', 'Inglés', 'Francés', 'Portugués'];

  useEffect(() => {
    loadMedicos();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [busqueda, filtroEspecialidad, filtroIdioma, ordenarPor, medicos]);

  const loadMedicos = async () => {
    try {
      setLoading(true);
      // Cargar médicos desde la tabla usuarios con rol 'medico'
      const usuariosMedicos = await db.getAllAsync(
        'SELECT * FROM usuarios WHERE rol = ? AND activo = 1',
        ['medico']
      );
      
      // También intentar cargar de la tabla medicos (por compatibilidad)
      let medicosTabla = [];
      try {
        medicosTabla = await db.getAllAsync(
          'SELECT * FROM medicos WHERE activo = 1'
        );
      } catch (e) {
        console.log('Tabla medicos vacía o no existe');
      }
      
      // Combinar y mapear usuarios médicos al formato esperado
      const medicosMapeados = usuariosMedicos.map(u => {
        // Buscar si tiene datos adicionales en tabla medicos
        const medicoTabla = medicosTabla.find(m => m.firebaseUid === u.firebaseUid);
        return {
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          telefono: u.telefono,
          especialidad: medicoTabla?.especialidad || 'Medicina General',
          subespecialidad: medicoTabla?.subespecialidad || null,
          numeroLicencia: medicoTabla?.numeroLicencia || null,
          experiencia: medicoTabla?.experiencia || null,
          idiomas: medicoTabla?.idiomas || 'Español',
          direccion: u.direccion || medicoTabla?.direccion || '',
          ciudad: u.ciudad || medicoTabla?.ciudad || '',
          latitud: u.latitud || medicoTabla?.latitud || null,
          longitud: u.longitud || medicoTabla?.longitud || null,
          disponible: medicoTabla?.disponible !== undefined ? medicoTabla.disponible : 1,
          calificacion: medicoTabla?.calificacion || 0,
          totalCalificaciones: medicoTabla?.totalCalificaciones || 0,
          fotoPerfil: u.fotoPerfil || medicoTabla?.fotoPerfil || '',
          biografia: medicoTabla?.biografia || null,
          precioConsulta: medicoTabla?.precioConsulta || null,
          fechaRegistro: u.fechaRegistro,
          firebaseUid: u.firebaseUid,
          activo: u.activo
        };
      });
      
      // Combinar con médicos de la tabla medicos (evitar duplicados)
      const todosMedicos = [...medicosMapeados];
      medicosTabla.forEach(m => {
        if (!todosMedicos.find(med => med.firebaseUid === m.firebaseUid)) {
          todosMedicos.push(m);
        }
      });
      
      setMedicos(todosMedicos);
      setMedicosFiltrados(todosMedicos);
    } catch (error) {
      console.error('Error cargando médicos:', error);
      Alert.alert('Error', 'No se pudieron cargar los médicos');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let filtrados = [...medicos];

    // Filtro por búsqueda de texto
    if (busqueda.trim()) {
      filtrados = filtrados.filter(medico =>
        medico.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        medico.especialidad.toLowerCase().includes(busqueda.toLowerCase()) ||
        (medico.ciudad && medico.ciudad.toLowerCase().includes(busqueda.toLowerCase()))
      );
    }

    // Filtro por especialidad
    if (filtroEspecialidad) {
      filtrados = filtrados.filter(medico => medico.especialidad === filtroEspecialidad);
    }

    // Filtro por idioma
    if (filtroIdioma) {
      filtrados = filtrados.filter(medico =>
        medico.idiomas && medico.idiomas.includes(filtroIdioma)
      );
    }

    // Ordenar
    filtrados.sort((a, b) => {
      switch (ordenarPor) {
        case 'calificacion':
          return b.calificacion - a.calificacion;
        case 'precio':
          return (a.precioConsulta || 0) - (b.precioConsulta || 0);
        case 'nombre':
          return a.nombre.localeCompare(b.nombre);
        default:
          return 0;
      }
    });

    setMedicosFiltrados(filtrados);
  };

  const renderMedico = ({ item }) => (
    <View style={styles.medicoCard}>
      <View style={styles.medicoHeader}>
        <View style={styles.medicoInfo}>
          <Text style={styles.medicoNombre}>{item.nombre}</Text>
          <Text style={styles.medicoEspecialidad}>{item.especialidad}</Text>
          {item.subespecialidad && (
            <Text style={styles.medicoSubespecialidad}>{item.subespecialidad}</Text>
          )}
        </View>
        <View style={styles.medicoRating}>
          <MaterialCommunityIcons name="star" size={20} color="#FFA500" />
          <Text style={styles.ratingText}>
            {item.calificacion ? item.calificacion.toFixed(1) : 'N/A'}
          </Text>
        </View>
      </View>
      
      {item.ciudad && (
        <View style={styles.medicoLocation}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
          <Text style={styles.locationText}>{item.ciudad}</Text>
        </View>
      )}

      {item.idiomas && (
        <View style={styles.medicoIdiomas}>
          <MaterialCommunityIcons name="translate" size={16} color="#666" />
          <Text style={styles.idiomasText}>{item.idiomas}</Text>
        </View>
      )}

      <View style={styles.medicoFooter}>
        <Text style={styles.precioText}>
          ${item.precioConsulta ? item.precioConsulta.toFixed(2) : 'N/A'}
        </Text>
        <View style={styles.medicoActions}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => {
              // Navegar a conversaciones y abrir chat con el médico
              navigation.navigate('Conversaciones', { abrirChatCon: item });
            }}
          >
            <MaterialCommunityIcons name="message-text" size={18} color="#9C27B0" />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.agendarButton}
            onPress={() => {
              // Navegar a agendar cita con el médico seleccionado
              navigation.navigate('AgendarCita', { medico: item });
            }}
          >
            <MaterialCommunityIcons name="calendar-check" size={18} color="#fff" />
            <Text style={styles.agendarButtonText}>Agendar Cita</Text>
          </TouchableOpacity>
        </View>
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
          placeholder="Buscar médico, especialidad o ciudad..."
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filtroEspecialidad === '' && styles.filterChipActive]}
          onPress={() => setFiltroEspecialidad('')}
        >
          <Text style={styles.filterChipText}>Todas</Text>
        </TouchableOpacity>
        {especialidades.map((esp, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.filterChip, filtroEspecialidad === esp && styles.filterChipActive]}
            onPress={() => setFiltroEspecialidad(esp)}
          >
            <Text style={styles.filterChipText}>{esp}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Ordenar por:</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, ordenarPor === 'calificacion' && styles.sortButtonActive]}
            onPress={() => setOrdenarPor('calificacion')}
          >
            <Text style={styles.sortButtonText}>Calificación</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, ordenarPor === 'precio' && styles.sortButtonActive]}
            onPress={() => setOrdenarPor('precio')}
          >
            <Text style={styles.sortButtonText}>Precio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, ordenarPor === 'nombre' && styles.sortButtonActive]}
            onPress={() => setOrdenarPor('nombre')}
          >
            <Text style={styles.sortButtonText}>Nombre</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={medicosFiltrados}
        renderItem={renderMedico}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="doctor" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No se encontraron médicos</Text>
            <Text style={styles.emptySubtext}>Intenta ajustar tus filtros de búsqueda</Text>
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
  filtersContainer: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
  },
  filterChipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  sortButtons: {
    flexDirection: 'row',
    flex: 1,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#2196F3',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
    marginBottom: 10,
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
  medicoLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666',
  },
  medicoIdiomas: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  idiomasText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666',
  },
  medicoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  precioText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  medicoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chatButtonText: {
    color: '#9C27B0',
    fontSize: 14,
    fontWeight: '600',
  },
  agendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  agendarButtonText: {
    color: '#fff',
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
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
});

export default BusquedaMedicosScreen;

