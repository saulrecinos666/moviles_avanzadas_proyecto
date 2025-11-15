import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../../context/UserContext';
import RoleService from '../../services/RoleService';
import { loadUserFromSQLite } from '../../db/userHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DashboardAdminScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const { user, reloadUser } = useUser();
  const userRole = user?.rol || 'admin';
  const [stats, setStats] = useState({
    usuarios: 0,
    medicos: 0,
    consultas: 0,
    recetas: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sincronizar rol desde SQLite al cargar
    const syncRoleFromSQLite = async () => {
      if (user?.id) {
        try {
          const sqliteUser = await loadUserFromSQLite(db, user.id);
          if (sqliteUser && sqliteUser.rol && sqliteUser.rol !== user.rol) {
            // Si el rol en SQLite es diferente, actualizar AsyncStorage
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
              const parsedData = JSON.parse(userData);
              parsedData.rol = sqliteUser.rol;
              await AsyncStorage.setItem('userData', JSON.stringify(parsedData));
              await reloadUser();
            }
          }
        } catch (error) {
          console.error('Error al sincronizar rol:', error);
        }
      }
    };
    
    syncRoleFromSQLite();
    
    // Validar permisos
    if (!RoleService.canPerformAction(userRole, 'ver_dashboard_admin')) {
      Alert.alert(
        'Acceso Denegado',
        'No tienes permisos para acceder al dashboard de administrador.',
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
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Contar usuarios
      const usuariosResult = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM usuarios WHERE activo = 1'
      );

      // Contar médicos
      const medicosResult = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM medicos WHERE activo = 1'
      );

      // Contar consultas
      const consultasResult = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM consultas'
      );

      // Contar recetas
      const recetasResult = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM recetas'
      );

      setStats({
        usuarios: usuariosResult?.count || 0,
        medicos: medicosResult?.count || 0,
        consultas: consultasResult?.count || 0,
        recetas: recetasResult?.count || 0
      });
    } catch (error) {
      console.error('Error cargando datos del dashboard admin:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="shield-account" size={48} color="#2196F3" />
        <Text style={styles.title}>Dashboard Administrador</Text>
        <Text style={styles.subtitle}>Panel de control administrativo</Text>
        {__DEV__ && (
          <Text style={styles.debugText}>Rol actual: {userRole} | Email: {user?.email}</Text>
        )}
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => navigation.navigate('GestionUsuarios')}
        >
          <MaterialCommunityIcons name="account-group" size={32} color="#2196F3" />
          <Text style={styles.statValue}>{stats.usuarios}</Text>
          <Text style={styles.statLabel}>Usuarios</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => navigation.navigate('GestionMedicos')}
        >
          <MaterialCommunityIcons name="doctor" size={32} color="#2196F3" />
          <Text style={styles.statValue}>{stats.medicos}</Text>
          <Text style={styles.statLabel}>Médicos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => navigation.navigate('Reportes')}
        >
          <MaterialCommunityIcons name="calendar-clock" size={32} color="#2196F3" />
          <Text style={styles.statValue}>{stats.consultas}</Text>
          <Text style={styles.statLabel}>Consultas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => navigation.navigate('Reportes')}
        >
          <MaterialCommunityIcons name="file-document" size={32} color="#2196F3" />
          <Text style={styles.statValue}>{stats.recetas}</Text>
          <Text style={styles.statLabel}>Recetas</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('GestionUsuarios')}
          >
            <MaterialCommunityIcons name="account-group" size={30} color="#2196F3" />
            <Text style={styles.quickActionText}>Usuarios</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('GestionMedicos')}
          >
            <MaterialCommunityIcons name="doctor" size={30} color="#2196F3" />
            <Text style={styles.quickActionText}>Médicos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Reportes')}
          >
            <MaterialCommunityIcons name="chart-bar" size={30} color="#FF9800" />
            <Text style={styles.quickActionText}>Reportes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '45%',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  quickActionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  debugText: {
    fontSize: 10,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default DashboardAdminScreen;
