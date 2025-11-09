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
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';

const LoginScreen = ({ navigation }) => {
  const { login, loading } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

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
            onPress={() => Alert.alert('Info', 'Función de recuperación de contraseña próximamente')}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
          
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
});

export default LoginScreen;