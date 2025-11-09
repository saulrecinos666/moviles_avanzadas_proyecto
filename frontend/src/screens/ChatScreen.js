import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../context/UserContext';
import { database } from '../config/firebase';

const ChatScreen = ({ navigation, route }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const medico = route?.params?.medico;
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);
  const conversacionId = medico ? `${user.firebaseUid}_${medico.firebaseUid}` : null;

  useEffect(() => {
    if (conversacionId) {
      loadMensajes();
      setupRealtimeListener();
    }
    return () => {
      if (conversacionId) {
        // Limpiar listener cuando el componente se desmonte
      }
    };
  }, [conversacionId]);

  const loadMensajes = async () => {
    try {
      setLoading(true);
      // Cargar mensajes desde SQLite
      const result = await db.getAllAsync(
        `SELECT * FROM mensajesChat
         WHERE conversacionId = ?
         ORDER BY fechaEnvio ASC`,
        [conversacionId]
      );
      setMensajes(result);
      
      // También sincronizar con Firebase
      if (conversacionId) {
        const mensajesRef = database.ref(`conversaciones/${conversacionId}/mensajes`);
        mensajesRef.on('value', (snapshot) => {
          const firebaseMensajes = snapshot.val();
          if (firebaseMensajes) {
            const mensajesArray = Object.values(firebaseMensajes);
            setMensajes(mensajesArray.sort((a, b) => a.timestamp - b.timestamp));
          }
        });
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListener = () => {
    if (!conversacionId) return;
    
    const mensajesRef = database.ref(`conversaciones/${conversacionId}/mensajes`);
    mensajesRef.on('child_added', (snapshot) => {
      const nuevoMensaje = snapshot.val();
      setMensajes(prev => {
        if (!prev.find(m => m.id === nuevoMensaje.id)) {
          return [...prev, nuevoMensaje].sort((a, b) => a.timestamp - b.timestamp);
        }
        return prev;
      });
      
      // Scroll al final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !conversacionId) return;

    try {
      const mensaje = {
        conversacionId,
        remitenteId: user.firebaseUid,
        remitenteTipo: 'paciente',
        destinatarioId: medico.firebaseUid,
        destinatarioTipo: 'medico',
        mensaje: nuevoMensaje.trim(),
        tipo: 'texto',
        leido: 0,
        fechaEnvio: new Date().toISOString(),
        timestamp: Date.now()
      };

      // Guardar en SQLite
      await db.runAsync(
        `INSERT INTO mensajesChat (conversacionId, remitenteId, remitenteTipo, destinatarioId, destinatarioTipo, mensaje, tipo, leido, fechaEnvio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mensaje.conversacionId,
          mensaje.remitenteId,
          mensaje.remitenteTipo,
          mensaje.destinatarioId,
          mensaje.destinatarioTipo,
          mensaje.mensaje,
          mensaje.tipo,
          mensaje.leido,
          mensaje.fechaEnvio
        ]
      );

      // Guardar en Firebase
      const mensajesRef = database.ref(`conversaciones/${conversacionId}/mensajes`);
      const nuevoMensajeRef = mensajesRef.push();
      await nuevoMensajeRef.set({
        ...mensaje,
        id: nuevoMensajeRef.key,
        firebaseMessageId: nuevoMensajeRef.key
      });

      // Actualizar última conversación
      await database.ref(`conversaciones/${conversacionId}`).update({
        ultimoMensaje: mensaje.mensaje,
        ultimoMensajeFecha: mensaje.fechaEnvio,
        noLeidosMedico: (await database.ref(`conversaciones/${conversacionId}/noLeidosMedico`).once('value')).val() + 1 || 1
      });

      setNuevoMensaje('');
      
      // Scroll al final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const renderMensaje = ({ item }) => {
    const esMio = item.remitenteId === user.firebaseUid;
    const fecha = new Date(item.fechaEnvio);
    const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.mensajeContainer, esMio ? styles.mensajeDerecha : styles.mensajeIzquierda]}>
        <View style={[styles.mensajeBurbuja, esMio ? styles.mensajeBurbujaMia : styles.mensajeBurbujaOtro]}>
          <Text style={[styles.mensajeTexto, esMio ? styles.mensajeTextoMio : styles.mensajeTextoOtro]}>
            {item.mensaje}
          </Text>
          <Text style={[styles.mensajeHora, esMio ? styles.mensajeHoraMia : styles.mensajeHoraOtro]}>
            {hora}
          </Text>
        </View>
      </View>
    );
  };

  if (!medico) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="message-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Selecciona un médico para iniciar el chat</Text>
          <TouchableOpacity
            style={styles.buscarButton}
            onPress={() => navigation.navigate('BusquedaMedicos')}
          >
            <Text style={styles.buscarButtonText}>Buscar Médicos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerNombre}>{medico.nombre}</Text>
          <Text style={styles.headerEspecialidad}>{medico.especialidad}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={mensajes}
          renderItem={renderMensaje}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.mensajesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={nuevoMensaje}
          onChangeText={setNuevoMensaje}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !nuevoMensaje.trim() && styles.sendButtonDisabled]}
          onPress={enviarMensaje}
          disabled={!nuevoMensaje.trim()}
        >
          <MaterialCommunityIcons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerEspecialidad: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mensajesList: {
    padding: 15,
  },
  mensajeContainer: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  mensajeDerecha: {
    justifyContent: 'flex-end',
  },
  mensajeIzquierda: {
    justifyContent: 'flex-start',
  },
  mensajeBurbuja: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  mensajeBurbujaMia: {
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  mensajeBurbujaOtro: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mensajeTexto: {
    fontSize: 15,
    lineHeight: 20,
  },
  mensajeTextoMio: {
    color: '#fff',
  },
  mensajeTextoOtro: {
    color: '#333',
  },
  mensajeHora: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  mensajeHoraMia: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  mensajeHoraOtro: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    marginRight: 10,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  buscarButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  buscarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatScreen;

