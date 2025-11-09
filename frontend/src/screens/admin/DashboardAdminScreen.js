import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DashboardAdminScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="shield-account" size={48} color="#2196F3" />
        <Text style={styles.title}>Dashboard Administrador</Text>
        <Text style={styles.subtitle}>Panel de control administrativo</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="account-group" size={32} color="#2196F3" />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Usuarios</Text>
        </View>

        <View style={styles.statCard}>
          <MaterialCommunityIcons name="doctor" size={32} color="#2196F3" />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Médicos</Text>
        </View>

        <View style={styles.statCard}>
          <MaterialCommunityIcons name="calendar-clock" size={32} color="#2196F3" />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Consultas</Text>
        </View>

        <View style={styles.statCard}>
          <MaterialCommunityIcons name="file-document" size={32} color="#2196F3" />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Recetas</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Panel de administración del sistema. Gestiona usuarios, médicos, 
          consultas y genera reportes.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  infoContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default DashboardAdminScreen;

