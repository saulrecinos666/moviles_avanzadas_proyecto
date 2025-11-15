import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../context/UserContext';
import RoleService from '../services/RoleService';
import { database } from '../config/firebase';

const ConversacionesScreen = ({ navigation, route }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const userRole = user?.rol || 'paciente';
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatAbierto, setChatAbierto] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const flatListRef = useRef(null);
  const listenerRef = useRef(null);
  const chatAbiertoRef = useRef(false);
  const ultimoTimestampRef = useRef(0);
  const loadConversacionesTimeoutRef = useRef(null);
  const sincronizandoRef = useRef(false);
  const cargandoConversacionesRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  useEffect(() => {
    if (user?.id) {
      // Sincronizar y cargar solo una vez al inicio
      sincronizarMensajesFirebase().then(() => {
        loadConversaciones();
      });
      // NO configurar listener global - causa que el chat se cierre/abra
      // setupRealtimeListener();
    }
    
    // Limpiar listeners y timeouts al desmontar
    return () => {
      if (loadConversacionesTimeoutRef.current) {
        clearTimeout(loadConversacionesTimeoutRef.current);
      }
      if (listenerRef.current && database) {
        // Limpiar cualquier listener activo
        try {
          const conversacionIdActual = chatAbierto?.conversacionId;
          if (conversacionIdActual) {
            const mensajesRef = database.ref(`conversaciones/${conversacionIdActual}/mensajes`);
            mensajesRef.off('child_added', listenerRef.current);
          }
        } catch (e) {
          console.error('Error limpiando listener:', e);
        }
        listenerRef.current = null;
      }
      sincronizandoRef.current = false;
    };
  }, [user]);

  // Abrir chat automáticamente si se pasa un contacto en los parámetros
  useEffect(() => {
    const abrirChatCon = route?.params?.abrirChatCon;
    // Solo abrir si hay un contacto, el usuario está cargado, no hay chat abierto, y no se está abriendo ya
    if (abrirChatCon && user?.id && !chatAbierto && !chatAbiertoRef.current) {
      // Verificar que no sea el mismo contacto que ya está abierto
      const contactoId = abrirChatCon.id || abrirChatCon.firebaseUid;
      const chatAbiertoId = chatAbierto?.contacto?.id || chatAbierto?.contacto?.firebaseUid;
      if (contactoId === chatAbiertoId) {
        console.log('⚠️ Chat ya está abierto para este contacto');
        navigation.setParams({ abrirChatCon: undefined });
        return;
      }
      
      chatAbiertoRef.current = true; // Marcar que ya se está abriendo
      console.log('🔄 Abriendo chat automáticamente con:', abrirChatCon.nombre);
      
      // Esperar a que las conversaciones se carguen
      const timeoutId = setTimeout(() => {
        abrirChat(abrirChatCon);
        // Limpiar el parámetro inmediatamente para evitar que se abra cada vez
        navigation.setParams({ abrirChatCon: undefined });
        // Resetear la bandera después de un momento
        setTimeout(() => {
          chatAbiertoRef.current = false;
        }, 3000);
      }, 800);
      
      // Cleanup
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [route?.params?.abrirChatCon, user?.id]);
  
  // Proteger el chat abierto - no permitir que se cierre accidentalmente
  useEffect(() => {
    // Si hay un chat abierto, asegurarse de que no se pierda el estado
    if (chatAbierto && !chatAbiertoRef.current) {
      // El chat está abierto y no se está abriendo, todo está bien
      console.log('✅ Chat abierto mantenido:', chatAbierto.contacto?.nombre);
    }
  }, [chatAbierto]);

  const sincronizarMensajesFirebase = async () => {
    // Evitar sincronizaciones simultáneas
    if (sincronizandoRef.current) {
      console.log('⚠️ Sincronización ya en curso, ignorando...');
      return;
    }
    
    try {
      sincronizandoRef.current = true;
      if (!database) {
        console.log('⚠️ Firebase database no está disponible para sincronizar');
        return;
      }
      
      const userId = await obtenerIdUsuario(user.id, user.firebaseUid);
      if (!userId) {
        console.log('⚠️ No hay userId para sincronizar mensajes');
        return;
      }
      
      console.log('🔄 Sincronizando mensajes desde Firebase para usuario:', userId);
      
      // Sincronizar todos los mensajes de Firebase a SQLite
      const conversacionesRef = database.ref('conversaciones');
      const snapshot = await conversacionesRef.once('value');
      const conversaciones = snapshot.val();
      
      if (!conversaciones) {
        console.log('⚠️ No hay conversaciones en Firebase');
        return;
      }
      
      console.log(`📋 Conversaciones encontradas en Firebase: ${Object.keys(conversaciones).length}`);
      let mensajesSincronizados = 0;
      
      for (const conversacionId in conversaciones) {
        const conversacion = conversaciones[conversacionId];
        const mensajes = conversacion.mensajes || {};
        
        // Verificar si esta conversación es para este usuario
        const mensajesArray = Object.values(mensajes);
        const esMiConversacion = mensajesArray.some(
          msg => {
            const msgRemitente = msg.remitenteId?.toString();
            const msgDestinatario = msg.destinatarioId?.toString();
            const myId = userId.toString();
            return msgRemitente === myId || msgDestinatario === myId;
          }
        );
        
        if (!esMiConversacion) continue;
        
        console.log(`📨 Sincronizando conversación ${conversacionId} con ${mensajesArray.length} mensajes`);
        
        // Guardar cada mensaje en SQLite
        for (const msgKey in mensajes) {
          const msg = mensajes[msgKey];
          try {
            const existe = await db.getFirstAsync(
              'SELECT id FROM mensajesChat WHERE firebaseMessageId = ?',
              [msg.firebaseMessageId || msgKey]
            );
            
            if (!existe) {
              await db.runAsync(
                `INSERT INTO mensajesChat (conversacionId, remitenteId, remitenteTipo, destinatarioId, destinatarioTipo, mensaje, tipo, leido, fechaEnvio, firebaseMessageId)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  msg.conversacionId || conversacionId,
                  msg.remitenteId?.toString(),
                  msg.remitenteTipo,
                  msg.destinatarioId?.toString(),
                  msg.destinatarioTipo,
                  msg.mensaje,
                  msg.tipo || 'texto',
                  msg.leido || 0,
                  msg.fechaEnvio,
                  msg.firebaseMessageId || msgKey
                ]
              );
              mensajesSincronizados++;
            }
          } catch (e) {
            console.error('❌ Error guardando mensaje en sincronización:', e);
          }
        }
      }
      
      console.log(`✅ Sincronización completada. ${mensajesSincronizados} mensajes nuevos guardados.`);
    } catch (error) {
      console.error('❌ Error sincronizando mensajes desde Firebase:', error);
      console.error('Detalles:', error.message, error.code);
    } finally {
      sincronizandoRef.current = false;
    }
  };

  const loadConversaciones = async () => {
    // Evitar cargar si ya se está cargando o si se cargó hace menos de 1 segundo
    const now = Date.now();
    if (cargandoConversacionesRef.current || (now - lastLoadTimeRef.current) < 1000) {
      console.log('⚠️ loadConversaciones ya en curso o muy reciente, ignorando...');
      return;
    }
    
    try {
      cargandoConversacionesRef.current = true;
      lastLoadTimeRef.current = now;
      setLoading(true);
      console.log('🔄 Cargando conversaciones para usuario:', user.id, user.firebaseUid);
      
      // Obtener todos los IDs posibles del usuario (id de SQLite y firebaseUid)
      const userIdSQLite = user.id?.toString();
      const userIdFirebase = user.firebaseUid?.toString();
      
      console.log('Buscando conversaciones con IDs:', { userIdSQLite, userIdFirebase });
      
      // Cargar todas las conversaciones que tienen mensajes
      // Buscar por ambos IDs posibles (como string)
      const mensajes = await db.getAllAsync(
        `SELECT DISTINCT conversacionId, 
                MAX(fechaEnvio) as ultimaFecha
         FROM mensajesChat
         WHERE (remitenteId = ? OR destinatarioId = ? OR remitenteId = ? OR destinatarioId = ? OR CAST(remitenteId AS TEXT) = ? OR CAST(destinatarioId AS TEXT) = ?)
         GROUP BY conversacionId
         ORDER BY ultimaFecha DESC`,
        [userIdSQLite, userIdSQLite, userIdFirebase, userIdFirebase, userIdSQLite, userIdSQLite]
      );
      
      console.log(`📋 Conversaciones encontradas en SQLite: ${mensajes.length}`);
      
      const conversacionesData = await Promise.all(
        mensajes.map(async (msg) => {
          // Obtener último mensaje
          const ultimoMensaje = await db.getFirstAsync(
            `SELECT * FROM mensajesChat 
             WHERE conversacionId = ? 
             ORDER BY fechaEnvio DESC 
             LIMIT 1`,
            [msg.conversacionId]
          );
          
          // Determinar el contacto
          const userIdSQLite = user.id;
          const userIdFirebase = user.firebaseUid;
          const remitenteId = ultimoMensaje?.remitenteId?.toString();
          const destinatarioId = ultimoMensaje?.destinatarioId?.toString();
          
          const esMio = remitenteId === userIdSQLite?.toString() || 
                       remitenteId === userIdFirebase?.toString();
          
          const contactoId = esMio ? destinatarioId : remitenteId;
          
          // Buscar el contacto en usuarios por id o firebaseUid
          const contacto = await db.getFirstAsync(
            'SELECT * FROM usuarios WHERE (id = ? OR firebaseUid = ? OR CAST(id AS TEXT) = ?) AND activo = 1',
            [contactoId, contactoId, contactoId]
          );
          
          if (!contacto) {
            console.log('Contacto no encontrado para ID:', contactoId);
            return null;
          }
          
          // Contar no leídos usando ambos IDs posibles
          const noLeidos = await db.getFirstAsync(
            `SELECT COUNT(*) as count FROM mensajesChat 
             WHERE conversacionId = ? 
             AND (destinatarioId = ? OR destinatarioId = ?)
             AND leido = 0`,
            [msg.conversacionId, userIdSQLite, userIdFirebase]
          );
          
          return {
            id: msg.conversacionId,
            contacto: contacto,
            ultimoMensaje: ultimoMensaje?.mensaje || 'Sin mensajes',
            ultimoMensajeFecha: ultimoMensaje?.fechaEnvio || null,
            noLeidos: noLeidos?.count || 0
          };
        })
      );
      
      const conversacionesFiltradas = conversacionesData.filter(c => c !== null);
      console.log(`✅ Conversaciones cargadas: ${conversacionesFiltradas.length}`);
      setConversaciones(conversacionesFiltradas);
      
      // Si no hay conversaciones en SQLite, intentar sincronizar desde Firebase
      if (conversacionesFiltradas.length === 0 && database) {
        console.log('⚠️ No hay conversaciones en SQLite, sincronizando desde Firebase...');
        await sincronizarMensajesFirebase();
        // Recargar después de sincronizar
        const mensajesDespues = await db.getAllAsync(
          `SELECT DISTINCT conversacionId, 
                  MAX(fechaEnvio) as ultimaFecha
           FROM mensajesChat
           WHERE (remitenteId = ? OR destinatarioId = ? OR remitenteId = ? OR destinatarioId = ? OR CAST(remitenteId AS TEXT) = ? OR CAST(destinatarioId AS TEXT) = ?)
           GROUP BY conversacionId
           ORDER BY ultimaFecha DESC`,
          [userIdSQLite, userIdSQLite, userIdFirebase, userIdFirebase, userIdSQLite, userIdSQLite]
        );
        
        if (mensajesDespues.length > 0) {
          console.log(`✅ Conversaciones encontradas después de sincronizar: ${mensajesDespues.length}`);
          // Recargar las conversaciones con debounce para evitar múltiples llamadas
          debounceLoadConversaciones();
        }
      }
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
      console.error('Detalles:', error.message, error.stack);
      Alert.alert('Error', 'No se pudieron cargar las conversaciones');
    } finally {
      setLoading(false);
      cargandoConversacionesRef.current = false;
    }
  };

  const setupRealtimeListener = () => {
    // Escuchar cambios en Firebase - pero MUY restrictivo para evitar loops
    // DESHABILITADO temporalmente porque causa que el chat se cierre/abra
    // El listener específico del chat ya maneja los mensajes nuevos
    if (!user?.id || !database) return;
    
    // NO configurar listener global - causa demasiadas sincronizaciones
    // Los mensajes nuevos se manejan por el listener específico del chat
    console.log('⚠️ Listener global deshabilitado para evitar loops');
  };
  
  const debounceLoadConversaciones = () => {
    // Limpiar timeout anterior
    if (loadConversacionesTimeoutRef.current) {
      clearTimeout(loadConversacionesTimeoutRef.current);
    }
    // Esperar 2 segundos antes de recargar para evitar múltiples llamadas
    loadConversacionesTimeoutRef.current = setTimeout(() => {
      loadConversaciones();
      loadConversacionesTimeoutRef.current = null;
    }, 2000);
  };

  const generarConversacionId = (id1, id2) => {
    // Normalizar IDs a string y ordenar
    const ids = [String(id1), String(id2)].sort();
    return `${ids[0]}_${ids[1]}`;
  };

  const obtenerIdUsuario = async (userId, firebaseUid) => {
    // Intentar obtener el firebaseUid si tenemos el id de SQLite
    if (userId && !firebaseUid) {
      try {
        const usuario = await db.getFirstAsync(
          'SELECT firebaseUid FROM usuarios WHERE id = ? OR firebaseUid = ?',
          [userId, userId]
        );
        return usuario?.firebaseUid || userId;
      } catch (e) {
        console.error('Error obteniendo firebaseUid:', e);
      }
    }
    return firebaseUid || userId;
  };

  const abrirChat = async (contacto) => {
    if (!contacto) {
      console.error('No se proporcionó contacto para abrir chat');
      return;
    }
    
    // Evitar abrir el mismo chat dos veces
    if (chatAbierto?.contacto?.id === contacto.id || chatAbierto?.contacto?.firebaseUid === contacto.firebaseUid) {
      console.log('⚠️ Chat ya está abierto para este contacto, ignorando...');
      return;
    }
    
    // Si ya hay un chat abierto, limpiar el listener anterior
    if (listenerRef.current && chatAbierto?.conversacionId && database) {
      console.log('Limpiando listener anterior para:', chatAbierto.conversacionId);
      try {
        const mensajesRefAnterior = database.ref(`conversaciones/${chatAbierto.conversacionId}/mensajes`);
        mensajesRefAnterior.off('child_added', listenerRef.current);
      } catch (e) {
        console.error('Error limpiando listener anterior:', e);
      }
      listenerRef.current = null;
    }
    
    // Siempre usar firebaseUid para consistencia
    const userId = await obtenerIdUsuario(user.id, user.firebaseUid);
    const contactoId = await obtenerIdUsuario(contacto.id, contacto.firebaseUid);
    
    if (!userId || !contactoId) {
      console.error('Faltan IDs para generar conversacionId', { userId, contactoId, user, contacto });
      Alert.alert('Error', 'No se pudo abrir el chat. Faltan datos del contacto.');
      return;
    }
    
    const conversacionId = generarConversacionId(userId, contactoId);
    console.log('Abriendo chat con conversacionId:', conversacionId, 'userId:', userId, 'contactoId:', contactoId, 'contacto:', contacto.nombre);
    
    // Guardar el contacto con todos los IDs necesarios
    const contactoCompleto = {
      ...contacto,
      id: contacto.id,
      firebaseUid: contacto.firebaseUid || contactoId,
      idSQLite: contacto.id,
      idFirebase: contacto.firebaseUid || contactoId
    };
    
    setChatAbierto({ contacto: contactoCompleto, conversacionId, userId, contactoId });
    await loadMensajes(conversacionId, contactoCompleto, userId, contactoId);
    setupChatRealtimeListener(conversacionId);
  };

  const cerrarChat = () => {
    // Limpiar listener antes de cerrar
    if (listenerRef.current && chatAbierto?.conversacionId && database) {
      console.log('Limpiando listener al cerrar chat');
      try {
        const mensajesRef = database.ref(`conversaciones/${chatAbierto.conversacionId}/mensajes`);
        mensajesRef.off('child_added', listenerRef.current);
      } catch (e) {
        console.error('Error limpiando listener:', e);
      }
      listenerRef.current = null;
    }
    setChatAbierto(null);
    setMensajes([]);
    setNuevoMensaje('');
    chatAbiertoRef.current = false;
  };

  const loadMensajes = async (conversacionId, contacto = null, userId = null, contactoId = null) => {
    try {
      setLoadingMensajes(true);
      console.log('Cargando mensajes para conversación:', conversacionId);
      
      // Usar los parámetros si están disponibles, sino usar chatAbierto
      const contactoActual = contacto || chatAbierto?.contacto;
      const userIdActual = userId || (await obtenerIdUsuario(user.id, user.firebaseUid));
      const contactoIdActual = contactoId || (contactoActual ? await obtenerIdUsuario(contactoActual.id, contactoActual.firebaseUid) : null);
      
      if (!userIdActual || !contactoIdActual) {
        console.error('Faltan IDs para cargar mensajes', { userIdActual, contactoIdActual });
        setMensajes([]);
        setLoadingMensajes(false);
        return;
      }
      
      // Buscar todos los posibles conversacionIds (puede haber variaciones)
      const userIdSQLite = user.id?.toString();
      const userIdFirebase = user.firebaseUid?.toString();
      const contactoIdSQLite = contactoActual?.id?.toString();
      const contactoIdFirebase = contactoActual?.firebaseUid?.toString() || contactoIdActual?.toString();
      
      // Generar todas las posibles combinaciones de conversacionId (solo las válidas)
      const posiblesIds = [
        conversacionId,
        userIdSQLite && contactoIdSQLite ? generarConversacionId(userIdSQLite, contactoIdSQLite) : null,
        userIdSQLite && contactoIdFirebase ? generarConversacionId(userIdSQLite, contactoIdFirebase) : null,
        userIdFirebase && contactoIdSQLite ? generarConversacionId(userIdFirebase, contactoIdSQLite) : null,
        userIdFirebase && contactoIdFirebase ? generarConversacionId(userIdFirebase, contactoIdFirebase) : null
      ].filter(Boolean);
      
      const conversacionIdsUnicos = [...new Set(posiblesIds)];
      console.log('Buscando mensajes con conversacionIds:', conversacionIdsUnicos, 'userIdActual:', userIdActual, 'contactoIdActual:', contactoIdActual);
      
      // Primero sincronizar desde Firebase - buscar en todas las posibles conversaciones
      let mensajesSincronizados = 0;
      if (!database) {
        console.error('Firebase database no está disponible');
      } else {
        for (const cId of conversacionIdsUnicos) {
          try {
            console.log(`Buscando mensajes en Firebase para conversacionId: ${cId}`);
            const mensajesRef = database.ref(`conversaciones/${cId}/mensajes`);
            const snapshot = await mensajesRef.once('value');
            const firebaseMensajes = snapshot.val();
            
            if (firebaseMensajes) {
              const mensajesArray = Object.values(firebaseMensajes);
              console.log(`✅ Mensajes encontrados en Firebase para ${cId}:`, mensajesArray.length);
              
              // Guardar todos los mensajes de Firebase en SQLite
              for (const msg of mensajesArray) {
                try {
                  const existe = await db.getFirstAsync(
                    'SELECT id FROM mensajesChat WHERE firebaseMessageId = ?',
                    [msg.firebaseMessageId]
                  );
                  
                  if (!existe) {
                    // Normalizar el conversacionId al principal
                    await db.runAsync(
                      `INSERT INTO mensajesChat (conversacionId, remitenteId, remitenteTipo, destinatarioId, destinatarioTipo, mensaje, tipo, leido, fechaEnvio, firebaseMessageId)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [
                        conversacionId, // Usar el conversacionId principal
                        msg.remitenteId?.toString(),
                        msg.remitenteTipo,
                        msg.destinatarioId?.toString(),
                        msg.destinatarioTipo,
                        msg.mensaje,
                        msg.tipo || 'texto',
                        msg.leido || 0,
                        msg.fechaEnvio,
                        msg.firebaseMessageId
                      ]
                    );
                    mensajesSincronizados++;
                    console.log(`Mensaje guardado en SQLite: ${msg.mensaje?.substring(0, 20)}...`);
                  } else {
                    console.log(`Mensaje ya existe en SQLite: ${msg.firebaseMessageId}`);
                  }
                } catch (e) {
                  console.error('Error guardando mensaje individual:', e);
                }
              }
            } else {
              console.log(`⚠️ No hay mensajes en Firebase para ${cId}`);
            }
          } catch (error) {
            console.error(`❌ Error sincronizando desde Firebase para ${cId}:`, error);
            console.error('Detalles del error:', error.message, error.code);
          }
        }
      }
      
      console.log(`Total mensajes sincronizados desde Firebase: ${mensajesSincronizados}`);
      
      // Cargar desde SQLite - buscar por todos los posibles conversacionIds
      let result = [];
      if (conversacionIdsUnicos.length > 0) {
        const placeholders = conversacionIdsUnicos.map(() => '?').join(',');
        result = await db.getAllAsync(
          `SELECT * FROM mensajesChat
           WHERE conversacionId IN (${placeholders})
           ORDER BY fechaEnvio ASC`,
          conversacionIdsUnicos
        );
      }
      console.log('Mensajes cargados desde SQLite:', result?.length || 0);
      
      // Filtrar duplicados por firebaseMessageId o id
      const mensajesUnicos = [];
      const mensajesVistos = new Set();
      for (const msg of result) {
        const clave = msg.firebaseMessageId || `sqlite_${msg.id}`;
        if (!mensajesVistos.has(clave)) {
          mensajesVistos.add(clave);
          mensajesUnicos.push(msg);
        }
      }
      result = mensajesUnicos;
      console.log('Mensajes únicos después de filtrar duplicados:', result.length);
      
      // Si no hay mensajes en SQLite pero hay en Firebase, intentar cargar directamente desde Firebase
      if (result.length === 0 && conversacionIdsUnicos.length > 0 && database) {
        console.log('⚠️ No hay mensajes en SQLite, intentando cargar directamente desde Firebase...');
        try {
          const mensajesRef = database.ref(`conversaciones/${conversacionId}/mensajes`);
          const snapshot = await mensajesRef.once('value');
          const firebaseMensajes = snapshot.val();
          
          if (firebaseMensajes) {
            const mensajesArray = Object.values(firebaseMensajes).sort((a, b) => {
              const timestampA = a.timestamp || new Date(a.fechaEnvio).getTime();
              const timestampB = b.timestamp || new Date(b.fechaEnvio).getTime();
              return timestampA - timestampB;
            });
            
            // Filtrar duplicados
            const mensajesUnicos = [];
            const mensajesVistos = new Set();
            for (const msg of mensajesArray) {
              const clave = msg.firebaseMessageId || `temp_${msg.timestamp}_${msg.mensaje?.substring(0, 10)}`;
              if (!mensajesVistos.has(clave)) {
                mensajesVistos.add(clave);
                mensajesUnicos.push(msg);
              }
            }
            
            console.log('✅ Mensajes cargados directamente desde Firebase:', mensajesUnicos.length, '(filtrados de', mensajesArray.length, ')');
            setMensajes(mensajesUnicos);
            setLoadingMensajes(false);
            return;
          } else {
            console.log('⚠️ No hay mensajes en Firebase para esta conversación');
          }
        } catch (error) {
          console.error('❌ Error cargando directamente desde Firebase:', error);
        }
      }
      
      setMensajes(result || []);
      
      // Marcar mensajes como leídos usando ambos IDs posibles
      if (conversacionIdsUnicos.length > 0 && (userIdSQLite || userIdFirebase)) {
        const placeholdersUpdate = conversacionIdsUnicos.map(() => '?').join(',');
        const paramsUpdate = [...conversacionIdsUnicos];
        if (userIdSQLite) paramsUpdate.push(userIdSQLite);
        if (userIdFirebase) paramsUpdate.push(userIdFirebase);
        
        const whereClause = [];
        if (userIdSQLite) whereClause.push('destinatarioId = ?');
        if (userIdFirebase) whereClause.push('destinatarioId = ?');
        
        if (whereClause.length > 0) {
          await db.runAsync(
            `UPDATE mensajesChat SET leido = 1 
             WHERE conversacionId IN (${placeholdersUpdate})
             AND (${whereClause.join(' OR ')})
             AND leido = 0`,
            paramsUpdate
          );
        }
      }
      
      // NO recargar conversaciones desde aquí - se recargará cuando sea necesario
      // Esto evita loops infinitos cuando se cargan mensajes
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    } finally {
      setLoadingMensajes(false);
    }
  };

  const setupChatRealtimeListener = (conversacionId) => {
    if (!conversacionId || !database) return;
    
    // Limpiar listener anterior si existe
    if (listenerRef.current) {
      const mensajesRefAnterior = database.ref(`conversaciones/${conversacionId}/mensajes`);
      mensajesRefAnterior.off('child_added', listenerRef.current);
    }
    
    // Obtener el timestamp actual para filtrar solo mensajes nuevos
    const timestampActual = Date.now();
    ultimoTimestampRef.current = timestampActual;
    
    const mensajesRef = database.ref(`conversaciones/${conversacionId}/mensajes`);
    const listener = async (snapshot) => {
      const nuevoMensaje = snapshot.val();
      const mensajeId = nuevoMensaje.firebaseMessageId || snapshot.key;
      
      // Filtrar mensajes históricos - solo procesar mensajes nuevos
      const mensajeTimestamp = nuevoMensaje.timestamp || new Date(nuevoMensaje.fechaEnvio).getTime();
      const tiempoDesdeConfiguracion = Date.now() - ultimoTimestampRef.current;
      // Solo procesar mensajes que son más nuevos que cuando se configuró el listener (con margen de 3 segundos)
      if (mensajeTimestamp < (ultimoTimestampRef.current - 3000)) {
        // Mensaje es más antiguo que 3 segundos antes de configurar el listener = mensaje histórico
        console.log('⚠️ Ignorando mensaje histórico:', mensajeId, 'timestamp:', mensajeTimestamp, 'configurado en:', ultimoTimestampRef.current);
        return;
      }
      
      console.log('📨 Nuevo mensaje recibido en tiempo real:', mensajeId);
      
      // Guardar en SQLite si no existe
      try {
        const existe = await db.getFirstAsync(
          'SELECT id FROM mensajesChat WHERE firebaseMessageId = ?',
          [mensajeId]
        );
        
        if (!existe) {
          await db.runAsync(
            `INSERT INTO mensajesChat (conversacionId, remitenteId, remitenteTipo, destinatarioId, destinatarioTipo, mensaje, tipo, leido, fechaEnvio, firebaseMessageId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              nuevoMensaje.conversacionId,
              nuevoMensaje.remitenteId,
              nuevoMensaje.remitenteTipo,
              nuevoMensaje.destinatarioId,
              nuevoMensaje.destinatarioTipo,
              nuevoMensaje.mensaje,
              nuevoMensaje.tipo || 'texto',
              nuevoMensaje.leido || 0,
              nuevoMensaje.fechaEnvio,
              mensajeId
            ]
          );
          console.log('✅ Mensaje guardado en SQLite desde listener');
        } else {
          console.log('⚠️ Mensaje ya existe en SQLite, ignorando');
        }
      } catch (error) {
        console.error('❌ Error guardando mensaje de Firebase en SQLite:', error);
      }
      
      // Agregar al estado solo si no existe
      setMensajes(prev => {
        const mensajeIdSQLite = nuevoMensaje.id?.toString();
        const mensajeIdFirebase = mensajeId;
        
        // Verificar por ambos IDs posibles
        const existe = prev.find(m => {
          const mIdSQLite = m.id?.toString();
          const mIdFirebase = m.firebaseMessageId;
          return mIdFirebase === mensajeIdFirebase || 
                 mIdSQLite === mensajeIdSQLite ||
                 (m.firebaseMessageId === snapshot.key) ||
                 (m.id?.toString() === mensajeIdSQLite && mensajeIdSQLite);
        });
        
        if (existe) {
          console.log('⚠️ Mensaje ya existe en el estado, ignorando duplicado');
          return prev;
        }
        
        console.log('✅ Agregando mensaje al estado');
        // Filtrar duplicados antes de agregar
        const mensajesUnicos = [...prev];
        const mensajesVistos = new Set();
        mensajesUnicos.forEach(m => {
          const clave = m.firebaseMessageId || `sqlite_${m.id}`;
          mensajesVistos.add(clave);
        });
        
        // Agregar el nuevo mensaje si no está duplicado
        const claveNuevo = mensajeIdFirebase || `sqlite_${mensajeIdSQLite}`;
        if (!mensajesVistos.has(claveNuevo)) {
          mensajesUnicos.push(nuevoMensaje);
        }
        
        const nuevos = mensajesUnicos.sort((a, b) => {
          const timestampA = a.timestamp || new Date(a.fechaEnvio).getTime();
          const timestampB = b.timestamp || new Date(b.fechaEnvio).getTime();
          return timestampA - timestampB;
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        return nuevos;
      });
      
      // Marcar como leído si es para este usuario y el chat está abierto
      const userIdActual = user.id?.toString() || user.firebaseUid?.toString();
      const esParaMi = nuevoMensaje.destinatarioId?.toString() === userIdActual;
      if (esParaMi && chatAbierto) {
        db.runAsync(
          `UPDATE mensajesChat SET leido = 1 WHERE firebaseMessageId = ?`,
          [mensajeId]
        ).catch(console.error);
      }
      
      // Actualizar el último mensaje en la lista de conversaciones localmente
      // sin recargar toda la lista para evitar que el chat se cierre
      if (nuevoMensaje.conversacionId) {
        setConversaciones(prev => prev.map(conv => {
          if (conv.id === nuevoMensaje.conversacionId) {
            return {
              ...conv,
              ultimoMensaje: nuevoMensaje.mensaje,
              ultimoMensajeFecha: nuevoMensaje.fechaEnvio,
              // Si el mensaje es para mí y el chat está abierto, no incrementar no leídos
              // Si el mensaje es para mí y el chat NO está abierto, incrementar no leídos
              // Si el mensaje es de mí, no cambiar no leídos
              noLeidos: esParaMi 
                ? (chatAbierto ? Math.max(0, (conv.noLeidos || 0) - 1) : (conv.noLeidos || 0) + 1)
                : conv.noLeidos
            };
          }
          return conv;
        }));
      }
    };
    
    // Guardar referencia al listener para poder limpiarlo después
    listenerRef.current = listener;
    mensajesRef.on('child_added', listener);
    console.log('✅ Listener de tiempo real configurado para:', conversacionId);
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !chatAbierto) return;

    const remitenteTipo = userRole;
    const destinatarioTipo = RoleService.isMedico(userRole) ? 'paciente' : 'medico';
    
    // Siempre usar firebaseUid para consistencia
    const remitenteId = await obtenerIdUsuario(user.id, user.firebaseUid);
    const destinatarioId = await obtenerIdUsuario(chatAbierto.contacto.id, chatAbierto.contacto.firebaseUid);
    
    if (!remitenteId || !destinatarioId) {
      console.error('Faltan IDs para enviar mensaje', { remitenteId, destinatarioId });
      Alert.alert('Error', 'No se pudo enviar el mensaje. Faltan datos.');
      return;
    }

    try {
      const mensaje = {
        conversacionId: chatAbierto.conversacionId,
        remitenteId: remitenteId.toString(),
        remitenteTipo,
        destinatarioId: destinatarioId.toString(),
        destinatarioTipo,
        mensaje: nuevoMensaje.trim(),
        tipo: 'texto',
        leido: 0,
        fechaEnvio: new Date().toISOString(),
        timestamp: Date.now()
      };

      console.log('📤 Enviando mensaje:', {
        conversacionId: mensaje.conversacionId,
        remitenteId: mensaje.remitenteId,
        destinatarioId: mensaje.destinatarioId,
        mensaje: mensaje.mensaje.substring(0, 20) + '...'
      });

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
      console.log('✅ Mensaje guardado en SQLite con ID:', mensaje.id);

      // Guardar en Firebase
      let firebaseMessageId = null;
      if (!database) {
        console.error('❌ Firebase database no está disponible para guardar mensaje');
        Alert.alert('Error', 'No se pudo conectar con Firebase. El mensaje se guardó localmente.');
      } else {
        try {
          const mensajesRef = database.ref(`conversaciones/${chatAbierto.conversacionId}/mensajes`);
          const nuevoMensajeRef = mensajesRef.push();
          firebaseMessageId = nuevoMensajeRef.key;
          const mensajeFirebase = {
            ...mensaje,
            firebaseMessageId: firebaseMessageId
          };
          
          console.log('💾 Guardando en Firebase en ruta:', `conversaciones/${chatAbierto.conversacionId}/mensajes/${firebaseMessageId}`);
          await nuevoMensajeRef.set(mensajeFirebase);
          console.log('✅ Mensaje guardado en Firebase con ID:', firebaseMessageId);

          // Actualizar SQLite con firebaseMessageId
          await db.runAsync(
            'UPDATE mensajesChat SET firebaseMessageId = ? WHERE id = ?',
            [firebaseMessageId, mensaje.id]
          );
          console.log('✅ SQLite actualizado con firebaseMessageId');
        } catch (firebaseError) {
          console.error('❌ Error guardando en Firebase:', firebaseError);
          console.error('Detalles:', firebaseError.message, firebaseError.code);
          Alert.alert('Error', 'No se pudo guardar el mensaje en Firebase. El mensaje se guardó localmente.');
        }
      }

      // Actualizar último mensaje en conversación
      await db.runAsync(
        `INSERT OR REPLACE INTO conversaciones (conversacionId, pacienteId, medicoId, ultimoMensaje, ultimoMensajeFecha, activa)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          chatAbierto.conversacionId,
          RoleService.isMedico(userRole) ? chatAbierto.contacto.id : user.id,
          RoleService.isMedico(userRole) ? user.id : chatAbierto.contacto.id,
          mensaje.mensaje,
          mensaje.fechaEnvio,
          1
        ]
      );

      setNuevoMensaje('');
      // NO agregar manualmente al estado - el listener de Firebase lo agregará automáticamente
      // Esto evita duplicados
      console.log('✅ Mensaje enviado, el listener de Firebase lo agregará al estado');
      
      // Actualizar el último mensaje en la lista de conversaciones localmente
      // sin recargar toda la lista para evitar que el chat se cierre
      setConversaciones(prev => prev.map(conv => {
        if (conv.id === chatAbierto.conversacionId) {
          return {
            ...conv,
            ultimoMensaje: mensaje.mensaje,
            ultimoMensajeFecha: mensaje.fechaEnvio
          };
        }
        return conv;
      }));
      
      // NO recargar conversaciones - la actualización local es suficiente
      // Esto evita que el chat se cierre y se abra
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      console.error('Detalles:', error.message, error.stack);
      Alert.alert('Error', 'No se pudo enviar el mensaje: ' + error.message);
    }
  };

  const renderConversacion = ({ item }) => {
    const fechaFormateada = item.ultimoMensajeFecha
      ? new Date(item.ultimoMensajeFecha).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '';

    return (
      <TouchableOpacity
        style={styles.conversacionCard}
        onPress={() => abrirChat(item.contacto)}
      >
        <View style={styles.avatarContainer}>
          <MaterialCommunityIcons
            name={RoleService.isMedico(userRole) ? 'account' : 'doctor'}
            size={40}
            color="#2196F3"
          />
          {item.noLeidos > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.noLeidos}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversacionInfo}>
          <View style={styles.conversacionHeader}>
            <Text style={styles.contactoNombre}>{item.contacto.nombre}</Text>
            {fechaFormateada && (
              <Text style={styles.fecha}>{fechaFormateada}</Text>
            )}
          </View>
          <Text style={styles.ultimoMensaje} numberOfLines={1}>
            {item.ultimoMensaje}
          </Text>
        </View>
        
        <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
      </TouchableOpacity>
    );
  };

  const renderMensaje = ({ item }) => {
    const esMio = item.remitenteId === (user.id || user.firebaseUid);
    
    return (
      <View style={[styles.mensajeContainer, esMio ? styles.mensajeMio : styles.mensajeOtro]}>
        <Text style={[styles.mensajeTexto, esMio ? styles.mensajeTextoMio : styles.mensajeTextoOtro]}>
          {item.mensaje}
        </Text>
        <Text style={[styles.mensajeFecha, esMio ? styles.mensajeFechaMio : styles.mensajeFechaOtro]}>
          {new Date(item.fechaEnvio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando conversaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversaciones}
        renderItem={renderConversacion}
        keyExtractor={(item) => {
          // Usar conversacionId como clave única
          if (item.id) return `conv_${item.id}`;
          return `conv_${item.contacto?.id || item.contacto?.firebaseUid || Date.now()}`;
        }}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="message-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {RoleService.isMedico(userRole)
                ? 'No tienes conversaciones con pacientes'
                : 'No tienes conversaciones con médicos'}
            </Text>
            <Text style={styles.emptySubtext}>
              {RoleService.isMedico(userRole)
                ? 'Los pacientes pueden iniciar una conversación contigo'
                : 'Busca un médico y envía un mensaje para iniciar una conversación'}
            </Text>
          </View>
        }
      />

      {/* Modal de Chat */}
      <Modal
        visible={chatAbierto !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={cerrarChat}
      >
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={90}
        >
          {/* Header del Chat */}
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={cerrarChat}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderNombre}>
                {chatAbierto?.contacto?.nombre}
              </Text>
              {chatAbierto?.contacto?.especialidad && (
                <Text style={styles.chatHeaderEspecialidad}>
                  {chatAbierto.contacto.especialidad}
                </Text>
              )}
            </View>
            {/* Botón Agendar Cita solo para pacientes */}
            {!RoleService.isMedico(userRole) && chatAbierto?.contacto && (
              <TouchableOpacity
                style={styles.agendarCitaButton}
                onPress={() => {
                  cerrarChat();
                  navigation.navigate('AgendarCita', { 
                    medico: chatAbierto.contacto 
                  });
                }}
              >
                <MaterialCommunityIcons name="calendar-check" size={20} color="#4CAF50" />
              </TouchableOpacity>
            )}
          </View>

          {/* Lista de Mensajes */}
          {loadingMensajes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={mensajes}
              renderItem={renderMensaje}
              keyExtractor={(item, index) => {
                // Usar firebaseMessageId primero (más único), luego id de SQLite, luego index
                // Agregar index para garantizar unicidad incluso si hay duplicados
                if (item.firebaseMessageId) return `firebase_${item.firebaseMessageId}_${index}`;
                if (item.id) return `sqlite_${item.id}_${index}`;
                // Si no hay ID, usar timestamp y mensaje para crear una clave única
                const timestamp = item.timestamp || new Date(item.fechaEnvio).getTime();
                const mensajeHash = item.mensaje?.substring(0, 10) || '';
                return `msg_${timestamp}_${mensajeHash}_${index}`;
              }}
              contentContainerStyle={styles.mensajesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          {/* Input de Mensaje */}
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribe un mensaje..."
              value={nuevoMensaje}
              onChangeText={setNuevoMensaje}
              multiline
              maxLength={500}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={[styles.chatSendButton, !nuevoMensaje.trim() && styles.chatSendButtonDisabled]}
              onPress={enviarMensaje}
              disabled={!nuevoMensaje.trim()}
            >
              <MaterialCommunityIcons name="send" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  listContainer: {
    padding: 15,
  },
  conversacionCard: {
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
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversacionInfo: {
    flex: 1,
  },
  conversacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  contactoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  fecha: {
    fontSize: 12,
    color: '#666',
  },
  ultimoMensaje: {
    fontSize: 14,
    color: '#666',
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
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chatHeaderInfo: {
    marginLeft: 15,
    flex: 1,
  },
  chatHeaderNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chatHeaderEspecialidad: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  agendarCitaButton: {
    marginLeft: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
  },
  mensajesList: {
    padding: 15,
  },
  mensajeContainer: {
    maxWidth: '75%',
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
  },
  mensajeMio: {
    alignSelf: 'flex-end',
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  mensajeOtro: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  mensajeTexto: {
    fontSize: 16,
    marginBottom: 4,
  },
  mensajeTextoMio: {
    color: '#fff',
  },
  mensajeTextoOtro: {
    color: '#333',
  },
  mensajeFecha: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  mensajeFechaMio: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  mensajeFechaOtro: {
    color: '#999',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#333',
  },
  chatSendButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default ConversacionesScreen;

