import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Switch,
  Linking,
  Platform,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/NotificationService';
import { updateUserInSQLite } from '../db/userHelper';
import RoleService from '../services/RoleService';

const PerfilScreen = ({ navigation }) => {
  const { user, updateUser, logout, reloadUser } = useUser();
  const db = useSQLiteContext();
  const [showModal, setShowModal] = useState(false);
  const [perfilData, setPerfilData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
    genero: '',
    altura: '',
    peso: ''
  });
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fechaNacimiento, setFechaNacimiento] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [ubicacionGuardada, setUbicacionGuardada] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAyudaModal, setShowAyudaModal] = useState(false);
  const [showAcercaModal, setShowAcercaModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showPrivacidadModal, setShowPrivacidadModal] = useState(false);
  const [showIdiomaModal, setShowIdiomaModal] = useState(false);
  
  // Estados de configuración
  const [notificaciones, setNotificaciones] = useState(true);
  const [notificacionesConsultas, setNotificacionesConsultas] = useState(true);
  const [notificacionesRecordatorios, setNotificacionesRecordatorios] = useState(true);
  const [compartirDatos, setCompartirDatos] = useState(false);
  const [idioma, setIdioma] = useState('Español');

  const generos = ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir'];
  const idiomas = ['Español', 'English', 'Français', 'Português'];

  useEffect(() => {
    if (user) {
      setPerfilData({
        nombre: user.nombre || '',
        email: user.email || '',
        telefono: user.telefono || '',
        fechaNacimiento: user.fechaNacimiento || '',
        genero: user.genero || '',
        altura: user.altura ? user.altura.toString() : '',
        peso: user.peso ? user.peso.toString() : ''
      });
      setFotoPerfil(user.fotoPerfil || null);
      setUbicacionGuardada(!!(user.latitud && user.longitud));
      if (user.fechaNacimiento) {
        try {
          const fecha = new Date(user.fechaNacimiento);
          if (!isNaN(fecha.getTime())) {
            setFechaNacimiento(fecha);
          }
        } catch (error) {
          console.log('Error al parsear fecha:', error);
        }
      }
    }
    cargarConfiguracion();
  }, [user]);

  const cargarConfiguracion = async () => {
    try {
      const config = await AsyncStorage.getItem('appConfig');
      if (config) {
        const configData = JSON.parse(config);
        setNotificaciones(configData.notificaciones ?? true);
        setNotificacionesConsultas(configData.notificacionesConsultas ?? true);
        setNotificacionesRecordatorios(configData.notificacionesRecordatorios ?? true);
        setCompartirDatos(configData.compartirDatos ?? false);
        setIdioma(configData.idioma ?? 'Español');
        
        // Verificar si las notificaciones están realmente habilitadas en el sistema
        const areEnabled = await NotificationService.areNotificationsEnabled();
        if (configData.notificaciones && !areEnabled) {
          // Si el usuario quiere notificaciones pero no tiene permisos, intentar registrarlas
          await NotificationService.registerForPushNotificationsAsync();
        }
      } else {
        // Si no hay configuración, verificar permisos y registrar si es necesario
        const areEnabled = await NotificationService.areNotificationsEnabled();
        if (!areEnabled) {
          await NotificationService.registerForPushNotificationsAsync();
        }
      }
    } catch (error) {
      console.log('Error al cargar configuración:', error);
    }
  };

  const guardarConfiguracion = async () => {
    try {
      const configData = {
        notificaciones,
        notificacionesConsultas,
        notificacionesRecordatorios,
        compartirDatos,
        idioma
      };
      await AsyncStorage.setItem('appConfig', JSON.stringify(configData));
      
      // Aplicar configuración de notificaciones
      if (notificaciones) {
        // Registrar el dispositivo para notificaciones push
        const token = await NotificationService.registerForPushNotificationsAsync();
        if (token) {
          console.log('✅ Dispositivo registrado para notificaciones push');
        } else {
          Alert.alert(
            'Advertencia', 
            'No se pudieron habilitar las notificaciones. Verifica los permisos en la configuración del dispositivo.'
          );
        }
      } else {
        // Desactivar todas las notificaciones
        await NotificationService.cancelAllNotifications();
        console.log('✅ Notificaciones desactivadas');
      }
      
      Alert.alert('Éxito', 'Configuración guardada correctamente');
      setShowConfigModal(false);
    } catch (error) {
      console.log('Error al guardar configuración:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    }
  };

  const handleContactarSoporte = () => {
    Alert.alert(
      'Contactar Soporte',
      '¿Cómo deseas contactarnos?',
      [
        { text: 'Email', onPress: () => Linking.openURL('mailto:soporte@serviciosmedicos.com?subject=Soporte - Aplicación Médica') },
        { text: 'Teléfono', onPress: () => Linking.openURL('tel:+15551234567') },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const handleAbrirGuia = () => {
    Alert.alert(
      'Guía de Usuario',
      'La guía completa está disponible en:\n\nhttps://serviciosmedicos.com/guia',
      [
        { text: 'Abrir en navegador', onPress: () => Linking.openURL('https://serviciosmedicos.com/guia') },
        { text: 'Cerrar', style: 'cancel' }
      ]
    );
  };

  const handleGuardarPerfil = async () => {
    if (!perfilData.nombre || !perfilData.email) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    try {
      const datosActualizados = {
        ...perfilData,
        altura: parseFloat(perfilData.altura) || 0,
        peso: parseFloat(perfilData.peso) || 0,
        fechaNacimiento: fechaNacimiento.toISOString().split('T')[0],
        fotoPerfil: fotoPerfil || user?.fotoPerfil || ''
      };

      // Actualizar en AsyncStorage y Firebase
      const resultado = await updateUser(datosActualizados);
      
      // Intentar actualizar en SQLite si está disponible
      if (resultado.success && user?.id) {
        try {
          if (db) {
            const sqliteResult = await updateUserInSQLite(db, user.id, datosActualizados);
            if (!sqliteResult.success) {
              console.log('Advertencia: No se pudo actualizar en SQLite:', sqliteResult.error);
            }
          }
        } catch (sqliteError) {
          console.log('Error al actualizar en SQLite (no crítico):', sqliteError);
          // No bloquear la actualización si SQLite falla
        }
        
        // Recargar usuario para obtener datos actualizados
        try {
          await reloadUser();
        } catch (reloadError) {
          console.log('Error al recargar usuario:', reloadError);
        }
      }

      if (resultado.success) {
        Alert.alert('Éxito', 'Perfil actualizado correctamente');
        setIsEditing(false);
      } else {
        Alert.alert('Error', resultado.error || 'No se pudo actualizar el perfil');
      }
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil: ' + error.message);
    }
  };

  const handleSeleccionarImagen = async () => {
    try {
      // Solicitar permisos de galería primero
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libraryStatus !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      // Solicitar permisos de cámara también
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const hasCameraPermission = cameraStatus === 'granted';

      // Crear opciones del Alert
      const options = [
        {
          text: 'Galería',
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets && result.assets[0]) {
                await handleSubirImagen(result.assets[0].uri);
              }
            } catch (error) {
              console.error('Error al abrir galería:', error);
              Alert.alert('Error', 'No se pudo abrir la galería');
            }
          }
        }
      ];

      // Agregar opción de cámara solo si tiene permisos
      if (hasCameraPermission) {
        options.unshift({
          text: 'Cámara',
          onPress: async () => {
            try {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets && result.assets[0]) {
                await handleSubirImagen(result.assets[0].uri);
              }
            } catch (error) {
              console.error('Error al abrir cámara:', error);
              Alert.alert('Error', 'No se pudo abrir la cámara');
            }
          }
        });
      }

      // Agregar opción de cancelar
      options.push({
        text: 'Cancelar',
        style: 'cancel'
      });

      // Mostrar opciones
      Alert.alert(
        'Seleccionar Imagen',
        '¿De dónde deseas seleccionar la imagen?',
        options
      );
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen: ' + error.message);
    }
  };

  const handleSubirImagen = async (imageUri) => {
    try {
      setUploadingImage(true);
      
      // Por ahora, guardamos la URI local directamente
      // En producción, deberías subir la imagen a un servicio de almacenamiento (Firebase Storage, AWS S3, etc.)
      const datosActualizados = {
        fotoPerfil: imageUri
      };

      // Actualizar en AsyncStorage y Firebase
      const resultado = await updateUser(datosActualizados);
      
      // Intentar actualizar en SQLite si está disponible
      if (resultado.success && user?.id) {
        try {
          if (db) {
            await updateUserInSQLite(db, user.id, datosActualizados);
          }
        } catch (sqliteError) {
          console.log('Error al actualizar imagen en SQLite (no crítico):', sqliteError);
          // No bloquear la actualización si SQLite falla
        }
        
        try {
          await reloadUser();
        } catch (reloadError) {
          console.log('Error al recargar usuario:', reloadError);
        }
      }

      if (resultado.success) {
        setFotoPerfil(imageUri);
        Alert.alert('Éxito', 'Imagen de perfil actualizada');
      } else {
        Alert.alert('Error', 'No se pudo actualizar la imagen');
      }
    } catch (error) {
      console.error('Error al subir imagen:', error);
      Alert.alert('Error', 'No se pudo subir la imagen: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGuardarUbicacion = async () => {
    try {
      setSavingLocation(true);
      
      // Verificar si los servicios de ubicación están habilitados
      let servicesEnabled = false;
      try {
        servicesEnabled = await Location.hasServicesEnabledAsync();
      } catch (checkError) {
        console.log('Error verificando servicios de ubicación:', checkError);
        // Continuar de todas formas, algunos dispositivos pueden no soportar esta verificación
      }
      
      if (!servicesEnabled) {
        Alert.alert(
          'Servicios de ubicación deshabilitados',
          'Por favor, habilita los servicios de ubicación en la configuración de tu dispositivo para guardar tu ubicación.',
          [{ text: 'OK' }]
        );
        setSavingLocation(false);
        return;
      }
      
      // Solicitar permisos de ubicación
      let permissionStatus = 'undetermined';
      try {
        const permissionResult = await Location.requestForegroundPermissionsAsync();
        permissionStatus = permissionResult.status;
      } catch (permissionError) {
        console.log('Error solicitando permisos:', permissionError);
        Alert.alert(
          'Error de permisos',
          'No se pudieron solicitar los permisos de ubicación. Por favor, verifica la configuración de la app.',
          [{ text: 'OK' }]
        );
        setSavingLocation(false);
        return;
      }
      
      if (permissionStatus !== 'granted') {
        Alert.alert(
          'Permisos de ubicación',
          'Se necesitan permisos de ubicación para guardar tu ubicación. Por favor, permite el acceso en la configuración de la app.',
          [{ text: 'OK' }]
        );
        setSavingLocation(false);
        return;
      }

      // Obtener ubicación actual con opciones más robustas
      let location;
      let locationError = null;
      
      // Intentar primero con precisión alta
      try {
        console.log('📍 Intentando obtener ubicación con precisión alta...');
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 15000,
          maximumAge: 60000,
        });
        console.log('✅ Ubicación obtenida con precisión alta:', location.coords);
      } catch (highAccuracyError) {
        console.log('⚠️ Error con precisión alta, intentando con precisión baja...', highAccuracyError);
        locationError = highAccuracyError;
        
        // Intentar con precisión más baja
        try {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeout: 20000,
            maximumAge: 300000, // 5 minutos
          });
          console.log('✅ Ubicación obtenida con precisión baja:', location.coords);
        } catch (lowAccuracyError) {
          console.log('⚠️ Error con precisión baja, intentando con precisión más baja...', lowAccuracyError);
          
          // Último intento con precisión más baja posible
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
      
      // Validar que las coordenadas sean válidas
      if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
        throw new Error('Coordenadas de ubicación inválidas');
      }
      
      console.log('✅ Coordenadas válidas:', { latitude, longitude });

      // Guardar ubicación
      const datosActualizados = {
        latitud: latitude,
        longitud: longitude
      };

      // Actualizar en AsyncStorage y Firebase
      const resultado = await updateUser(datosActualizados);
      
      // Intentar actualizar en SQLite si está disponible
      if (resultado.success && user?.id) {
        try {
          if (db) {
            await updateUserInSQLite(db, user.id, datosActualizados);
          }
        } catch (sqliteError) {
          console.log('Error al actualizar ubicación en SQLite (no crítico):', sqliteError);
        }
        
        try {
          await reloadUser();
        } catch (reloadError) {
          console.log('Error al recargar usuario:', reloadError);
        }
      }

      if (resultado.success) {
        setUbicacionGuardada(true);
        Alert.alert(
          'Éxito', 
          `Ubicación guardada correctamente\nLatitud: ${latitude.toFixed(6)}\nLongitud: ${longitude.toFixed(6)}`
        );
      } else {
        Alert.alert('Error', 'No se pudo guardar la ubicación');
      }
    } catch (error) {
      console.error('Error al guardar ubicación:', error);
      const errorMessage = error?.message || error?.toString() || 'Error desconocido';
      
      // Mensajes de error más específicos
      if (errorMessage.includes('location services') || 
          errorMessage.includes('unavailable') ||
          errorMessage.includes('Location services are disabled') ||
          errorMessage.includes('Current location is unavailable')) {
        Alert.alert(
          'Ubicación no disponible',
          'No se pudo obtener tu ubicación después de intentar con diferentes niveles de precisión.\n\n' +
          'Posibles causas:\n' +
          '• Estás usando un emulador/simulador (usa un dispositivo físico)\n' +
          '• El GPS no está recibiendo señal (ve a un lugar abierto)\n' +
          '• Los servicios de ubicación necesitan reiniciarse\n\n' +
          'Soluciones:\n' +
          '1. Si usas emulador: Configura una ubicación manual en el emulador\n' +
          '2. Si usas dispositivo físico: Ve a un lugar abierto con buena señal\n' +
          '3. Reinicia los servicios de ubicación en tu dispositivo\n' +
          '4. Verifica que el modo de alta precisión esté activado',
          [{ text: 'Entendido' }]
        );
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        Alert.alert(
          'Tiempo de espera agotado',
          'No se pudo obtener tu ubicación a tiempo. Por favor:\n\n' +
          '• Verifica que tengas buena señal GPS\n' +
          '• Intenta estar en un lugar abierto\n' +
          '• Vuelve a intentar',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
        Alert.alert(
          'Permisos denegados',
          'La app no tiene permisos para acceder a tu ubicación. Por favor:\n\n' +
          '1. Ve a Configuración de la app\n' +
          '2. Permite el acceso a la ubicación\n' +
          '3. Vuelve a intentar',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error al obtener ubicación',
          `No se pudo obtener tu ubicación.\n\nError: ${errorMessage}\n\n` +
          'Por favor, verifica que:\n' +
          '• Los servicios de ubicación estén habilitados\n' +
          '• La app tenga permisos de ubicación\n' +
          '• Estés en un lugar con buena señal',
          [{ text: 'OK' }]
        );
      }
    } finally {
      // Asegurarse de que el estado de carga siempre se resetee
      setSavingLocation(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              const resultado = await logout();
              if (resultado.success) {
                // Navegar a Login después de cerrar sesión
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else {
                Alert.alert('Error', 'No se pudo cerrar sesión: ' + (resultado.error || 'Error desconocido'));
              }
            } catch (error) {
              console.error('Error en handleLogout:', error);
              Alert.alert('Error', 'No se pudo cerrar sesión');
            }
          }
        }
      ]
    );
  };

  const calcularIMC = () => {
    const altura = parseFloat(perfilData.altura);
    const peso = parseFloat(perfilData.peso);
    
    if (altura > 0 && peso > 0) {
      const alturaMetros = altura / 100;
      const imc = peso / (alturaMetros * alturaMetros);
      return imc.toFixed(1);
    }
    return '0';
  };

  const getIMCCategoria = (imc) => {
    const valor = parseFloat(imc);
    if (valor < 18.5) return { categoria: 'Bajo peso', color: '#2196F3' };
    if (valor < 25) return { categoria: 'Peso normal', color: '#42A5F5' };
    if (valor < 30) return { categoria: 'Sobrepeso', color: '#FF9800' };
    return { categoria: 'Obesidad', color: '#F44336' };
  };

  const renderPerfilHeader = () => (
    <View style={styles.perfilHeader}>
      <View style={styles.avatarContainer}>
        {uploadingImage ? (
          <View style={[styles.avatar, styles.avatarLoading]}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : fotoPerfil || user?.fotoPerfil ? (
          <Image 
            source={{ uri: fotoPerfil || user.fotoPerfil }} 
            style={styles.avatar}
            onError={() => {
              console.log('Error al cargar imagen de perfil');
              setFotoPerfil(null);
            }}
          />
        ) : (
          <MaterialCommunityIcons name="account" size={60} color="#FFFFFF" />
        )}
        <TouchableOpacity 
          style={styles.editAvatarButton}
          onPress={handleSeleccionarImagen}
          disabled={uploadingImage}
        >
          <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.nombreUsuario}>{perfilData.nombre || user?.nombre || 'Usuario'}</Text>
      <Text style={styles.emailUsuario}>{perfilData.email || user?.email || ''}</Text>
    </View>
  );

  const renderEstadisticas = () => {
    const imc = calcularIMC();
    const imcInfo = getIMCCategoria(imc);
    
    return (
      <View style={styles.estadisticasContainer}>
        <Text style={styles.sectionTitle}>Estadísticas de Salud</Text>
        <View style={styles.estadisticasGrid}>
          <View style={styles.estadisticaCard}>
            <MaterialCommunityIcons name="human" size={24} color="#2196F3" />
            <Text style={styles.estadisticaValor}>{perfilData.altura || 0} cm</Text>
            <Text style={styles.estadisticaLabel}>Altura</Text>
          </View>
          
          <View style={styles.estadisticaCard}>
            <MaterialCommunityIcons name="weight" size={24} color="#2196F3" />
            <Text style={styles.estadisticaValor}>{perfilData.peso || 0} kg</Text>
            <Text style={styles.estadisticaLabel}>Peso</Text>
          </View>
          
          <View style={styles.estadisticaCard}>
            <MaterialCommunityIcons name="calculator" size={24} color={imcInfo.color} />
            <Text style={[styles.estadisticaValor, { color: imcInfo.color }]}>{imc}</Text>
            <Text style={styles.estadisticaLabel}>IMC</Text>
          </View>
          
          <View style={styles.estadisticaCard}>
            <MaterialCommunityIcons name="target" size={24} color="#2196F3" />
            <Text style={styles.estadisticaValor}>{imcInfo.categoria}</Text>
            <Text style={styles.estadisticaLabel}>Categoría</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderInformacionPersonal = () => (
    <View style={styles.informacionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <MaterialCommunityIcons 
            name={isEditing ? "close" : "pencil"} 
            size={20} 
            color="#2196F3" 
          />
          <Text style={styles.editButtonText}>
            {isEditing ? 'Cancelar' : 'Editar'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="account" size={20} color="#666" />
          <Text style={styles.infoLabel}>Nombre:</Text>
          <Text style={styles.infoValue}>{perfilData.nombre || 'No especificado'}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="email" size={20} color="#666" />
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{perfilData.email || 'No especificado'}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="phone" size={20} color="#666" />
          <Text style={styles.infoLabel}>Teléfono:</Text>
          <Text style={styles.infoValue}>{perfilData.telefono || 'No especificado'}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="calendar" size={20} color="#666" />
          <Text style={styles.infoLabel}>Fecha de Nacimiento:</Text>
          <Text style={styles.infoValue}>{perfilData.fechaNacimiento || 'No especificado'}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="gender-male-female" size={20} color="#666" />
          <Text style={styles.infoLabel}>Género:</Text>
          <Text style={styles.infoValue}>{perfilData.genero || 'No especificado'}</Text>
        </View>
        
        {/* Mostrar ubicación solo para médicos */}
        {RoleService.isMedico(user?.rol) && (
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#666" />
            <Text style={styles.infoLabel}>Ubicación:</Text>
            <Text style={styles.infoValue}>
              {ubicacionGuardada 
                ? `Lat: ${user?.latitud?.toFixed(4) || 'N/A'}, Lng: ${user?.longitud?.toFixed(4) || 'N/A'}`
                : 'No configurada'}
            </Text>
          </View>
        )}
        
      </View>
      
      {/* Botón para guardar ubicación solo para médicos */}
      {RoleService.isMedico(user?.rol) && (
        <TouchableOpacity
          style={[styles.locationButton, ubicacionGuardada && styles.locationButtonSaved]}
          onPress={handleGuardarUbicacion}
          disabled={savingLocation}
        >
          {savingLocation ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons 
                name={ubicacionGuardada ? "map-marker-check" : "map-marker"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.locationButtonText}>
                {ubicacionGuardada ? 'Actualizar Ubicación' : 'Guardar Mi Ubicación'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderModalEdicion = () => (
    <Modal
      visible={isEditing}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsEditing(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <TouchableOpacity onPress={() => setIsEditing(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={perfilData.nombre}
                onChangeText={(text) => setPerfilData({...perfilData, nombre: text})}
                placeholder="Tu nombre completo"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={perfilData.email}
                onChangeText={(text) => setPerfilData({...perfilData, email: text})}
                placeholder="tu@email.com"
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={perfilData.telefono}
                onChangeText={(text) => setPerfilData({...perfilData, telefono: text})}
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fecha de Nacimiento</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color="#666" style={styles.inputIcon} />
                <Text style={styles.datePickerText}>
                  {fechaNacimiento.toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={fechaNacimiento}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setFechaNacimiento(selectedDate);
                      setPerfilData({...perfilData, fechaNacimiento: selectedDate.toISOString().split('T')[0]});
                    }
                  }}
                  maximumDate={new Date()}
                  locale="es-ES"
                />
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Género</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {generos.map((genero) => (
                  <TouchableOpacity
                    key={genero}
                    style={[
                      styles.generoButton,
                      perfilData.genero === genero && styles.generoButtonSelected
                    ]}
                    onPress={() => setPerfilData({...perfilData, genero})}
                  >
                    <Text style={[
                      styles.generoButtonText,
                      perfilData.genero === genero && styles.generoButtonTextSelected
                    ]}>
                      {genero}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Altura (cm)</Text>
              <TextInput
                style={styles.input}
                value={perfilData.altura}
                onChangeText={(text) => setPerfilData({...perfilData, altura: text})}
                placeholder="170"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Peso (kg)</Text>
              <TextInput
                style={styles.input}
                value={perfilData.peso}
                onChangeText={(text) => setPerfilData({...perfilData, peso: text})}
                placeholder="70"
                keyboardType="numeric"
              />
            </View>
            
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setIsEditing(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleGuardarPerfil}
            >
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderModalConfiguracion = () => (
    <Modal
      visible={showConfigModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowConfigModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Configuración</Text>
            <TouchableOpacity onPress={() => setShowConfigModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>Notificaciones</Text>
              
              <View style={styles.configSwitchRow}>
                <View style={styles.configSwitchInfo}>
                  <MaterialCommunityIcons name="bell" size={24} color="#2196F3" />
                  <View style={styles.configSwitchText}>
                    <Text style={styles.configSwitchTitle}>Notificaciones Push</Text>
                    <Text style={styles.configSwitchDesc}>Activar todas las notificaciones</Text>
                  </View>
                </View>
                <Switch
                  value={notificaciones}
                  onValueChange={setNotificaciones}
                  trackColor={{ false: '#E0E0E0', true: '#BBDEFB' }}
                  thumbColor={notificaciones ? '#2196F3' : '#F4F3F4'}
                />
              </View>
              
              {notificaciones && (
                <>
                  <View style={styles.configSwitchRow}>
                    <View style={styles.configSwitchInfo}>
                      <MaterialCommunityIcons name="calendar-clock" size={24} color="#2196F3" />
                      <View style={styles.configSwitchText}>
                        <Text style={styles.configSwitchTitle}>Notificaciones de Consultas</Text>
                        <Text style={styles.configSwitchDesc}>Recordatorios de citas médicas</Text>
                      </View>
                    </View>
                    <Switch
                      value={notificacionesConsultas}
                      onValueChange={setNotificacionesConsultas}
                      trackColor={{ false: '#E0E0E0', true: '#BBDEFB' }}
                      thumbColor={notificacionesConsultas ? '#2196F3' : '#F4F3F4'}
                    />
                  </View>
                  
                  <View style={styles.configSwitchRow}>
                    <View style={styles.configSwitchInfo}>
                      <MaterialCommunityIcons name="alarm" size={24} color="#2196F3" />
                      <View style={styles.configSwitchText}>
                        <Text style={styles.configSwitchTitle}>Recordatorios</Text>
                        <Text style={styles.configSwitchDesc}>Recordatorios de medicamentos y tratamientos</Text>
                      </View>
                    </View>
                    <Switch
                      value={notificacionesRecordatorios}
                      onValueChange={setNotificacionesRecordatorios}
                      trackColor={{ false: '#E0E0E0', true: '#BBDEFB' }}
                      thumbColor={notificacionesRecordatorios ? '#2196F3' : '#F4F3F4'}
                    />
                  </View>
                </>
              )}
            </View>
            
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>Privacidad</Text>
              
              <TouchableOpacity 
                style={styles.configOption}
                onPress={() => setShowPrivacidadModal(true)}
              >
                <MaterialCommunityIcons name="shield-lock" size={24} color="#2196F3" />
                <View style={styles.configOptionText}>
                  <Text style={styles.configOptionTitle}>Política de Privacidad</Text>
                  <Text style={styles.configOptionDesc}>Gestionar la privacidad de tus datos</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
              </TouchableOpacity>
              
              <View style={styles.configSwitchRow}>
                <View style={styles.configSwitchInfo}>
                  <MaterialCommunityIcons name="share-variant" size={24} color="#2196F3" />
                  <View style={styles.configSwitchText}>
                    <Text style={styles.configSwitchTitle}>Compartir Datos Anónimos</Text>
                    <Text style={styles.configSwitchDesc}>Permitir uso de datos anónimos para mejorar el servicio</Text>
                  </View>
                </View>
                <Switch
                  value={compartirDatos}
                  onValueChange={setCompartirDatos}
                  trackColor={{ false: '#E0E0E0', true: '#BBDEFB' }}
                  thumbColor={compartirDatos ? '#2196F3' : '#F4F3F4'}
                />
              </View>
            </View>
            
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>General</Text>
              
              <TouchableOpacity 
                style={styles.configOption}
                onPress={() => setShowIdiomaModal(true)}
              >
                <MaterialCommunityIcons name="translate" size={24} color="#2196F3" />
                <View style={styles.configOptionText}>
                  <Text style={styles.configOptionTitle}>Idioma</Text>
                  <Text style={styles.configOptionDesc}>{idioma}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowConfigModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={guardarConfiguracion}
            >
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderModalAyuda = () => (
    <Modal
      visible={showAyudaModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAyudaModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ayuda y Soporte</Text>
            <TouchableOpacity onPress={() => setShowAyudaModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <TouchableOpacity 
              style={styles.ayudaOption}
              onPress={() => {
                setShowAyudaModal(false);
                setShowFAQModal(true);
              }}
            >
              <MaterialCommunityIcons name="message-question" size={24} color="#2196F3" />
              <Text style={styles.ayudaOptionText}>Preguntas Frecuentes</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.ayudaOption}
              onPress={handleContactarSoporte}
            >
              <MaterialCommunityIcons name="email" size={24} color="#2196F3" />
              <Text style={styles.ayudaOptionText}>Contactar Soporte</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.ayudaOption}
              onPress={handleAbrirGuia}
            >
              <MaterialCommunityIcons name="file-document" size={24} color="#2196F3" />
              <Text style={styles.ayudaOptionText}>Guía de Usuario</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
            
            <View style={styles.ayudaInfo}>
              <Text style={styles.ayudaInfoTitle}>¿Necesitas ayuda?</Text>
              <Text style={styles.ayudaInfoText}>
                Estamos aquí para ayudarte. Si tienes alguna pregunta o problema, 
                no dudes en contactarnos.
              </Text>
              <Text style={styles.ayudaInfoContact}>
                Email: soporte@serviciosmedicos.com{'\n'}
                Teléfono: +1 (555) 123-4567
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderModalFAQ = () => (
    <Modal
      visible={showFAQModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFAQModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Preguntas Frecuentes</Text>
            <TouchableOpacity onPress={() => setShowFAQModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>¿Cómo agendo una consulta médica?</Text>
              <Text style={styles.faqAnswer}>
                Puedes agendar una consulta desde la pantalla "Agendar Cita" en el menú principal. 
                Selecciona el médico, la fecha y hora disponibles, y confirma tu cita.
              </Text>
            </View>
            
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>¿Cómo puedo ver mis recetas médicas?</Text>
              <Text style={styles.faqAnswer}>
                Todas tus recetas están disponibles en la sección "Recetas". Puedes ver, descargar 
                o compartir tus recetas electrónicas desde ahí.
              </Text>
            </View>
            
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>¿Es seguro compartir mis datos médicos?</Text>
              <Text style={styles.faqAnswer}>
                Sí, todos tus datos están encriptados y protegidos según las normativas de privacidad 
                médica. Solo tú y los médicos autorizados pueden acceder a tu información.
              </Text>
            </View>
            
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>¿Puedo cancelar una consulta?</Text>
              <Text style={styles.faqAnswer}>
                Sí, puedes cancelar o reprogramar una consulta desde la sección "Mis Consultas" 
                con al menos 2 horas de anticipación.
              </Text>
            </View>
            
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>¿Cómo contacto con mi médico?</Text>
              <Text style={styles.faqAnswer}>
                Puedes usar la función de chat en la aplicación para comunicarte directamente 
                con tu médico en tiempo real.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderModalPrivacidad = () => (
    <Modal
      visible={showPrivacidadModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPrivacidadModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Política de Privacidad</Text>
            <TouchableOpacity onPress={() => setShowPrivacidadModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.privacyContent}>
              <Text style={styles.privacySectionTitle}>Protección de Datos</Text>
              <Text style={styles.privacyText}>
                Nos comprometemos a proteger tu privacidad y la seguridad de tus datos médicos. 
                Toda la información es tratada con la máxima confidencialidad.
              </Text>
              
              <Text style={styles.privacySectionTitle}>Datos que Recopilamos</Text>
              <Text style={styles.privacyText}>
                • Información personal (nombre, email, teléfono){'\n'}
                • Datos médicos (historial, recetas, consultas){'\n'}
                • Información de uso de la aplicación
              </Text>
              
              <Text style={styles.privacySectionTitle}>Uso de la Información</Text>
              <Text style={styles.privacyText}>
                Utilizamos tu información para:{'\n'}
                • Proporcionar servicios médicos{'\n'}
                • Mejorar la calidad del servicio{'\n'}
                • Enviar notificaciones importantes
              </Text>
              
              <Text style={styles.privacySectionTitle}>Seguridad</Text>
              <Text style={styles.privacyText}>
                Todos los datos están encriptados y almacenados de forma segura. 
                Solo el personal médico autorizado tiene acceso a tu información médica.
              </Text>
              
              <Text style={styles.privacySectionTitle}>Tus Derechos</Text>
              <Text style={styles.privacyText}>
                Tienes derecho a:{'\n'}
                • Acceder a tus datos personales{'\n'}
                • Solicitar correcciones{'\n'}
                • Solicitar la eliminación de tus datos{'\n'}
                • Retirar tu consentimiento en cualquier momento
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderModalIdioma = () => (
    <Modal
      visible={showIdiomaModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowIdiomaModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Idioma</Text>
            <TouchableOpacity onPress={() => setShowIdiomaModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {idiomas.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.idiomaOption,
                  idioma === lang && styles.idiomaOptionSelected
                ]}
                onPress={() => {
                  setIdioma(lang);
                  setShowIdiomaModal(false);
                }}
              >
                <Text style={[
                  styles.idiomaOptionText,
                  idioma === lang && styles.idiomaOptionTextSelected
                ]}>
                  {lang}
                </Text>
                {idioma === lang && (
                  <MaterialCommunityIcons name="check" size={24} color="#2196F3" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderModalAcerca = () => (
    <Modal
      visible={showAcercaModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAcercaModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Acerca de</Text>
            <TouchableOpacity onPress={() => setShowAcercaModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.acercaContent}>
              <MaterialCommunityIcons name="medical-bag" size={64} color="#2196F3" />
              <Text style={styles.acercaAppName}>Servicios Médicos a Distancia</Text>
              <Text style={styles.acercaVersion}>Versión 1.0.0</Text>
              
              <Text style={styles.acercaDescription}>
                Aplicación móvil para la gestión de servicios médicos a distancia, 
                incluyendo consultas virtuales, recetas electrónicas, historial médico 
                y comunicación directa con profesionales de la salud.
              </Text>
              
              <View style={styles.acercaFeatures}>
                <Text style={styles.acercaFeaturesTitle}>Características principales:</Text>
                <Text style={styles.acercaFeatureItem}>• Consultas médicas virtuales</Text>
                <Text style={styles.acercaFeatureItem}>• Recetas electrónicas</Text>
                <Text style={styles.acercaFeatureItem}>• Historial médico digital</Text>
                <Text style={styles.acercaFeatureItem}>• Chat con médicos</Text>
                <Text style={styles.acercaFeatureItem}>• Foro de salud</Text>
                <Text style={styles.acercaFeatureItem}>• Búsqueda de médicos</Text>
              </View>
              
              <Text style={styles.acercaCopyright}>
                © 2024 Servicios Médicos a Distancia.{'\n'}
                Todos los derechos reservados.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderAcciones = () => (
    <View style={styles.accionesContainer}>
      <Text style={styles.sectionTitle}>Acciones</Text>
      
      <TouchableOpacity style={styles.accionButton} onPress={() => setShowConfigModal(true)}>
        <MaterialCommunityIcons name="cog" size={24} color="#2196F3" />
        <Text style={styles.accionText}>Configuración</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.accionButton} onPress={() => setShowAyudaModal(true)}>
        <MaterialCommunityIcons name="help-circle" size={24} color="#2196F3" />
        <Text style={styles.accionText}>Ayuda y Soporte</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.accionButton} onPress={() => setShowAcercaModal(true)}>
        <MaterialCommunityIcons name="information" size={24} color="#2196F3" />
        <Text style={styles.accionText}>Acerca de</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.accionButton, styles.logoutButton]} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={24} color="#F44336" />
        <Text style={[styles.accionText, styles.logoutText]}>Cerrar Sesión</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#F44336" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderPerfilHeader()}
      {renderEstadisticas()}
      {renderInformacionPersonal()}
      {renderAcciones()}
      {renderModalEdicion()}
      {renderModalConfiguracion()}
      {renderModalAyuda()}
      {renderModalAcerca()}
      {renderModalFAQ()}
      {renderModalPrivacidad()}
      {renderModalIdioma()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  perfilHeader: {
    backgroundColor: '#2196F3',
    padding: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E0E0',
  },
  avatarLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#42A5F5',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nombreUsuario: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  emailUsuario: {
    fontSize: 16,
    color: '#E8F5E8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  estadisticasContainer: {
    padding: 20,
  },
  estadisticasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  estadisticaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  estadisticaValor: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 8,
  },
  estadisticaLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  informacionContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  editButtonText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 5,
    fontWeight: '600',
  },
  infoGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 10,
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    textAlign: 'right',
  },
  accionesContainer: {
    padding: 20,
    paddingTop: 0,
  },
  accionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  accionText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 15,
    flex: 1,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutText: {
    color: '#F44336',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  generoButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
    backgroundColor: '#F9F9F9',
  },
  generoButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  generoButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  generoButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666666',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Estilos para Modal de Configuración
  configOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  configOptionText: {
    flex: 1,
    marginLeft: 15,
  },
  configOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  configOptionDesc: {
    fontSize: 14,
    color: '#666',
  },
  // Estilos para Modal de Ayuda
  ayudaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  ayudaOptionText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  ayudaInfo: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
  },
  ayudaInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 10,
  },
  ayudaInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  ayudaInfoContact: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  // Estilos para Modal Acerca de
  acercaContent: {
    alignItems: 'center',
    padding: 20,
  },
  acercaAppName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 15,
    marginBottom: 5,
    textAlign: 'center',
  },
  acercaVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  acercaDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  acercaFeatures: {
    width: '100%',
    marginBottom: 25,
  },
  acercaFeaturesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  acercaFeatureItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  acercaCopyright: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  // Estilos adicionales para Configuración
  configSection: {
    marginBottom: 25,
  },
  configSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  configSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  configSwitchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  configSwitchText: {
    marginLeft: 15,
    flex: 1,
  },
  configSwitchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  configSwitchDesc: {
    fontSize: 13,
    color: '#666',
  },
  // Estilos para FAQ
  faqItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 10,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Estilos para Privacidad
  privacyContent: {
    padding: 10,
  },
  privacySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 20,
    marginBottom: 10,
  },
  privacyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 15,
  },
  // Estilos para Idioma
  idiomaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  idiomaOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  idiomaOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  idiomaOptionTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  inputIcon: {
    marginLeft: 0,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    marginLeft: 10,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    margin: 15,
    marginTop: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationButtonSaved: {
    backgroundColor: '#4CAF50',
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default PerfilScreen;
