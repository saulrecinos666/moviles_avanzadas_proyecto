import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { MapView, Marker } from 'expo-maps';
import * as Location from 'expo-location';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../context/UserContext';

const MapaMedicosScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const [medicos, setMedicos] = useState([]);
  const [region, setRegion] = useState({
    latitude: 19.432608,
    longitude: -99.133209,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    requestLocationPermission();
    loadMedicos();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso de ubicación',
          'Necesitamos tu ubicación para mostrarte los médicos cercanos',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
    }
  };

  const loadMedicos = async () => {
    try {
      setLoading(true);
      // Cargar médicos desde la tabla usuarios con rol 'medico'
      const usuariosMedicos = await db.getAllAsync(
        `SELECT * FROM usuarios 
         WHERE rol = ? 
         AND activo = 1`,
        ['medico']
      );
      
      // Cargar de la tabla medicos que tiene latitud/longitud
      let medicosTabla = [];
      try {
        medicosTabla = await db.getAllAsync(
          `SELECT * FROM medicos 
           WHERE activo = 1 
           AND disponible = 1`
        );
      } catch (e) {
        console.log('Tabla medicos vacía o no existe');
      }
      
      // Combinar: usar medicos de tabla medicos si tienen ubicación, sino usar usuarios
      const todosMedicos = [];
      
      // Primero agregar médicos con ubicación de la tabla medicos
      medicosTabla.forEach(m => {
        if (m.latitud && m.longitud) {
          todosMedicos.push({
            id: m.id,
            nombre: m.nombre,
            email: m.email,
            telefono: m.telefono,
            especialidad: m.especialidad || 'Medicina General',
            direccion: m.direccion || '',
            ciudad: m.ciudad || '',
            latitud: m.latitud,
            longitud: m.longitud,
            disponible: m.disponible,
            calificacion: m.calificacion || 0,
            fotoPerfil: m.fotoPerfil || '',
            firebaseUid: m.firebaseUid,
            activo: m.activo
          });
        }
      });
      
      // Agregar médicos de usuarios que no estén ya en la lista
      usuariosMedicos.forEach(u => {
        if (!todosMedicos.find(med => med.firebaseUid === u.firebaseUid)) {
          // Buscar si tiene ubicación en tabla medicos
          const medicoConUbicacion = medicosTabla.find(m => m.firebaseUid === u.firebaseUid);
          todosMedicos.push({
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            telefono: u.telefono,
            especialidad: 'Medicina General',
            direccion: u.direccion || '',
            ciudad: u.ciudad || '',
            latitud: medicoConUbicacion?.latitud || null,
            longitud: medicoConUbicacion?.longitud || null,
            disponible: 1,
            calificacion: 0,
            fotoPerfil: u.fotoPerfil || '',
            firebaseUid: u.firebaseUid,
            activo: u.activo
          });
        }
      });
      
      // Filtrar solo los que tienen ubicación
      const medicosConUbicacion = todosMedicos.filter(m => m.latitud && m.longitud);
      
      setMedicos(medicosConUbicacion);
    } catch (error) {
      console.error('Error cargando médicos:', error);
      Alert.alert('Error', 'No se pudieron cargar los médicos');
    } finally {
      setLoading(false);
    }
  };

  const irAUsuario = () => {
    if (userLocation) {
      setRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  // const renderMedico = (medico) => {
  //   if (!medico.latitud || !medico.longitud) return null;

  //   return (
  //     <Marker
  //       key={medico.id}
  //       coordinate={{
  //         latitude: parseFloat(medico.latitud),
  //         longitude: parseFloat(medico.longitud),
  //       }}
  //       title={medico.nombre}
  //       description={medico.especialidad}
  //       onPress={() => navigation.navigate('DetalleMedico', { medico })}
  //     >
  //       <View style={styles.markerContainer}>
  //         <MaterialCommunityIcons name="doctor" size={32} color="#2196F3" />
  //         <View style={styles.markerBadge}>
  //           <Text style={styles.markerRating}>
  //             {medico.calificacion ? medico.calificacion.toFixed(1) : 'N/A'}
  //           </Text>
  //         </View>
  //       </View>
  //     </Marker>
  //   );
  // };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <Text style={styles.loadingText}>Mapa temporalmente deshabilitado</Text>
        <Text style={styles.loadingText}>{medicos.length} médico(s) disponible(s)</Text>
      </View>
      {/* <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {medicos.map(medico => renderMedico(medico))}
      </MapView> */}

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={irAUsuario}
          disabled={!userLocation}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={loadMedicos}
        >
          <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {medicos.length} médico(s) disponible(s) en el mapa
        </Text>
        <TouchableOpacity
          style={styles.listButton}
          onPress={() => navigation.navigate('BusquedaMedicos')}
        >
          <MaterialCommunityIcons name="format-list-bulleted" size={20} color="#2196F3" />
          <Text style={styles.listButtonText}>Ver Lista</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBadge: {
    backgroundColor: '#FFA500',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  markerRating: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  controlsContainer: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  listButtonText: {
    marginLeft: 6,
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MapaMedicosScreen;

