import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../context/UserContext';
import { validateForm } from '../services/ValidationService';
import RoleService from '../services/RoleService';
import ProtectedRoute from '../components/ProtectedRoute';

const AgendarCitaScreen = ({ navigation, route }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const medicoParam = route?.params?.medico;
  const userRole = user?.rol || 'paciente';
  const [medicoSeleccionado, setMedicoSeleccionado] = useState(medicoParam);
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(!medicoParam);
  const [medicos, setMedicos] = useState([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);

  // Validar permisos al cargar
  useEffect(() => {
    if (!RoleService.canPerformAction(userRole, 'agendar_consulta')) {
      Alert.alert(
        'Acceso Denegado',
        'Solo los pacientes pueden agendar consultas.',
        [
          {
            text: 'OK',
            onPress: () => {
              const redirectScreen = RoleService.isAdmin(userRole) 
                ? 'DashboardAdmin' 
                : RoleService.isMedico(userRole) 
                ? 'DashboardMedico' 
                : 'Dashboard';
              navigation.replace(redirectScreen);
            }
          }
        ]
      );
    } else if (mostrarListaMedicos) {
      loadMedicos();
    }
  }, [userRole, navigation, mostrarListaMedicos]);
  
  const loadMedicos = async () => {
    try {
      setLoadingMedicos(true);
      // Cargar médicos desde la tabla usuarios con rol 'medico'
      const usuariosMedicos = await db.getAllAsync(
        'SELECT * FROM usuarios WHERE rol = ? AND activo = 1 ORDER BY nombre',
        ['medico']
      );
      
      // Mapear al formato esperado
      const medicosMapeados = usuariosMedicos.map(u => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        telefono: u.telefono,
        especialidad: 'Medicina General',
        subespecialidad: null,
        direccion: u.direccion || '',
        ciudad: u.ciudad || '',
        disponible: 1,
        calificacion: 0,
        fotoPerfil: u.fotoPerfil || '',
        firebaseUid: u.firebaseUid,
        activo: u.activo
      }));
      
      setMedicos(medicosMapeados);
    } catch (error) {
      console.error('Error cargando médicos:', error);
      Alert.alert('Error', 'No se pudieron cargar los médicos');
    } finally {
      setLoadingMedicos(false);
    }
  };
  
  const [fecha, setFecha] = useState(new Date());
  const [hora, setHora] = useState(new Date());
  const [mostrarFechaPicker, setMostrarFechaPicker] = useState(false);
  const [mostrarHoraPicker, setMostrarHoraPicker] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAgendar = async () => {
    // Validar permisos antes de agendar
    if (!RoleService.canPerformAction(userRole, 'agendar_consulta')) {
      Alert.alert('Error', 'No tienes permisos para agendar consultas');
      return;
    }

    // Validar campos
    const validation = validateForm({
      fecha: {
        value: fecha.toISOString(),
        label: 'Fecha',
        required: true,
        type: 'date',
        futureDate: true
      },
      hora: {
        value: hora.toTimeString().slice(0, 5),
        label: 'Hora',
        required: true,
        type: 'time'
      },
      motivo: {
        value: motivo,
        label: 'Motivo',
        required: true,
        minLength: 5,
        maxLength: 200
      }
    });

    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors).join('\n');
      Alert.alert('Error de validación', errorMessage);
      return;
    }

    try {
      setLoading(true);
      
      // Verificar disponibilidad
      const fechaStr = fecha.toISOString().split('T')[0];
      const horaStr = hora.toTimeString().slice(0, 5);
      
      const consultaExistente = await db.getFirstAsync(
        `SELECT * FROM consultas 
         WHERE medicoId = ? AND fecha = ? AND hora = ? AND estado != 'cancelada'`,
        [medicoSeleccionado.id, fechaStr, horaStr]
      );

      if (consultaExistente) {
        Alert.alert('Error', 'El médico no está disponible en ese horario');
        setLoading(false);
        return;
      }

      // Crear consulta
      // Asegurarse de usar el ID correcto del médico (de la tabla usuarios)
      let medicoIdFinal = medicoSeleccionado.id;
      
      // Si el médico viene de BusquedaMedicosScreen, puede tener ID de usuarios o medicos
      // Verificar y obtener el ID correcto de usuarios si es necesario
      if (medicoSeleccionado.firebaseUid) {
        const medicoEnUsuarios = await db.getFirstAsync(
          'SELECT id FROM usuarios WHERE (id = ? OR firebaseUid = ? OR email = ?) AND rol = ?',
          [medicoSeleccionado.id, medicoSeleccionado.firebaseUid, medicoSeleccionado.email, 'medico']
        );
        if (medicoEnUsuarios) {
          medicoIdFinal = medicoEnUsuarios.id;
          console.log('ID del médico ajustado a usuarios:', medicoIdFinal);
        }
      }
      
      console.log('Guardando consulta con medicoId:', medicoIdFinal, 'pacienteId:', user.id);
      
      await db.runAsync(
        `INSERT INTO consultas 
         (pacienteId, medicoId, tipo, especialidad, fecha, hora, estado, motivo, sintomas, fechaRegistro)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          medicoIdFinal,
          'virtual',
          medicoSeleccionado.especialidad || 'Medicina General',
          fechaStr,
          horaStr,
          'programada',
          motivo,
          sintomas || null,
          new Date().toISOString()
        ]
      );

      Alert.alert(
        'Éxito',
        'Consulta agendada correctamente',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Main', { screen: 'Consultas' })
          }
        ]
      );
    } catch (error) {
      console.error('Error agendando cita:', error);
      Alert.alert('Error', 'No se pudo agendar la consulta');
    } finally {
      setLoading(false);
    }
  };

  // Si no hay médico seleccionado, mostrar lista de médicos
  if (mostrarListaMedicos || !medicoSeleccionado) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Selecciona un Médico</Text>
          <Text style={styles.headerSubtitle}>Elige el médico con quien deseas agendar tu consulta</Text>
        </View>
        
        {loadingMedicos ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Cargando médicos...</Text>
          </View>
        ) : (
          <FlatList
            data={medicos}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.medicosList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.medicoSelectCard}
                onPress={() => {
                  setMedicoSeleccionado(item);
                  setMostrarListaMedicos(false);
                }}
              >
                <View style={styles.medicoSelectAvatar}>
                  <MaterialCommunityIcons name="doctor" size={32} color="#2196F3" />
                </View>
                <View style={styles.medicoSelectInfo}>
                  <Text style={styles.medicoSelectNombre}>{item.nombre}</Text>
                  <Text style={styles.medicoSelectEspecialidad}>{item.especialidad}</Text>
                  {item.email && (
                    <Text style={styles.medicoSelectEmail}>{item.email}</Text>
                  )}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="doctor" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No hay médicos disponibles</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.medicoCard}>
        <TouchableOpacity
          style={styles.cambiarMedicoButton}
          onPress={() => setMostrarListaMedicos(true)}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#2196F3" />
          <Text style={styles.cambiarMedicoText}>Cambiar médico</Text>
        </TouchableOpacity>
        <View style={styles.medicoCardContent}>
          <MaterialCommunityIcons name="doctor" size={48} color="#2196F3" />
          <View style={styles.medicoInfo}>
            <Text style={styles.medicoNombre}>{medicoSeleccionado.nombre}</Text>
            <Text style={styles.medicoEspecialidad}>{medicoSeleccionado.especialidad || 'Medicina General'}</Text>
            {medicoSeleccionado.email && (
              <Text style={styles.medicoEmail}>{medicoSeleccionado.email}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Fecha y Hora</Text>
        
        <TouchableOpacity
          style={styles.input}
          onPress={() => setMostrarFechaPicker(true)}
        >
          <MaterialCommunityIcons name="calendar" size={20} color="#666" />
          <Text style={styles.inputText}>
            {fecha.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.input}
          onPress={() => setMostrarHoraPicker(true)}
        >
          <MaterialCommunityIcons name="clock-outline" size={20} color="#666" />
          <Text style={styles.inputText}>
            {hora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Motivo de la Consulta</Text>
        <TextInput
          style={[styles.textArea, styles.input]}
          placeholder="Describe el motivo de tu consulta..."
          value={motivo}
          onChangeText={setMotivo}
          multiline
          numberOfLines={4}
          maxLength={200}
          placeholderTextColor="#999"
        />

        <Text style={styles.sectionTitle}>Síntomas (Opcional)</Text>
        <TextInput
          style={[styles.textArea, styles.input]}
          placeholder="Describe tus síntomas..."
          value={sintomas}
          onChangeText={setSintomas}
          multiline
          numberOfLines={4}
          maxLength={500}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleAgendar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="calendar-check" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Agendar Consulta</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {mostrarFechaPicker && (
        <DateTimePicker
          value={fecha}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setMostrarFechaPicker(false);
            if (selectedDate) {
              setFecha(selectedDate);
            }
          }}
        />
      )}

      {mostrarHoraPicker && (
        <DateTimePicker
          value={hora}
          mode="time"
          display="default"
          is24Hour={true}
          onChange={(event, selectedTime) => {
            setMostrarHoraPicker(false);
            if (selectedTime) {
              setHora(selectedTime);
            }
          }}
        />
      )}
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
    marginBottom: 20,
  },
  medicoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    margin: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  medicoInfo: {
    marginLeft: 15,
    flex: 1,
  },
  medicoNombre: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  medicoEspecialidad: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 4,
  },
  precio: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  formContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 25,
    marginTop: 20,
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  medicosList: {
    padding: 15,
  },
  medicoSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  medicoSelectAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  medicoSelectInfo: {
    flex: 1,
  },
  medicoSelectNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  medicoSelectEspecialidad: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 2,
  },
  medicoSelectEmail: {
    fontSize: 12,
    color: '#666',
  },
  cambiarMedicoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
  },
  cambiarMedicoText: {
    marginLeft: 5,
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  medicoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicoEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default AgendarCitaScreen;

