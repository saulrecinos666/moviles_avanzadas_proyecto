// Helper para gestionar usuarios en SQLite
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { firestore } from '../config/firebase';

/**
 * Guarda un usuario en SQLite después del registro en Firebase
 */
export async function saveUserToSQLite(db, firebaseUser, userData) {
  try {
    // Verificar si el usuario ya existe
    const existingUser = await db.getFirstAsync(
      'SELECT * FROM usuarios WHERE firebaseUid = ? OR email = ?',
      [firebaseUser.uid, firebaseUser.email]
    );

    if (existingUser) {
      // Actualizar usuario existente
      await db.runAsync(
        `UPDATE usuarios SET 
          nombre = ?, 
          email = ?, 
          telefono = ?, 
          fechaNacimiento = ?, 
          genero = ?, 
          firebaseUid = ?,
          fotoPerfil = ?,
          rol = ?
        WHERE id = ?`,
        [
          userData.nombre || existingUser.nombre,
          firebaseUser.email,
          userData.telefono || existingUser.telefono || '',
          userData.fechaNacimiento || existingUser.fechaNacimiento || '',
          userData.genero || existingUser.genero || '',
          firebaseUser.uid,
          firebaseUser.photoURL || existingUser.fotoPerfil || '',
          existingUser.rol || userData.rol || 'paciente',
          existingUser.id
        ]
      );
      
      // También actualizar en Firestore
      try {
        if (firestore) {
          await firestore.collection('usuarios').doc(firebaseUser.uid).set({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            nombre: userData.nombre || existingUser.nombre,
            telefono: userData.telefono || existingUser.telefono || '',
            fechaNacimiento: userData.fechaNacimiento || existingUser.fechaNacimiento || '',
            genero: userData.genero || existingUser.genero || '',
            rol: existingUser.rol || userData.rol || 'paciente',
            activo: existingUser.activo !== 0,
            fechaRegistro: existingUser.fechaRegistro || new Date().toISOString(),
            sqliteId: existingUser.id
          }, { merge: true });
          console.log('✅ Usuario actualizado en Firestore');
        }
      } catch (firestoreError) {
        console.error('⚠️ Error actualizando en Firestore (no crítico):', firestoreError);
      }
      
      return existingUser.id;
    } else {
      // Crear nuevo usuario
      // Generar un hash simple para la contraseña (solo para SQLite, la real está en Firebase)
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        firebaseUser.uid,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      const result = await db.runAsync(
        `INSERT INTO usuarios (
          nombre, email, password, telefono, fechaNacimiento, genero, 
          firebaseUid, fotoPerfil, rol, activo, fechaRegistro
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.nombre || '',
          firebaseUser.email,
          passwordHash,
          userData.telefono || '',
          userData.fechaNacimiento || '',
          userData.genero || '',
          firebaseUser.uid,
          firebaseUser.photoURL || '',
          userData.rol || 'paciente',
          1,
          new Date().toISOString()
        ]
      );
      const userId = result.lastInsertRowId;
      
      // También guardar en Firestore para sincronización
      try {
        if (firestore) {
          await firestore.collection('usuarios').doc(firebaseUser.uid).set({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            nombre: userData.nombre || '',
            telefono: userData.telefono || '',
            fechaNacimiento: userData.fechaNacimiento || '',
            genero: userData.genero || '',
            rol: userData.rol || 'paciente',
            activo: true,
            fechaRegistro: new Date().toISOString(),
            sqliteId: userId
          }, { merge: true });
          console.log('✅ Usuario guardado en Firestore');
        }
      } catch (firestoreError) {
        console.error('⚠️ Error guardando en Firestore (no crítico):', firestoreError);
        // No lanzar error, es opcional
      }
      
      return userId;
    }
  } catch (error) {
    console.error('Error al guardar usuario en SQLite:', error);
    throw error;
  }
}

/**
 * Verifica si la base de datos SQLite está disponible y lista para usar
 */
export async function isDatabaseReady(db) {
  if (!db) {
    return false;
  }
  
  try {
    // Intentar una consulta simple para verificar que la base de datos esté abierta
    await db.getFirstAsync('SELECT 1');
    return true;
  } catch (error) {
    // Si hay un error, la base de datos no está disponible
    return false;
  }
}

/**
 * Carga un usuario desde SQLite usando el firebaseUid
 */
export async function loadUserFromSQLite(db, firebaseUid) {
  try {
    // Verificar que la base de datos esté disponible
    if (!db || !firebaseUid) {
      return null;
    }
    
    // Verificar que la base de datos esté lista
    const isReady = await isDatabaseReady(db);
    if (!isReady) {
      console.log('SQLite no está disponible aún');
      return null;
    }
    
    const user = await db.getFirstAsync(
      'SELECT * FROM usuarios WHERE firebaseUid = ? AND activo = 1',
      [firebaseUid]
    );
    return user;
  } catch (error) {
    // Solo registrar error si no es un error de recurso cerrado
    const errorMessage = error?.message || '';
    if (!errorMessage.includes('closed resource') && !errorMessage.includes('Access to closed')) {
      console.error('Error al cargar usuario desde SQLite:', error);
    }
    return null;
  }
}

/**
 * Actualiza un usuario en SQLite usando el firebaseUid
 */
export async function updateUserInSQLite(db, firebaseUid, userData) {
  try {
    // Verificar que la base de datos esté disponible
    if (!db || !firebaseUid) {
      return { success: false, message: 'Base de datos no disponible' };
    }
    
    // Verificar que la base de datos esté lista
    const isReady = await isDatabaseReady(db);
    if (!isReady) {
      return { success: false, message: 'Base de datos no está lista' };
    }
    
    // Verificar si el usuario existe
    const existingUser = await db.getFirstAsync(
      'SELECT * FROM usuarios WHERE firebaseUid = ?',
      [firebaseUid]
    );

    if (!existingUser) {
      console.log('Usuario no encontrado en SQLite para actualizar');
      return { success: false, message: 'Usuario no encontrado' };
    }

    // Actualizar usuario
    await db.runAsync(
      `UPDATE usuarios SET 
        nombre = ?, 
        email = ?,
        telefono = ?, 
        fechaNacimiento = ?, 
        genero = ?,
        fotoPerfil = ?,
        altura = ?,
        peso = ?
      WHERE firebaseUid = ?`,
      [
        userData.nombre !== undefined ? userData.nombre : existingUser.nombre,
        userData.email !== undefined ? userData.email : existingUser.email,
        userData.telefono !== undefined ? userData.telefono : existingUser.telefono,
        userData.fechaNacimiento !== undefined ? userData.fechaNacimiento : existingUser.fechaNacimiento,
        userData.genero !== undefined ? userData.genero : existingUser.genero,
        userData.fotoPerfil !== undefined ? userData.fotoPerfil : existingUser.fotoPerfil,
        userData.altura !== undefined ? userData.altura : existingUser.altura,
        userData.peso !== undefined ? userData.peso : existingUser.peso,
        firebaseUid
      ]
    );

    // También actualizar en Firestore si está disponible
    try {
      if (firestore) {
        await firestore.collection('usuarios').doc(firebaseUid).set({
          ...userData,
          firebaseUid: firebaseUid
        }, { merge: true });
        console.log('✅ Usuario actualizado en Firestore');
      }
    } catch (firestoreError) {
      console.error('⚠️ Error actualizando en Firestore (no crítico):', firestoreError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error al actualizar usuario en SQLite:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Crea el primer admin directamente en SQLite
 * IMPORTANTE: Este usuario debe existir también en Firebase Auth
 * 
 * Uso:
 * 1. Primero crea el usuario en Firebase Console o usando la app
 * 2. Luego ejecuta esta función con el firebaseUid del usuario creado
 */
export async function createFirstAdmin(db, firebaseUid, email, nombre) {
  try {
    // Verificar si ya existe un admin
    const existingAdmin = await db.getFirstAsync(
      'SELECT * FROM usuarios WHERE rol = ? AND activo = 1',
      ['admin']
    );

    if (existingAdmin) {
      console.log('Ya existe un administrador en el sistema');
      return { success: false, message: 'Ya existe un administrador' };
    }

    // Generar hash de contraseña
    const passwordHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      firebaseUid,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );

    // Crear admin
    const result = await db.runAsync(
      `INSERT INTO usuarios (
        nombre, email, password, firebaseUid, rol, activo, fechaRegistro
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre || 'Administrador',
        email,
        passwordHash,
        firebaseUid,
        'admin',
        1,
        new Date().toISOString()
      ]
    );

    console.log('Admin creado exitosamente en SQLite');
    return { success: true, userId: result.lastInsertRowId };
  } catch (error) {
    console.error('Error al crear admin:', error);
    return { success: false, error: error.message };
  }
}

