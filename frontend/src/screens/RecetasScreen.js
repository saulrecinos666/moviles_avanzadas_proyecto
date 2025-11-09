import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Share
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useUser } from '../context/UserContext';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const RecetasScreen = ({ navigation, route }) => {
  const db = useSQLiteContext();
  const { user } = useUser();
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const consultaId = route?.params?.consultaId;

  useEffect(() => {
    loadRecetas();
  }, [consultaId]);

  const loadRecetas = async () => {
    try {
      setLoading(true);
      let result;
      if (consultaId) {
        result = await db.getAllAsync(
          `SELECT r.*, m.nombre as medicoNombre, m.especialidad, c.fecha as fechaConsulta
           FROM recetas r
           JOIN medicos m ON r.medicoId = m.id
           JOIN consultas c ON r.consultaId = c.id
           WHERE r.pacienteId = ? AND r.consultaId = ?
           ORDER BY r.fechaEmision DESC`,
          [user.id, consultaId]
        );
      } else {
        result = await db.getAllAsync(
          `SELECT r.*, m.nombre as medicoNombre, m.especialidad, c.fecha as fechaConsulta
           FROM recetas r
           JOIN medicos m ON r.medicoId = m.id
           JOIN consultas c ON r.consultaId = c.id
           WHERE r.pacienteId = ?
           ORDER BY r.fechaEmision DESC`,
          [user.id]
        );
      }
      setRecetas(result);
    } catch (error) {
      console.error('Error cargando recetas:', error);
      Alert.alert('Error', 'No se pudieron cargar las recetas');
    } finally {
      setLoading(false);
    }
  };

  const compartirReceta = async (receta) => {
    try {
      const mensaje = `Receta Médica\n\n` +
        `Número: ${receta.numeroReceta}\n` +
        `Médico: ${receta.medicoNombre}\n` +
        `Especialidad: ${receta.especialidad}\n` +
        `Fecha: ${new Date(receta.fechaEmision).toLocaleDateString('es-ES')}\n\n` +
        `Medicamentos:\n${receta.medicamentos}\n\n` +
        `Instrucciones:\n${receta.instrucciones || 'N/A'}\n\n` +
        `Diagnóstico: ${receta.diagnostico || 'N/A'}`;

      await Share.share({
        message: mensaje,
        title: 'Receta Médica'
      });
    } catch (error) {
      console.error('Error compartiendo receta:', error);
      Alert.alert('Error', 'No se pudo compartir la receta');
    }
  };

  const descargarReceta = async (receta) => {
    try {
      // Aquí se generaría el PDF de la receta
      // Por ahora mostramos un mensaje
      Alert.alert(
        'Descargar Receta',
        'La funcionalidad de descarga de PDF estará disponible próximamente',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error descargando receta:', error);
      Alert.alert('Error', 'No se pudo descargar la receta');
    }
  };

  const renderReceta = ({ item }) => {
    const fechaEmision = new Date(item.fechaEmision);
    const fechaVencimiento = item.fechaVencimiento ? new Date(item.fechaVencimiento) : null;
    const hoy = new Date();
    const estaVencida = fechaVencimiento && fechaVencimiento < hoy;

    return (
      <View style={styles.recetaCard}>
        <View style={styles.recetaHeader}>
          <View style={styles.recetaTitleContainer}>
            <MaterialCommunityIcons name="file-document" size={32} color="#2196F3" />
            <View style={styles.recetaTitle}>
              <Text style={styles.recetaNumero}>Receta #{item.numeroReceta}</Text>
              <Text style={styles.recetaMedico}>{item.medicoNombre}</Text>
              <Text style={styles.recetaEspecialidad}>{item.especialidad}</Text>
            </View>
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: estaVencida ? '#F44336' : '#42A5F5' }]}>
            <Text style={styles.estadoText}>
              {item.estado === 'activa' && !estaVencida ? 'Activa' : 'Vencida'}
            </Text>
          </View>
        </View>

        <View style={styles.recetaInfo}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={18} color="#666" />
            <Text style={styles.infoText}>
              Emisión: {fechaEmision.toLocaleDateString('es-ES')}
            </Text>
          </View>
          {fechaVencimiento && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color="#666" />
              <Text style={styles.infoText}>
                Vencimiento: {fechaVencimiento.toLocaleDateString('es-ES')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.medicamentosContainer}>
          <Text style={styles.sectionTitle}>Medicamentos</Text>
          <Text style={styles.medicamentosText}>{item.medicamentos}</Text>
        </View>

        {item.instrucciones && (
          <View style={styles.instruccionesContainer}>
            <Text style={styles.sectionTitle}>Instrucciones</Text>
            <Text style={styles.instruccionesText}>{item.instrucciones}</Text>
          </View>
        )}

        {item.diagnostico && (
          <View style={styles.diagnosticoContainer}>
            <Text style={styles.sectionTitle}>Diagnóstico</Text>
            <Text style={styles.diagnosticoText}>{item.diagnostico}</Text>
          </View>
        )}

        {item.notas && (
          <View style={styles.notasContainer}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.notasText}>{item.notas}</Text>
          </View>
        )}

        <View style={styles.recetaActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => compartirReceta(item)}
          >
            <MaterialCommunityIcons name="share-variant" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>Compartir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => descargarReceta(item)}
          >
            <MaterialCommunityIcons name="download" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>Descargar PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando recetas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={recetas}
        renderItem={renderReceta}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No tienes recetas registradas</Text>
            <Text style={styles.emptySubtext}>
              Las recetas aparecerán aquí después de tus consultas
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
  listContainer: {
    padding: 15,
  },
  recetaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  recetaTitleContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  recetaTitle: {
    marginLeft: 12,
    flex: 1,
  },
  recetaNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recetaMedico: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 2,
  },
  recetaEspecialidad: {
    fontSize: 12,
    color: '#666',
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  estadoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  recetaInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
  },
  medicamentosContainer: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  medicamentosText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  instruccionesContainer: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  instruccionesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  diagnosticoContainer: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  diagnosticoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  notasContainer: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  notasText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  recetaActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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

export default RecetasScreen;

