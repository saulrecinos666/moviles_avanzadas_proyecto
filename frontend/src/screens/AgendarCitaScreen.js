import React, { useState } from 'react';
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

const AgendarCitaScreen = ({ navigation, route }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const medico = route?.params?.medico;
  
  const [fecha, setFecha] = useState(new Date());
  const [hora, setHora] = useState(new Date());
  const [mostrarFechaPicker, setMostrarFechaPicker] = useState(false);
  const [mostrarHoraPicker, setMostrarHoraPicker] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAgendar = async () => {
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
        [medico.id, fechaStr, horaStr]
      );

      if (consultaExistente) {
        Alert.alert('Error', 'El médico no está disponible en ese horario');
        setLoading(false);
        return;
      }

      // Crear consulta
      await db.runAsync(
        `INSERT INTO consultas 
         (pacienteId, medicoId, tipo, especialidad, fecha, hora, estado, motivo, sintomas, fechaRegistro)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          medico.id,
          'virtual',
          medico.especialidad,
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
            onPress: () => navigation.navigate('Consultas')
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

  if (!medico) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No se seleccionó un médico</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('BusquedaMedicos')}
          >
            <Text style={styles.buttonText}>Buscar Médico</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.medicoCard}>
        <MaterialCommunityIcons name="doctor" size={48} color="#2196F3" />
        <View style={styles.medicoInfo}>
          <Text style={styles.medicoNombre}>{medico.nombre}</Text>
          <Text style={styles.medicoEspecialidad}>{medico.especialidad}</Text>
          {medico.precioConsulta && (
            <Text style={styles.precio}>${medico.precioConsulta.toFixed(2)}</Text>
          )}
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
});

export default AgendarCitaScreen;

