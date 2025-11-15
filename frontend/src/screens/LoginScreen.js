import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { useSQLiteContext } from 'expo-sqlite';
import { loadUserFromSQLite, saveUserToSQLite } from '../db/userHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const { login, loading, user, resetPassword } = useUser();
  const db = useSQLiteContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const validateEmail = (emailValue) => {
    if (!emailValue) {
      return 'El email es requerido';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      return 'Por favor ingresa un email válido';
    }
    return '';
  };

  const validatePassword = (passwordValue) => {
    if (!passwordValue) {
      return 'La contraseña es requerida';
    }
    if (passwordValue.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return '';
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (emailTouched) {
      setEmailError(validateEmail(text));
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (passwordTouched) {
      setPasswordError(validatePassword(text));
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No existe una cuenta con este email';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta';
      case 'auth/invalid-email':
        return 'Email inválido';
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido deshabilitada';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde';
      case 'auth/network-request-failed':
        return 'Error de conexión. Verifica tu internet';
      default:
        return 'Error al iniciar sesión. Intenta nuevamente';
    }
  };

  const handleLogin = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    setEmailError(emailErr);
    setPasswordError(passwordErr);

    if (emailErr || passwordErr) {
      return;
    }

    const resultado = await login(email, password);
    if (resultado.success) {
      // Intentar cargar usuario desde SQLite y sincronizar
      try {
        const sqliteUser = await loadUserFromSQLite(db, resultado.user.uid);
        if (sqliteUser && sqliteUser.rol) {
          // Si existe en SQLite, actualizar AsyncStorage con el rol
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const parsedData = JSON.parse(userData);
            parsedData.rol = sqliteUser.rol;
            await AsyncStorage.setItem('userData', JSON.stringify(parsedData));
          }
        } else if (resultado.user) {
          // Si no existe en SQLite, crearlo
          await saveUserToSQLite(db, resultado.user, {
            nombre: resultado.user.displayName || email.split('@')[0],
            email: email,
            rol: 'paciente'
          });
          
          // También asegurarse de que esté en Firestore
          try {
            const { firestore } = require('../config/firebase');
            if (firestore) {
              await firestore.collection('usuarios').doc(resultado.user.uid).set({
                firebaseUid: resultado.user.uid,
                email: resultado.user.email,
                nombre: resultado.user.displayName || email.split('@')[0],
                rol: 'paciente',
                activo: true,
                fechaRegistro: new Date().toISOString()
              }, { merge: true });
            }
          } catch (firestoreError) {
            console.error('Error guardando en Firestore:', firestoreError);
          }
        }
      } catch (error) {
        console.error('Error al sincronizar con SQLite:', error);
        // No bloqueamos el login si falla SQLite
      }
      
      navigation.replace('Main');
    } else {
      const errorMessage = getErrorMessage(resultado.error?.code || resultado.error);
      setPasswordError(errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="doctor" size={80} color="#2196F3" />
          <Text style={styles.appTitle}>Servicios Médicos</Text>
          <Text style={styles.appSubtitle}>Atención médica a distancia</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.title}>Iniciar Sesión</Text>
          
          <View style={styles.inputContainer}>
            <View>
              <View style={[
                styles.inputWrapper,
                emailError ? styles.inputWrapperError : email && !emailError ? styles.inputWrapperSuccess : null
              ]}>
                <MaterialCommunityIcons 
                  name="email" 
                  size={20} 
                  color={emailError ? "#F44336" : email && !emailError ? "#4CAF50" : "#666"} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={handleEmailChange}
                  onBlur={() => {
                    setEmailTouched(true);
                    setEmailError(validateEmail(email));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#999"
                />
                {email && !emailError && (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" style={styles.validationIcon} />
                )}
                {emailError && (
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#F44336" style={styles.validationIcon} />
                )}
              </View>
              {emailError ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color="#F44336" />
                  <Text style={styles.errorText}>{emailError}</Text>
                </View>
              ) : null}
            </View>
            
            <View style={{ marginTop: 15 }}>
              <View style={[
                styles.inputWrapper,
                passwordError ? styles.inputWrapperError : password && !passwordError ? styles.inputWrapperSuccess : null
              ]}>
                <MaterialCommunityIcons 
                  name="lock" 
                  size={20} 
                  color={passwordError ? "#F44336" : password && !passwordError ? "#4CAF50" : "#666"} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  value={password}
                  onChangeText={handlePasswordChange}
                  onBlur={() => {
                    setPasswordTouched(true);
                    setPasswordError(validatePassword(password));
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialCommunityIcons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                {password && !passwordError && (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" style={styles.validationIcon} />
                )}
                {passwordError && (
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#F44336" style={styles.validationIcon} />
                )}
              </View>
              {passwordError ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color="#F44336" />
                  <Text style={styles.errorText}>{passwordError}</Text>
                </View>
              ) : null}
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="login" size={20} color="#FFFFFF" />
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.forgotPasswordButton}
            onPress={() => {
              setResetEmail(email); // Pre-llenar con el email del login
              setShowForgotPassword(true);
            }}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
          
          {/* Modal de Recuperación de Contraseña */}
          <Modal
            visible={showForgotPassword}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowForgotPassword(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <MaterialCommunityIcons name="lock-reset" size={32} color="#2196F3" />
                  <Text style={styles.modalTitle}>Recuperar Contraseña</Text>
                  <Text style={styles.modalSubtitle}>
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
                  </Text>
                </View>
                
                <View style={styles.modalBody}>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Email"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholderTextColor="#999"
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.resetButton, loading && styles.resetButtonDisabled]}
                    onPress={async () => {
                      if (!resetEmail) {
                        Alert.alert('Error', 'Por favor ingresa tu email');
                        return;
                      }
                      
                      const emailErr = validateEmail(resetEmail);
                      if (emailErr) {
                        Alert.alert('Error', emailErr);
                        return;
                      }
                      
                      const resultado = await resetPassword(resetEmail);
                      if (resultado.success) {
                        Alert.alert(
                          'Email Enviado',
                          'Se ha enviado un enlace de recuperación a tu email. Revisa tu bandeja de entrada y sigue las instrucciones.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                setShowForgotPassword(false);
                                setResetEmail('');
                              }
                            }
                          ]
                        );
                      } else {
                        Alert.alert('Error', resultado.error?.message || 'No se pudo enviar el email de recuperación');
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                        <Text style={styles.resetButtonText}>Enviar Email</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
          >
            <MaterialCommunityIcons name="account-plus" size={20} color="#2196F3" />
            <Text style={styles.registerButtonText}>Crear nueva cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 15,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 5,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333333',
  },
  inputContainer: {
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    transition: 'all 0.3s ease',
  },
  inputWrapperError: {
    borderColor: '#F44336',
    backgroundColor: '#FFF5F5',
  },
  inputWrapperSuccess: {
    borderColor: '#4CAF50',
    backgroundColor: '#F5FFF5',
  },
  inputIcon: {
    marginLeft: 15,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333333',
  },
  eyeIcon: {
    padding: 15,
  },
  validationIcon: {
    marginRight: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 5,
    paddingHorizontal: 5,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  loginButtonDisabled: {
    backgroundColor: '#BBDEFB',
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666666',
    fontSize: 14,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#FFFFFF',
  },
  registerButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  modalBody: {
    marginTop: 10,
  },
  modalInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
    paddingLeft: 10,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  resetButtonDisabled: {
    backgroundColor: '#BBDEFB',
    opacity: 0.6,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;