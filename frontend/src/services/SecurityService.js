import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Servicio de seguridad para encriptación y protección de datos sensibles
 */

// Función para encriptar datos sensibles
export const encryptData = async (data) => {
  try {
    // Para datos simples, usamos hash. Para datos más complejos, se podría usar AES
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data + new Date().getTime().toString()
    );
    return hash;
  } catch (error) {
    console.error('Error encriptando datos:', error);
    return null;
  }
};

// Guardar datos sensibles de forma segura
export const saveSecureData = async (key, value) => {
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (error) {
    console.error('Error guardando dato seguro:', error);
    return false;
  }
};

// Obtener datos sensibles de forma segura
export const getSecureData = async (key) => {
  try {
    const value = await SecureStore.getItemAsync(key);
    return value;
  } catch (error) {
    console.error('Error obteniendo dato seguro:', error);
    return null;
  }
};

// Eliminar datos sensibles
export const deleteSecureData = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch (error) {
    console.error('Error eliminando dato seguro:', error);
    return false;
  }
};

// Validar y sanitizar entrada para prevenir inyección SQL
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  // Eliminar caracteres peligrosos
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .trim();
};

// Validar email
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validar contraseña (mínimo 6 caracteres, al menos una letra y un número)
export const validatePassword = (password) => {
  if (password.length < 6) {
    return { valid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un número' };
  }
  return { valid: true, message: '' };
};

// Validar teléfono
export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Generar token único
export const generateUniqueToken = async () => {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Error generando token:', error);
    return Date.now().toString() + Math.random().toString(36).substring(2);
  }
};

