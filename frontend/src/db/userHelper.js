import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { firestore } from '../config/firebase';

export async function saveUserToSQLite(db, firebaseUser, userData) {
  try {
    const existingUser = await db.getFirstAsync(
      'SELECT * FROM usuarios WHERE firebaseUid = ? OR email = ?',
      [firebaseUser.uid, firebaseUser.email]
    );

    if (existingUser) {
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
      }
      
      return userId;
    }
  } catch (error) {
    console.error('Error al guardar usuario en SQLite:', error);
    throw error;
  }
}

export async function isDatabaseReady(db) {
  if (!db) {
    return false;
  }
  
  try {
    await db.getFirstAsync('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
}

export async function loadUserFromSQLite(db, firebaseUid) {
  try {
    if (!db || !firebaseUid) {
      return null;
    }
    
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
    const errorMessage = error?.message || '';
    if (!errorMessage.includes('closed resource') && !errorMessage.includes('Access to closed')) {
      console.error('Error al cargar usuario desde SQLite:', error);
    }
    return null;
  }
}

export async function updateUserInSQLite(db, firebaseUid, userData) {
  try {
    if (!db || !firebaseUid) {
      return { success: false, message: 'Base de datos no disponible' };
    }
    
    const isReady = await isDatabaseReady(db);
    if (!isReady) {
      return { success: false, message: 'Base de datos no está lista' };
    }
    const existingUser = await db.getFirstAsync(
      'SELECT * FROM usuarios WHERE firebaseUid = ?',
      [firebaseUid]
    );

    if (!existingUser) {
      console.log('Usuario no encontrado en SQLite para actualizar');
      return { success: false, message: 'Usuario no encontrado' };
    }

    await db.runAsync(
      `UPDATE usuarios SET 
        nombre = ?, 
        email = ?,
        telefono = ?, 
        fechaNacimiento = ?, 
        genero = ?,
        fotoPerfil = ?,
        altura = ?,
        peso = ?,
        latitud = ?,
        longitud = ?
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
        userData.latitud !== undefined ? userData.latitud : existingUser.latitud,
        userData.longitud !== undefined ? userData.longitud : existingUser.longitud,
        firebaseUid
      ]
    );

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

export async function createFirstAdmin(db, firebaseUid, email, nombre) {
  try {
    const existingAdmin = await db.getFirstAsync(
      'SELECT * FROM usuarios WHERE rol = ? AND activo = 1',
      ['admin']
    );

    if (existingAdmin) {
      console.log('Ya existe un administrador en el sistema');
      return { success: false, message: 'Ya existe un administrador' };
    }

    const passwordHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      firebaseUid,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );

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

