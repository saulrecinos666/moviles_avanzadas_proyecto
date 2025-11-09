import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { useSQLiteContext } from 'expo-sqlite';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { user } = useUser();
  const db = useSQLiteContext();
  const [stats, setStats] = useState({
    consultasProgramadas: 0,
    consultasCompletadas: 0,
    recetasActivas: 0,
    mensajesNoLeidos: 0
  });
  const [loading, setLoading] = useState(true);
  const [proximaConsulta, setProximaConsulta] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      // Consultas programadas
      const consultasProgramadas = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM consultas WHERE pacienteId = ? AND estado = ?',
        [user.id, 'programada']
      );
      
      // Consultas completadas
      const consultasCompletadas = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM consultas WHERE pacienteId = ? AND estado = ?',
        [user.id, 'completada']
      );
      
      // Recetas activas
      const recetasActivas = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM recetas WHERE pacienteId = ? AND estado = ?',
        [user.id, 'activa']
      );
      
      // Próxima consulta
      const proxima = await db.getFirstAsync(
        `SELECT c.*, m.nombre as medicoNombre, m.especialidad 
         FROM consultas c
         JOIN medicos m ON c.medicoId = m.id
         WHERE c.pacienteId = ? AND c.estado = 'programada'
         ORDER BY c.fecha ASC, c.hora ASC
         LIMIT 1`,
        [user.id]
      );

      setStats({
        consultasProgramadas: consultasProgramadas?.count || 0,
        consultasCompletadas: consultasCompletadas?.count || 0,
        recetasActivas: recetasActivas?.count || 0,
        mensajesNoLeidos: 0 // TODO: Implementar contador de mensajes no leídos
      });
      
      setProximaConsulta(proxima);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: '#2196F3',
    backgroundGradientFrom: '#42A5F5',
    backgroundGradientTo: '#64B5F6',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16
    }
  };

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Resumen</Text>
      <View style={styles.statsGrid}>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => navigation.navigate('Consultas')}
        >
          <MaterialCommunityIcons name="calendar-clock" size={28} color="#2196F3" />
          <Text style={styles.statNumber}>{stats.consultasProgramadas}</Text>
          <Text style={styles.statLabel}>Consultas Programadas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => navigation.navigate('Consultas')}
        >
          <MaterialCommunityIcons name="check-circle" size={28} color="#42A5F5" />
          <Text style={styles.statNumber}>{stats.consultasCompletadas}</Text>
          <Text style={styles.statLabel}>Consultas Completadas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => navigation.navigate('Recetas')}
        >
          <MaterialCommunityIcons name="file-document" size={28} color="#FF9800" />
          <Text style={styles.statNumber}>{stats.recetasActivas}</Text>
          <Text style={styles.statLabel}>Recetas Activas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => navigation.navigate('Chat')}
        >
          <MaterialCommunityIcons name="message-text" size={28} color="#9C27B0" />
          <Text style={styles.statNumber}>{stats.mensajesNoLeidos}</Text>
          <Text style={styles.statLabel}>Mensajes Nuevos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProximaConsulta = () => {
    if (!proximaConsulta) {
      return (
        <View style={styles.proximaConsultaCard}>
          <MaterialCommunityIcons name="calendar-plus" size={48} color="#ccc" />
          <Text style={styles.proximaConsultaText}>No tienes consultas programadas</Text>
          <TouchableOpacity
            style={styles.agendarButton}
            onPress={() => navigation.navigate('BusquedaMedicos')}
          >
            <Text style={styles.agendarButtonText}>Agendar Consulta</Text>
          </TouchableOpacity>
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
        onPress={() => navigation.navigate('Consultas')}
      >
        <View style={styles.proximaConsultaHeader}>
          <MaterialCommunityIcons name="calendar-clock" size={32} color="#2196F3" />
          <View style={styles.proximaConsultaInfo}>
            <Text style={styles.proximaConsultaTitle}>Próxima Consulta</Text>
            <Text style={styles.proximaConsultaMedico}>{proximaConsulta.medicoNombre}</Text>
            <Text style={styles.proximaConsultaEspecialidad}>{proximaConsulta.especialidad}</Text>
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
      </TouchableOpacity>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('BusquedaMedicos')}
        >
          <MaterialCommunityIcons name="doctor" size={30} color="#2196F3" />
          <Text style={styles.quickActionText}>Buscar Médico</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Consultas')}
        >
          <MaterialCommunityIcons name="calendar-check" size={30} color="#2196F3" />
          <Text style={styles.quickActionText}>Mis Consultas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Recetas')}
        >
          <MaterialCommunityIcons name="file-document" size={30} color="#FF9800" />
          <Text style={styles.quickActionText}>Recetas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('MapaMedicos')}
        >
          <MaterialCommunityIcons name="map" size={30} color="#F44336" />
          <Text style={styles.quickActionText}>Médicos Cercanos</Text>
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
          ¡Hola, {user?.nombre || 'Usuario'}! 👋
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
    alignItems: 'center',
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
  proximaConsultaMedico: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  proximaConsultaEspecialidad: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
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
  agendarButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  agendarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
  statNumber: {
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

export default DashboardScreen;
