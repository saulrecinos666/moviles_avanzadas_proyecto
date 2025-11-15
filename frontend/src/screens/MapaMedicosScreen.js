import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Servicios de ubicación deshabilitados',
          'Por favor, habilita los servicios de ubicación en la configuración de tu dispositivo para usar esta función.',
          [{ text: 'OK' }]
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso de ubicación',
          'Necesitamos tu ubicación para mostrarte los médicos cercanos. Por favor, permite el acceso a la ubicación en la configuración de la app.',
          [{ text: 'OK' }]
        );
        return;
      }

      let location;
      let locationError = null;
      
      try {
        console.log('📍 Intentando obtener ubicación con precisión alta...');
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 15000,
          maximumAge: 60000,
        });
        console.log('✅ Ubicación obtenida:', location.coords);
      } catch (highAccuracyError) {
        console.log('⚠️ Error con precisión alta, intentando con precisión baja...', highAccuracyError);
        locationError = highAccuracyError;
        
        try {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeout: 20000,
            maximumAge: 300000, // 5 minutos
          });
          console.log('✅ Ubicación obtenida con precisión baja:', location.coords);
        } catch (lowAccuracyError) {
          console.log('⚠️ Error con precisión baja, intentando con precisión más baja...', lowAccuracyError);
          
          try {
            location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Lowest,
              timeout: 25000,
              maximumAge: 600000, // 10 minutos
            });
            console.log('✅ Ubicación obtenida con precisión más baja:', location.coords);
          } catch (lowestAccuracyError) {
            console.error('❌ Error obteniendo ubicación con todos los métodos:', lowestAccuracyError);
            throw lowestAccuracyError;
          }
        }
      }
      
      if (!location || !location.coords) {
        throw new Error('No se pudo obtener la ubicación después de múltiples intentos');
      }

      const { latitude, longitude } = location.coords;
      
      if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
        throw new Error('Coordenadas de ubicación inválidas');
      }
      
      console.log('✅ Coordenadas válidas:', { latitude, longitude });
      
      setUserLocation({ latitude, longitude });
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      const errorMessage = error.message || 'Error desconocido';
      if (errorMessage.includes('location services') || errorMessage.includes('unavailable')) {
        Alert.alert(
          'Ubicación no disponible',
          'No se pudo obtener tu ubicación. Verifica que:\n\n• Los servicios de ubicación estén habilitados\n• La app tenga permisos de ubicación\n• Estés en un lugar con buena señal GPS',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error de ubicación',
          'No se pudo obtener tu ubicación. Intenta nuevamente más tarde.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const loadMedicos = async () => {
    try {
      setLoading(true);
      const todosUsuariosMedicos = await db.getAllAsync(
        `SELECT * FROM usuarios 
         WHERE rol = ? 
         AND activo = 1`,
        ['medico']
      );
      
      const usuariosMedicos = todosUsuariosMedicos.filter(u => 
        u.latitud !== null && 
        u.latitud !== undefined && 
        u.longitud !== null && 
        u.longitud !== undefined
      );
      
      console.log(`📊 Total médicos: ${todosUsuariosMedicos.length}, Con ubicación: ${usuariosMedicos.length}`);
      
      let medicosTabla = [];
      try {
        medicosTabla = await db.getAllAsync(
          `SELECT * FROM medicos 
           WHERE activo = 1 
           AND disponible = 1
           AND latitud IS NOT NULL 
           AND longitud IS NOT NULL`
        );
      } catch (e) {
        console.log('Tabla medicos vacía o no existe');
      }
      
      const todosMedicos = [];
      
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
      
      usuariosMedicos.forEach(u => {
        if (u.latitud && u.longitud && !todosMedicos.find(med => med.firebaseUid === u.firebaseUid)) {
          const medicoTabla = medicosTabla.find(m => m.firebaseUid === u.firebaseUid);
          todosMedicos.push({
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            telefono: u.telefono,
            especialidad: medicoTabla?.especialidad || 'Medicina General',
            direccion: u.direccion || medicoTabla?.direccion || '',
            ciudad: u.ciudad || medicoTabla?.ciudad || '',
            latitud: u.latitud,
            longitud: u.longitud,
            disponible: medicoTabla?.disponible !== undefined ? medicoTabla.disponible : 1,
            calificacion: medicoTabla?.calificacion || 0,
            fotoPerfil: u.fotoPerfil || '',
            firebaseUid: u.firebaseUid,
            activo: u.activo
          });
        }
      });
      
      const medicosConUbicacion = todosMedicos.filter(m => 
        m.latitud && m.longitud && 
        !isNaN(parseFloat(m.latitud)) && 
        !isNaN(parseFloat(m.longitud))
      );
      
      setMedicos(medicosConUbicacion);
      console.log(`✅ Cargados ${medicosConUbicacion.length} médico(s) con ubicación`);
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
        {medicos.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons name="map-marker-off" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No hay médicos con ubicación</Text>
            <Text style={styles.emptyStateText}>
              Los médicos deben guardar su ubicación en su perfil para aparecer en el mapa.{'\n\n'}
              Ve a tu perfil como médico y toca "Guardar Mi Ubicación" para que los pacientes puedan encontrarte.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.loadingText}>Mapa temporalmente deshabilitado</Text>
            <Text style={styles.loadingText}>{medicos.length} médico(s) disponible(s)</Text>
          </>
        )}
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
  userAvatarContainer: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
  },
  userAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  controlsContainer: {
    position: 'absolute',
    right: 15,
    top: 75,
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

