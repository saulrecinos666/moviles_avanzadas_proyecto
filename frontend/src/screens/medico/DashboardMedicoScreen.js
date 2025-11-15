import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../../context/UserContext';
import RoleService from '../../services/RoleService';

const DashboardMedicoScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const userRole = user?.rol || 'medico';
  const [stats, setStats] = useState({
    pacientes: 0,
    consultasHoy: 0,
    recetasPendientes: 0,
    consultasPendientes: 0
  });
  const [loading, setLoading] = useState(true);
  const [proximaConsulta, setProximaConsulta] = useState(null);

  useEffect(() => {
    // Validar permisos
    if (!RoleService.canPerformAction(userRole, 'ver_dashboard_medico')) {
      Alert.alert(
        'Acceso Denegado',
        'No tienes permisos para acceder al dashboard médico.',
        [
          {
            text: 'OK',
            onPress: () => {
              const redirectScreen = RoleService.isAdmin(userRole) 
                ? 'DashboardAdmin' 
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
      
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Obtener ID del médico desde usuarios (donde están los médicos con rol 'medico')
      const medicoUsuario = await db.getFirstAsync(
        'SELECT id FROM usuarios WHERE (firebaseUid = ? OR email = ?) AND rol = ?',
        [user.id, user.email, 'medico']
      );

      // También intentar con la tabla medicos por compatibilidad
      let medicoTabla = null;
      try {
        medicoTabla = await db.getFirstAsync(
          'SELECT id FROM medicos WHERE firebaseUid = ? OR email = ?',
          [user.id, user.email]
        );
      } catch (e) {
        console.log('No se pudo buscar en tabla medicos:', e);
      }

      if (!medicoUsuario && !medicoTabla) {
        console.log('Médico no encontrado');
        setLoading(false);
        return;
      }

      // Usar el ID de usuarios primero, sino el de medicos
      const medicoId = medicoUsuario?.id || medicoTabla?.id;

      // Contar pacientes únicos (buscar con ambos IDs posibles)
      const medicoIdsPosibles = [medicoId];
      if (medicoUsuario && medicoTabla && medicoUsuario.id !== medicoTabla.id) {
        medicoIdsPosibles.push(medicoTabla.id);
      }
      const placeholders = medicoIdsPosibles.map(() => '?').join(',');
      
      const pacientesResult = await db.getFirstAsync(
        `SELECT COUNT(DISTINCT pacienteId) as count FROM consultas WHERE medicoId IN (${placeholders})`,
        medicoIdsPosibles
      );

      // Consultas de hoy
      const hoy = new Date().toISOString().split('T')[0];
      const consultasHoyResult = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM consultas WHERE medicoId IN (${placeholders}) AND fecha = ? AND estado = ?`,
        [...medicoIdsPosibles, hoy, 'programada']
      );

      // Recetas pendientes (sin completar)
      const recetasPendientesResult = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM recetas r
         JOIN consultas c ON r.consultaId = c.id
         WHERE c.medicoId IN (${placeholders}) AND r.estado = 'activa'`,
        medicoIdsPosibles
      );

      // Consultas pendientes (programadas)
      const consultasPendientesResult = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM consultas WHERE medicoId IN (${placeholders}) AND estado = ?`,
        [...medicoIdsPosibles, 'programada']
      );

      // Próxima consulta
      const proxima = await db.getFirstAsync(
        `SELECT c.*, 
                COALESCE(u1.nombre, u2.nombre) as pacienteNombre, 
                COALESCE(u1.telefono, u2.telefono) as pacienteTelefono
         FROM consultas c
         LEFT JOIN usuarios u1 ON c.pacienteId = u1.id
         LEFT JOIN usuarios u2 ON c.pacienteId = u2.firebaseUid
         WHERE c.medicoId IN (${placeholders}) AND c.estado = 'programada'
         ORDER BY c.fecha ASC, c.hora ASC
         LIMIT 1`,
        medicoIdsPosibles
      );

      setStats({
        pacientes: pacientesResult?.count || 0,
        consultasHoy: consultasHoyResult?.count || 0,
        recetasPendientes: recetasPendientesResult?.count || 0,
        consultasPendientes: consultasPendientesResult?.count || 0
      });
      
      setProximaConsulta(proxima);
    } catch (error) {
      console.error('Error cargando datos del dashboard médico:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <TouchableOpacity 
        style={styles.statCard}
        onPress={() => navigation.navigate('MisPacientes')}
      >
        <MaterialCommunityIcons name="account-group" size={32} color="#2196F3" />
        <Text style={styles.statValue}>{stats.pacientes}</Text>
        <Text style={styles.statLabel}>Pacientes</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.statCard}
        onPress={() => navigation.navigate('ConsultasMedico')}
      >
        <MaterialCommunityIcons name="calendar-clock" size={32} color="#42A5F5" />
        <Text style={styles.statValue}>{stats.consultasHoy}</Text>
        <Text style={styles.statLabel}>Consultas Hoy</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.statCard}
        onPress={() => navigation.navigate('RecetasMedico')}
      >
        <MaterialCommunityIcons name="file-document" size={32} color="#FF9800" />
        <Text style={styles.statValue}>{stats.recetasPendientes}</Text>
        <Text style={styles.statLabel}>Recetas Pendientes</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.statCard}
        onPress={() => navigation.navigate('ConsultasMedico')}
      >
        <MaterialCommunityIcons name="calendar-alert" size={32} color="#F44336" />
        <Text style={styles.statValue}>{stats.consultasPendientes}</Text>
        <Text style={styles.statLabel}>Pendientes</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProximaConsulta = () => {
    if (!proximaConsulta) {
      return (
        <View style={styles.proximaConsultaCard}>
          <MaterialCommunityIcons name="calendar-check" size={48} color="#ccc" />
          <Text style={styles.proximaConsultaText}>No tienes consultas programadas</Text>
        </View>
      );
    }

    const fecha = new Date(proximaConsulta.fecha);
    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    return (
      <TouchableOpacity
        style={styles.proximaConsultaCard}
        onPress={() => navigation.navigate('ConsultasMedico')}
      >
        <View style={styles.proximaConsultaHeader}>
          <MaterialCommunityIcons name="calendar-clock" size={32} color="#2196F3" />
          <View style={styles.proximaConsultaInfo}>
            <Text style={styles.proximaConsultaTitle}>Próxima Consulta</Text>
            <Text style={styles.proximaConsultaPaciente}>{proximaConsulta.pacienteNombre}</Text>
            <Text style={styles.proximaConsultaTelefono}>
              {proximaConsulta.pacienteTelefono || 'Sin teléfono'}
            </Text>
          </View>
        </View>
        <View style={styles.proximaConsultaFecha}>
          <MaterialCommunityIcons name="calendar" size={18} color="#666" />
          <Text style={styles.proximaConsultaFechaText}>{fechaFormateada}</Text>
        </View>
        <View style={styles.proximaConsultaHora}>
          <MaterialCommunityIcons name="clock-outline" size={18} color="#666" />
          <Text style={styles.proximaConsultaHoraText}>{proximaConsulta.hora}</Text>
        </View>
        {proximaConsulta.motivo && (
          <View style={styles.motivoContainer}>
            <Text style={styles.motivoLabel}>Motivo:</Text>
            <Text style={styles.motivoText}>{proximaConsulta.motivo}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('MisPacientes')}
        >
          <MaterialCommunityIcons name="account-group" size={30} color="#2196F3" />
          <Text style={styles.quickActionText}>Mis Pacientes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('ConsultasMedico')}
        >
          <MaterialCommunityIcons name="calendar-clock" size={30} color="#2196F3" />
          <Text style={styles.quickActionText}>Consultas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('RecetasMedico')}
        >
          <MaterialCommunityIcons name="file-document" size={30} color="#FF9800" />
          <Text style={styles.quickActionText}>Recetas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Conversaciones')}
        >
          <MaterialCommunityIcons name="message-text" size={30} color="#9C27B0" />
          <Text style={styles.quickActionText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          ¡Hola, Dr. {user?.nombre || 'Médico'}! 👋
        </Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </View>

      {renderProximaConsulta()}
      {renderStatsCards()}
      {renderQuickActions()}
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
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  date: {
    fontSize: 16,
    color: '#E8F5E8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
    marginTop: 20,
  },
  proximaConsultaCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 15,
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  proximaConsultaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  proximaConsultaInfo: {
    marginLeft: 15,
    flex: 1,
  },
  proximaConsultaTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  proximaConsultaPaciente: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  proximaConsultaTelefono: {
    fontSize: 14,
    color: '#666',
  },
  proximaConsultaFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  proximaConsultaFechaText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  proximaConsultaHora: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  proximaConsultaHoraText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  proximaConsultaText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    marginBottom: 15,
  },
  motivoContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  motivoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  motivoText: {
    fontSize: 14,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 0,
  },
  statCard: {
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
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },
  quickActionsContainer: {
    padding: 20,
    paddingTop: 0,
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
});

export default DashboardMedicoScreen;
