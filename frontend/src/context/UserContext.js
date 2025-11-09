import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar cambios en el estado de autenticación de Firebase
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Obtener datos adicionales del usuario desde AsyncStorage
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            setUser(JSON.parse(userData));
          } else {
            // Crear datos básicos del usuario
            const basicUserData = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              nombre: firebaseUser.displayName || '',
              fotoPerfil: firebaseUser.photoURL || '',
              rol: 'paciente', // Por defecto paciente
              fechaRegistro: new Date().toISOString()
            };
            setUser(basicUserData);
            await AsyncStorage.setItem('userData', JSON.stringify(basicUserData));
          }
        } catch (error) {
          console.log('Error al cargar datos del usuario:', error);
        }
      } else {
        setUser(null);
        await AsyncStorage.removeItem('userData');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (email, password, userData) => {
    try {
      setLoading(true);
      
      // Verificar que auth esté disponible
      if (!auth) {
        throw new Error('Firebase Auth no está configurado. Verifica tu configuración de Firebase.');
      }
      
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;

      // Actualizar perfil de Firebase
      await firebaseUser.updateProfile({
        displayName: userData.nombre,
      });

      // Crear datos completos del usuario
      const completeUserData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        nombre: userData.nombre,
        telefono: userData.telefono || '',
        fechaNacimiento: userData.fechaNacimiento || '',
        genero: userData.genero || '',
        altura: userData.altura || 0,
        peso: userData.peso || 0,
        rol: userData.rol || 'paciente', // Por defecto paciente
        fotoPerfil: firebaseUser.photoURL || '',
        fechaRegistro: new Date().toISOString()
      };

      // Guardar datos localmente
      await AsyncStorage.setItem('userData', JSON.stringify(completeUserData));
      setUser(completeUserData);
      return { success: true, user: completeUserData };
    } catch (error) {
      console.log('Error al registrar usuario:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      
      // Mensaje más específico para configuration-not-found
      let errorMessage = error.message;
      if (error.code === 'auth/configuration-not-found') {
        errorMessage = 'Firebase Authentication no está configurado. Por favor, habilita Authentication con Email/Password en Firebase Console.';
      }
      
      return { 
        success: false, 
        error: {
          code: error.code,
          message: errorMessage
        }
      };
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.log('Error al iniciar sesión:', error);
      return { 
        success: false, 
        error: {
          code: error.code,
          message: error.message
        }
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await auth.signOut();
      await AsyncStorage.removeItem('userData');
      setUser(null);
      return { success: true };
    } catch (error) {
      console.log('Error al cerrar sesión:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData) => {
    try {
      const updatedUserData = { ...user, ...userData };
      
      // Actualizar perfil de Firebase si es necesario
      if (userData.nombre && auth.currentUser) {
        await auth.currentUser.updateProfile({
          displayName: userData.nombre,
        });
      }

      // Guardar datos actualizados
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
      setUser(updatedUserData);
      return { success: true, user: updatedUserData };
    } catch (error) {
      console.log('Error al actualizar usuario:', error);
      return { success: false, error: error.message };
    }
  };

  const encryptData = async (data) => {
    try {
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      return hash;
    } catch (error) {
      console.log('Error al encriptar datos:', error);
      return data;
    }
  };

  const decryptData = async (encryptedData) => {
    try {
      // Implementar lógica de desencriptación si es necesario
      return encryptedData;
    } catch (error) {
      console.log('Error al desencriptar datos:', error);
      return encryptedData;
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      loading,
      register,
      login,
      logout,
      updateUser
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe ser usado dentro de UserProvider');
  }
  return context;
};