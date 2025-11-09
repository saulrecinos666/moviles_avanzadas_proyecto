import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../context/UserContext';

const HistorialMedicoScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos'); // todos, consulta, prueba, receta, otro

  useEffect(() => {
    loadHistorial();
  }, []);

  useEffect(() => {
    loadHistorial();
  }, [filtroTipo]);

  const loadHistorial = async () => {
    try {
      setLoading(true);
      let result;
      if (filtroTipo === 'todos') {
        result = await db.getAllAsync(
          `SELECT * FROM historialMedico
           WHERE pacienteId = ?
           ORDER BY fecha DESC`,
          [user.id]
        );
      } else {
        result = await db.getAllAsync(
          `SELECT * FROM historialMedico
           WHERE pacienteId = ? AND tipoRegistro = ?
           ORDER BY fecha DESC`,
          [user.id, filtroTipo]
        );
      }
      setHistorial(result);
    } catch (error) {
      console.error('Error cargando historial:', error);
      Alert.alert('Error', 'No se pudo cargar el historial médico');
    } finally {
      setLoading(false);
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'consulta': return 'stethoscope';
      case 'prueba': return 'microscope';
      case 'receta': return 'file-document';
      case 'diagnostico': return 'clipboard-text';
      default: return 'file-document-outline';
    }
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'consulta': return '#2196F3';
      case 'prueba': return '#FF9800';
      case 'receta': return '#42A5F5';
      case 'diagnostico': return '#9C27B0';
      default: return '#666';
    }
  };

  const renderRegistro = ({ item }) => {
    const fecha = new Date(item.fecha);
    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <TouchableOpacity
        style={styles.registroCard}
        onPress={() => navigation.navigate('DetalleRegistro', { registro: item })}
      >
        <View style={styles.registroHeader}>
          <View style={[styles.iconContainer, { backgroundColor: getTipoColor(item.tipoRegistro) + '20' }]}>
            <MaterialCommunityIcons
              name={getTipoIcon(item.tipoRegistro)}
              size={24}
              color={getTipoColor(item.tipoRegistro)}
            />
          </View>
          <View style={styles.registroInfo}>
            <Text style={styles.registroTitulo}>{item.titulo}</Text>
            <Text style={styles.registroTipo}>{item.tipoRegistro.toUpperCase()}</Text>
            <Text style={styles.registroFecha}>{fechaFormateada}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
        </View>

        {item.descripcion && (
          <Text style={styles.registroDescripcion} numberOfLines={2}>
            {item.descripcion}
          </Text>
        )}

        {item.archivosAdjuntos && (
          <View style={styles.archivosContainer}>
            <MaterialCommunityIcons name="attachment" size={16} color="#666" />
            <Text style={styles.archivosText}>Archivos adjuntos</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, filtroTipo === 'todos' && styles.filterChipActive]}
            onPress={() => setFiltroTipo('todos')}
          >
            <Text style={[styles.filterChipText, filtroTipo === 'todos' && styles.filterChipTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filtroTipo === 'consulta' && styles.filterChipActive]}
            onPress={() => setFiltroTipo('consulta')}
          >
            <Text style={[styles.filterChipText, filtroTipo === 'consulta' && styles.filterChipTextActive]}>
              Consultas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filtroTipo === 'prueba' && styles.filterChipActive]}
            onPress={() => setFiltroTipo('prueba')}
          >
            <Text style={[styles.filterChipText, filtroTipo === 'prueba' && styles.filterChipTextActive]}>
              Pruebas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filtroTipo === 'receta' && styles.filterChipActive]}
            onPress={() => setFiltroTipo('receta')}
          >
            <Text style={[styles.filterChipText, filtroTipo === 'receta' && styles.filterChipTextActive]}>
              Recetas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filtroTipo === 'diagnostico' && styles.filterChipActive]}
            onPress={() => setFiltroTipo('diagnostico')}
          >
            <Text style={[styles.filterChipText, filtroTipo === 'diagnostico' && styles.filterChipTextActive]}>
              Diagnósticos
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={historial}
        renderItem={renderRegistro}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay registros en el historial</Text>
            <Text style={styles.emptySubtext}>
              Tu historial médico aparecerá aquí después de tus consultas
            </Text>
          </View>
        }
      />
    </View>
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
  filtersContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
  },
  filterChipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 15,
  },
  registroCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  registroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  registroInfo: {
    flex: 1,
  },
  registroTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  registroTipo: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
    fontWeight: '600',
  },
  registroFecha: {
    fontSize: 12,
    color: '#999',
  },
  registroDescripcion: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    lineHeight: 20,
  },
  archivosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  archivosText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default HistorialMedicoScreen;

