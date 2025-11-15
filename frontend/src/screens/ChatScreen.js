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
import RoleService from '../services/RoleService';

const ChatScreen = ({ navigation, route }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const userRole = user?.rol || 'paciente';
  const medico = route?.params?.medico;
  const paciente = route?.params?.paciente;
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);
  
  // Determinar el contacto según el rol
  const contacto = RoleService.isMedico(userRole) ? paciente : medico;
  // Generar conversacionId de forma consistente (siempre menor_id_mayor_id)
  const generarConversacionId = (id1, id2) => {
    const ids = [id1, id2].sort();
    return `${ids[0]}_${ids[1]}`;
  };
  const conversacionId = contacto 
    ? generarConversacionId(user.id || user.firebaseUid, contacto.id || contacto.firebaseUid)
    : null;

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
      
      // Primero sincronizar desde Firebase
      try {
        const mensajesRef = database.ref(`conversaciones/${conversacionId}/mensajes`);
        const snapshot = await mensajesRef.once('value');
        const firebaseMensajes = snapshot.val();
        
        if (firebaseMensajes) {
          const mensajesArray = Object.values(firebaseMensajes);
          
          // Guardar todos los mensajes de Firebase en SQLite
          for (const msg of mensajesArray) {
            try {
              const existe = await db.getFirstAsync(
                'SELECT id FROM mensajesChat WHERE firebaseMessageId = ?',
                [msg.firebaseMessageId]
              );
              
              if (!existe) {
                await db.runAsync(
                  `INSERT INTO mensajesChat (conversacionId, remitenteId, remitenteTipo, destinatarioId, destinatarioTipo, mensaje, tipo, leido, fechaEnvio, firebaseMessageId)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    msg.conversacionId,
                    msg.remitenteId,
                    msg.remitenteTipo,
                    msg.destinatarioId,
                    msg.destinatarioTipo,
                    msg.mensaje,
                    msg.tipo || 'texto',
                    msg.leido || 0,
                    msg.fechaEnvio,
                    msg.firebaseMessageId
                  ]
                );
              }
            } catch (e) {
              console.error('Error guardando mensaje individual:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error sincronizando desde Firebase:', error);
      }
      
      // Cargar mensajes desde SQLite
      const result = await db.getAllAsync(
        `SELECT * FROM mensajesChat
         WHERE conversacionId = ?
         ORDER BY fechaEnvio ASC`,
        [conversacionId]
      );
      setMensajes(result || []);
      
      // Marcar mensajes como leídos
      await db.runAsync(
        `UPDATE mensajesChat SET leido = 1 
         WHERE conversacionId = ? AND destinatarioId = ? AND leido = 0`,
        [conversacionId, user.id || user.firebaseUid]
      );
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
    if (!nuevoMensaje.trim() || !conversacionId || !contacto) return;

    // Determinar tipos según el rol del usuario
    const remitenteTipo = userRole;
    const destinatarioTipo = RoleService.isMedico(userRole) ? 'paciente' : 'medico';
    const remitenteId = user.id || user.firebaseUid;
    const destinatarioId = contacto.id || contacto.firebaseUid;

    try {
      const mensaje = {
        conversacionId,
        remitenteId,
        remitenteTipo,
        destinatarioId,
        destinatarioTipo,
        mensaje: nuevoMensaje.trim(),
        tipo: 'texto',
        leido: 0,
        fechaEnvio: new Date().toISOString(),
        timestamp: Date.now()
      };

      // Guardar en SQLite
      const result = await db.runAsync(
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

      mensaje.id = result.lastInsertRowId;

      // Guardar en Firebase
      const mensajesRef = database.ref(`conversaciones/${conversacionId}/mensajes`);
      const nuevoMensajeRef = mensajesRef.push();
      await nuevoMensajeRef.set({
        ...mensaje,
        firebaseMessageId: nuevoMensajeRef.key
      });

      // Actualizar SQLite con firebaseMessageId
      await db.runAsync(
        'UPDATE mensajesChat SET firebaseMessageId = ? WHERE id = ?',
        [nuevoMensajeRef.key, mensaje.id]
      );

      // Actualizar última conversación
      await db.runAsync(
        `INSERT OR REPLACE INTO conversaciones (conversacionId, pacienteId, medicoId, ultimoMensaje, ultimoMensajeFecha, activa)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          conversacionId,
          RoleService.isMedico(userRole) ? contacto.id : user.id,
          RoleService.isMedico(userRole) ? user.id : contacto.id,
          mensaje.mensaje,
          mensaje.fechaEnvio,
          1
        ]
      );

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
    const esMio = item.remitenteId === (user.id || user.firebaseUid);
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

  if (!contacto) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="message-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {RoleService.isMedico(userRole) 
              ? 'Selecciona un paciente para iniciar el chat' 
              : 'Selecciona un médico para iniciar el chat'}
          </Text>
          <TouchableOpacity
            style={styles.buscarButton}
            onPress={() => {
              if (RoleService.isMedico(userRole)) {
                navigation.navigate('MisPacientes');
              } else {
                navigation.navigate('BusquedaMedicos');
              }
            }}
          >
            <Text style={styles.buscarButtonText}>
              {RoleService.isMedico(userRole) ? 'Ver Pacientes' : 'Buscar Médicos'}
            </Text>
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
          <Text style={styles.headerNombre}>{contacto.nombre}</Text>
          {contacto.especialidad && (
            <Text style={styles.headerEspecialidad}>{contacto.especialidad}</Text>
          )}
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

