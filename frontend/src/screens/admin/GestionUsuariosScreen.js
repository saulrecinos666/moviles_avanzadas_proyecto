import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../../context/UserContext';
import RoleService from '../../services/RoleService';
import { auth, firestore } from '../../config/firebase';
import { saveUserToSQLite } from '../../db/userHelper';
import * as Crypto from 'expo-crypto';

const GestionUsuariosScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const { user, updateUser } = useUser();
  const userRole = user?.rol || 'admin';
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarAgregarUsuario, setMostrarAgregarUsuario] = useState(false);
  const [nuevoUsuarioEmail, setNuevoUsuarioEmail] = useState('');
  const [nuevoUsuarioUID, setNuevoUsuarioUID] = useState('');
  const [nuevoUsuarioNombre, setNuevoUsuarioNombre] = useState('');
  const sincronizandoRef = React.useRef(false);

  useEffect(() => {
    // Validar permisos - solo admin puede gestionar usuarios
    console.log('GestionUsuariosScreen - Rol del usuario:', userRole);
    console.log('GestionUsuariosScreen - Es admin?', RoleService.isAdmin(userRole));
    console.log('GestionUsuariosScreen - Puede gestionar usuarios?', RoleService.canPerformAction(userRole, 'gestionar_usuarios'));
    
    if (!RoleService.isAdmin(userRole)) {
      Alert.alert(
        'Acceso Denegado',
        'Solo los administradores pueden gestionar usuarios.',
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
    loadUsuarios();
  }, [userRole, user]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      // Cargar todos los usuarios (activo = 1, activo IS NULL, o activo = 0)
      const result = await db.getAllAsync(
        'SELECT * FROM usuarios ORDER BY fechaRegistro DESC'
      );
      console.log('Usuarios cargados desde SQLite:', result.length, result);
      setUsuarios(result || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const mostrarSelectorRol = (usuarioId, rolActual) => {
    if (!RoleService.isAdmin(userRole)) {
      Alert.alert('Error', 'Solo los administradores pueden asignar roles');
      return;
    }

    const roles = [
      { value: 'paciente', label: 'Paciente' },
      { value: 'medico', label: 'Médico' },
      { value: 'admin', label: 'Administrador' }
    ];

    Alert.alert(
      'Cambiar Rol',
      'Selecciona el nuevo rol:',
      [
        ...roles.map(rol => ({
          text: rol.label,
          onPress: () => cambiarRol(usuarioId, rol.value)
        })),
        { text: 'Cancelar', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  const cambiarRol = async (usuarioId, nuevoRol) => {
    try {
      // Obtener el usuario antes de actualizar
      const usuarioActualizado = usuarios.find(u => u.id === usuarioId);
      if (!usuarioActualizado) {
        Alert.alert('Error', 'Usuario no encontrado');
        return;
      }
      
      // Actualizar en SQLite
      await db.runAsync(
        'UPDATE usuarios SET rol = ? WHERE id = ?',
        [nuevoRol, usuarioId]
      );
      
      // Actualizar en Firestore si tiene firebaseUid
      if (usuarioActualizado.firebaseUid && firestore) {
        try {
          await firestore.collection('usuarios').doc(usuarioActualizado.firebaseUid).update({
            rol: nuevoRol
          });
          console.log('✅ Rol actualizado en Firestore');
        } catch (firestoreError) {
          console.error('⚠️ Error actualizando rol en Firestore:', firestoreError);
          // No es crítico, continuar
        }
      }
      
      // Si es el usuario actual, actualizar también AsyncStorage
      if (usuarioActualizado.firebaseUid === user?.id || usuarioActualizado.firebaseUid === user?.firebaseUid) {
        await updateUser({ rol: nuevoRol });
      }
      
      loadUsuarios();
      Alert.alert('Éxito', 'Rol actualizado correctamente');
    } catch (error) {
      console.error('Error al cambiar rol:', error);
      Alert.alert('Error', 'No se pudo actualizar el rol');
    }
  };

  const desactivarUsuario = async (usuarioId, nombre) => {
    if (!RoleService.isAdmin(userRole)) {
      Alert.alert('Error', 'Solo los administradores pueden desactivar usuarios');
      return;
    }

    Alert.alert(
      'Desactivar Usuario',
      `¿Estás seguro de desactivar a ${nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(
                'UPDATE usuarios SET activo = 0 WHERE id = ?',
                [usuarioId]
              );
              loadUsuarios();
              Alert.alert('Éxito', 'Usuario desactivado correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo desactivar el usuario');
            }
          }
        }
      ]
    );
  };

  const usuariosFiltrados = busqueda.trim()
    ? usuarios.filter(u => 
        u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : usuarios;

  const renderUsuario = ({ item }) => (
    <View style={styles.usuarioCard}>
      <View style={styles.usuarioHeader}>
        <View style={styles.usuarioInfo}>
          <Text style={styles.usuarioNombre}>{item.nombre}</Text>
          <Text style={styles.usuarioEmail}>{item.email}</Text>
          <View style={styles.rolBadge}>
            <MaterialCommunityIcons 
              name={RoleService.getRoleIcon(item.rol)} 
              size={16} 
              color="#2196F3" 
            />
            <Text style={styles.rolText}>{RoleService.getRoleName(item.rol)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.usuarioActions}>
        <TouchableOpacity
          style={styles.rolButton}
          onPress={() => mostrarSelectorRol(item.id, item.rol)}
        >
          <MaterialCommunityIcons name="account-switch" size={18} color="#2196F3" />
          <Text style={styles.rolButtonText}>Cambiar Rol</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.desactivarButton}
          onPress={() => desactivarUsuario(item.id, item.nombre)}
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
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  const sincronizarUsuariosFirebase = async () => {
    // Prevenir ejecuciones duplicadas
    if (sincronizandoRef.current) {
      console.log('⚠️ Sincronización ya en progreso, ignorando llamada duplicada');
      return;
    }

    try {
      Alert.alert(
        'Sincronizar Usuarios',
        '¿Deseas sincronizar usuarios desde Firestore? Esto creará en SQLite los usuarios que existan en Firestore pero no estén en la base de datos local.\n\nNota: Si un usuario se registró directamente en Firebase Console, primero debes agregarlo manualmente usando el botón "+".',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sincronizar',
            onPress: async () => {
              if (sincronizandoRef.current) {
                console.log('⚠️ Sincronización ya en progreso');
                return;
              }

              try {
                sincronizandoRef.current = true;
                setLoading(true);
                let usuariosSincronizados = 0;
                let usuariosActualizados = 0;
                
                if (!firestore) {
                  Alert.alert('Error', 'Firestore no está configurado');
                  setLoading(false);
                  sincronizandoRef.current = false;
                  return;
                }
                
                // Obtener todos los usuarios de Firestore
                console.log('🔄 Sincronizando usuarios desde Firestore...');
                const usuariosSnapshot = await firestore.collection('usuarios').get();
                
                if (usuariosSnapshot.empty) {
                  Alert.alert(
                    'Info', 
                    'No hay usuarios en Firestore para sincronizar.\n\nSi hay usuarios en Firebase Authentication que no aparecen aquí, debes agregarlos manualmente usando el botón "+" (agregar usuario).'
                  );
                  setLoading(false);
                  sincronizandoRef.current = false;
                  return;
                }
                
                console.log(`📋 Usuarios encontrados en Firestore: ${usuariosSnapshot.size}`);
                
                // Sincronizar cada usuario
                for (const doc of usuariosSnapshot.docs) {
                  const usuarioFirestore = doc.data();
                  const firebaseUid = usuarioFirestore.firebaseUid || doc.id;
                  
                  try {
                    // Verificar si ya existe en SQLite
                    const existingUser = await db.getFirstAsync(
                      'SELECT * FROM usuarios WHERE firebaseUid = ? OR email = ?',
                      [firebaseUid, usuarioFirestore.email]
                    );
                    
                    if (!existingUser) {
                      // Crear nuevo usuario en SQLite
                      const passwordHash = await Crypto.digestStringAsync(
                        Crypto.CryptoDigestAlgorithm.SHA256,
                        firebaseUid,
                        { encoding: Crypto.CryptoEncoding.BASE64 }
                      );
                      
                      await db.runAsync(
                        `INSERT INTO usuarios (
                          nombre, email, password, telefono, fechaNacimiento, genero, 
                          firebaseUid, fotoPerfil, rol, activo, fechaRegistro
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                          usuarioFirestore.nombre || usuarioFirestore.email?.split('@')[0] || 'Usuario',
                          usuarioFirestore.email || '',
                          passwordHash,
                          usuarioFirestore.telefono || '',
                          usuarioFirestore.fechaNacimiento || '',
                          usuarioFirestore.genero || '',
                          firebaseUid,
                          usuarioFirestore.fotoPerfil || '',
                          usuarioFirestore.rol || 'paciente',
                          usuarioFirestore.activo !== false ? 1 : 0,
                          usuarioFirestore.fechaRegistro || new Date().toISOString()
                        ]
                      );
                      usuariosSincronizados++;
                      console.log(`✅ Usuario sincronizado: ${usuarioFirestore.email}`);
                    } else {
                      // Actualizar usuario existente si hay cambios
                      if (existingUser.rol !== usuarioFirestore.rol || 
                          existingUser.nombre !== usuarioFirestore.nombre) {
                        await db.runAsync(
                          `UPDATE usuarios SET 
                            nombre = COALESCE(?, nombre),
                            rol = COALESCE(?, rol),
                            activo = ?
                          WHERE id = ?`,
                          [
                            usuarioFirestore.nombre || null,
                            usuarioFirestore.rol || null,
                            usuarioFirestore.activo !== false ? 1 : 0,
                            existingUser.id
                          ]
                        );
                        usuariosActualizados++;
                        console.log(`🔄 Usuario actualizado: ${usuarioFirestore.email}`);
                      }
                    }
                  } catch (error) {
                    console.error(`❌ Error sincronizando usuario ${usuarioFirestore.email}:`, error);
                  }
                }
                
                // Recargar usuarios
                await loadUsuarios();
                
                let mensaje = `Sincronización completada:\n${usuariosSincronizados} usuarios nuevos\n${usuariosActualizados} usuarios actualizados`;
                if (usuariosSincronizados === 0 && usuariosActualizados === 0) {
                  mensaje += '\n\nTodos los usuarios de Firestore ya están sincronizados.';
                }
                
                Alert.alert('Éxito', mensaje);
              } catch (error) {
                console.error('Error al sincronizar usuarios:', error);
                Alert.alert('Error', `No se pudieron sincronizar los usuarios: ${error.message}`);
              } finally {
                setLoading(false);
                sincronizandoRef.current = false;
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error en sincronizarUsuariosFirebase:', error);
    }
  };

  const agregarUsuarioManual = async () => {
    if (!nuevoUsuarioEmail.trim() || !nuevoUsuarioUID.trim()) {
      Alert.alert('Error', 'Por favor ingresa el email y el Firebase UID del usuario');
      return;
    }

    try {
      setLoading(true);
      
      if (!firestore) {
        Alert.alert('Error', 'Firestore no está configurado');
        setLoading(false);
        return;
      }

      // Verificar si el usuario ya existe en Firestore
      const usuarioExistente = await firestore.collection('usuarios').doc(nuevoUsuarioUID).get();
      
      if (usuarioExistente.exists) {
        Alert.alert('Info', 'Este usuario ya existe en Firestore');
        setLoading(false);
        return;
      }

      // Crear usuario en Firestore
      await firestore.collection('usuarios').doc(nuevoUsuarioUID).set({
        firebaseUid: nuevoUsuarioUID,
        email: nuevoUsuarioEmail.trim(),
        nombre: nuevoUsuarioNombre.trim() || nuevoUsuarioEmail.split('@')[0],
        rol: 'paciente',
        activo: true,
        fechaRegistro: new Date().toISOString()
      });

      console.log('✅ Usuario agregado a Firestore');

      // Ahora sincronizar desde Firestore a SQLite
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nuevoUsuarioUID,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      await db.runAsync(
        `INSERT INTO usuarios (
          nombre, email, password, telefono, fechaNacimiento, genero, 
          firebaseUid, fotoPerfil, rol, activo, fechaRegistro
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nuevoUsuarioNombre.trim() || nuevoUsuarioEmail.split('@')[0],
          nuevoUsuarioEmail.trim(),
          passwordHash,
          '',
          '',
          '',
          nuevoUsuarioUID,
          '',
          'paciente',
          1,
          new Date().toISOString()
        ]
      );

      // Limpiar formulario
      setNuevoUsuarioEmail('');
      setNuevoUsuarioUID('');
      setNuevoUsuarioNombre('');
      setMostrarAgregarUsuario(false);

      // Recargar usuarios
      await loadUsuarios();
      Alert.alert('Éxito', 'Usuario agregado y sincronizado correctamente');
    } catch (error) {
      console.error('Error agregando usuario:', error);
      Alert.alert('Error', `No se pudo agregar el usuario: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar usuario..."
          value={busqueda}
          onChangeText={setBusqueda}
          placeholderTextColor="#999"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <MaterialCommunityIcons name="close-circle" size={24} color="#666" />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={sincronizarUsuariosFirebase}
          style={styles.syncButton}
        >
          <MaterialCommunityIcons name="sync" size={24} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setMostrarAgregarUsuario(true)}
          style={styles.addButton}
        >
          <MaterialCommunityIcons name="account-plus" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Modal para agregar usuario manualmente */}
      {mostrarAgregarUsuario && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Usuario de Firebase</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa los datos del usuario que se registró directamente en Firebase Console
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Email del usuario *"
              value={nuevoUsuarioEmail}
              onChangeText={setNuevoUsuarioEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Firebase UID *"
              value={nuevoUsuarioUID}
              onChangeText={setNuevoUsuarioUID}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre (opcional)"
              value={nuevoUsuarioNombre}
              onChangeText={setNuevoUsuarioNombre}
              placeholderTextColor="#999"
            />
            
            <Text style={styles.modalHelpText}>
              El Firebase UID lo puedes encontrar en Firebase Console → Authentication → Usuarios
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setMostrarAgregarUsuario(false);
                  setNuevoUsuarioEmail('');
                  setNuevoUsuarioUID('');
                  setNuevoUsuarioNombre('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={agregarUsuarioManual}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={usuariosFiltrados}
        renderItem={renderUsuario}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay usuarios registrados</Text>
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
  syncButton: {
    marginLeft: 10,
    padding: 5,
  },
  addButton: {
    marginLeft: 10,
    padding: 5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F9F9F9',
  },
  modalHelpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#E0E0E0',
  },
  modalButtonConfirm: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  listContainer: {
    padding: 15,
  },
  usuarioCard: {
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
  usuarioHeader: {
    marginBottom: 15,
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  usuarioEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  rolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  rolText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  usuarioActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  rolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  rolButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
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

export default GestionUsuariosScreen;
