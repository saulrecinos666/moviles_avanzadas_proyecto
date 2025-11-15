import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import RoleService from '../services/RoleService';

/**
 * Componente para proteger rutas según el rol del usuario
 * Redirige automáticamente si el usuario no tiene permisos
 */
const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  requiredAction = null,
  requiredScreen = null,
  navigation,
  fallbackScreen = 'Dashboard'
}) => {
  const { user, loading } = useUser();
  const userRole = user?.rol || 'paciente';

  // Si está cargando, mostrar loading
  if (loading) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="loading" size={48} color="#2196F3" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    if (navigation) {
      navigation.replace('Login');
    }
    return null;
  }

  // Validar por rol específico
  if (requiredRole) {
    if (userRole !== requiredRole) {
      // Redirigir según el rol del usuario
      const redirectScreen = RoleService.isAdmin(userRole) 
        ? 'DashboardAdmin' 
        : RoleService.isMedico(userRole) 
        ? 'DashboardMedico' 
        : 'Dashboard';
      
      if (navigation) {
        navigation.replace(redirectScreen);
      }
      
      return (
        <View style={styles.container}>
          <MaterialCommunityIcons name="shield-alert" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Acceso Denegado</Text>
          <Text style={styles.errorText}>
            No tienes permisos para acceder a esta sección.
          </Text>
          <Text style={styles.errorSubtext}>
            Se requiere el rol: {RoleService.getRoleName(requiredRole)}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation?.navigate(redirectScreen)}
          >
            <Text style={styles.buttonText}>Ir a mi Dashboard</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  // Validar por acción específica
  if (requiredAction) {
    if (!RoleService.canPerformAction(userRole, requiredAction)) {
      const redirectScreen = RoleService.isAdmin(userRole) 
        ? 'DashboardAdmin' 
        : RoleService.isMedico(userRole) 
        ? 'DashboardMedico' 
        : 'Dashboard';
      
      if (navigation) {
        navigation.replace(redirectScreen);
      }
      
      return (
        <View style={styles.container}>
          <MaterialCommunityIcons name="shield-alert" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Acceso Denegado</Text>
          <Text style={styles.errorText}>
            No tienes permisos para realizar esta acción.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation?.navigate(redirectScreen)}
          >
            <Text style={styles.buttonText}>Ir a mi Dashboard</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  // Validar por pantalla específica
  if (requiredScreen) {
    if (!RoleService.canAccessScreen(userRole, requiredScreen)) {
      const redirectScreen = RoleService.isAdmin(userRole) 
        ? 'DashboardAdmin' 
        : RoleService.isMedico(userRole) 
        ? 'DashboardMedico' 
        : 'Dashboard';
      
      if (navigation) {
        navigation.replace(redirectScreen);
      }
      
      return (
        <View style={styles.container}>
          <MaterialCommunityIcons name="shield-alert" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Acceso Denegado</Text>
          <Text style={styles.errorText}>
            No tienes permisos para acceder a esta pantalla.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation?.navigate(redirectScreen)}
          >
            <Text style={styles.buttonText}>Ir a mi Dashboard</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  // Si pasa todas las validaciones, renderizar el contenido
  return children;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProtectedRoute;

