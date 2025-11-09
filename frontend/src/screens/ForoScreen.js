import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';

const ForoScreen = ({ navigation }) => {
  const { user } = useUser();
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [nuevoPost, setNuevoPost] = useState({
    titulo: '',
    contenido: '',
    categoria: 'General'
  });
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');

  const categorias = [
    'Todas',
    'General',
    'Nutrición',
    'Ejercicio',
    'Salud Mental',
    'Medicamentos',
    'Motivación',
    'Preguntas'
  ];

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    // Simular datos del foro
    const postsSimulados = [
      {
        id: 1,
        titulo: '¿Cómo mantener la motivación para hacer ejercicio?',
        contenido: 'He estado haciendo ejercicio por 3 meses pero últimamente me cuesta mucho mantener la rutina. ¿Algún consejo?',
        categoria: 'Motivación',
        autor: 'Ana García',
        fecha: '2024-01-21',
        likes: 12,
        respuestas: 8,
        usuarioId: 2
      },
      {
        id: 2,
        titulo: 'Recetas saludables para el desayuno',
        contenido: 'Comparto algunas recetas fáciles y nutritivas que me han funcionado muy bien para empezar el día con energía.',
        categoria: 'Nutrición',
        autor: 'Carlos López',
        fecha: '2024-01-20',
        likes: 25,
        respuestas: 15,
        usuarioId: 3
      },
      {
        id: 3,
        titulo: 'Rutina de ejercicios en casa',
        contenido: '¿Alguien tiene una rutina efectiva que se pueda hacer en casa sin equipos? Busco algo de 30-45 minutos.',
        categoria: 'Ejercicio',
        autor: 'María Rodríguez',
        fecha: '2024-01-19',
        likes: 18,
        respuestas: 12,
        usuarioId: 4
      },
      {
        id: 4,
        titulo: 'Efectos secundarios de la vitamina D',
        contenido: 'Mi médico me recetó vitamina D pero quiero saber si alguien ha experimentado efectos secundarios.',
        categoria: 'Medicamentos',
        autor: 'Pedro Martín',
        fecha: '2024-01-18',
        likes: 6,
        respuestas: 4,
        usuarioId: 5
      },
      {
        id: 5,
        titulo: 'Manejo del estrés y ansiedad',
        contenido: 'El estrés del trabajo está afectando mi salud. ¿Qué técnicas de relajación recomiendan?',
        categoria: 'Salud Mental',
        autor: 'Laura Sánchez',
        fecha: '2024-01-17',
        likes: 20,
        respuestas: 16,
        usuarioId: 6
      }
    ];
    setPosts(postsSimulados);
  };

  const handleCrearPost = () => {
    if (!nuevoPost.titulo || !nuevoPost.contenido) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const post = {
      id: Date.now(),
      ...nuevoPost,
      autor: user?.nombre || 'Usuario',
      fecha: new Date().toISOString().split('T')[0],
      likes: 0,
      respuestas: 0,
      usuarioId: user?.id || 1
    };

    setPosts([post, ...posts]);
    Alert.alert('Éxito', 'Post publicado correctamente');
    setShowModal(false);
    setNuevoPost({ titulo: '', contenido: '', categoria: 'General' });
  };

  const handleLike = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likes: post.likes + 1 }
        : post
    ));
  };

  const getCategoriaColor = (categoria) => {
    switch (categoria) {
      case 'General': return '#2196F3';
      case 'Nutrición': return '#FF9800';
      case 'Ejercicio': return '#2196F3';
      case 'Salud Mental': return '#9C27B0';
      case 'Medicamentos': return '#F44336';
      case 'Motivación': return '#FF5722';
      case 'Preguntas': return '#607D8B';
      default: return '#9E9E9E';
    }
  };

  const getCategoriaIcon = (categoria) => {
    switch (categoria) {
      case 'General': return 'forum';
      case 'Nutrición': return 'food';
      case 'Ejercicio': return 'dumbbell';
      case 'Salud Mental': return 'brain';
      case 'Medicamentos': return 'pill';
      case 'Motivación': return 'lightbulb';
      case 'Preguntas': return 'help-circle';
      default: return 'forum';
    }
  };

  const postsFiltrados = categoriaFiltro === 'Todas' 
    ? posts 
    : posts.filter(post => post.categoria === categoriaFiltro);

  const renderFiltros = () => (
    <View style={styles.filtrosContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categorias.map((categoria) => (
          <TouchableOpacity
            key={categoria}
            style={[
              styles.filtroButton,
              categoriaFiltro === categoria && styles.filtroButtonSelected
            ]}
            onPress={() => setCategoriaFiltro(categoria)}
          >
            <Text style={[
              styles.filtroButtonText,
              categoriaFiltro === categoria && styles.filtroButtonTextSelected
            ]}>
              {categoria}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPostItem = ({ item }) => (
    <TouchableOpacity style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postInfo}>
          <View style={[
            styles.categoriaBadge,
            { backgroundColor: getCategoriaColor(item.categoria) + '20' }
          ]}>
            <MaterialCommunityIcons 
              name={getCategoriaIcon(item.categoria)} 
              size={16} 
              color={getCategoriaColor(item.categoria)} 
            />
            <Text style={[
              styles.categoriaText,
              { color: getCategoriaColor(item.categoria) }
            ]}>
              {item.categoria}
            </Text>
          </View>
          <Text style={styles.postTitulo}>{item.titulo}</Text>
        </View>
        <Text style={styles.postFecha}>{item.fecha}</Text>
      </View>
      
      <Text style={styles.postContenido} numberOfLines={3}>
        {item.contenido}
      </Text>
      
      <View style={styles.postFooter}>
        <View style={styles.postStats}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => handleLike(item.id)}
          >
            <MaterialCommunityIcons name="heart" size={16} color="#F44336" />
            <Text style={styles.statText}>{item.likes}</Text>
          </TouchableOpacity>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="comment" size={16} color="#666" />
            <Text style={styles.statText}>{item.respuestas}</Text>
          </View>
        </View>
        
        <View style={styles.postAutor}>
          <MaterialCommunityIcons name="account" size={16} color="#666" />
          <Text style={styles.autorText}>{item.autor}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderModalCrearPost = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Crear Nuevo Post</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Título *</Text>
              <TextInput
                style={styles.input}
                value={nuevoPost.titulo}
                onChangeText={(text) => setNuevoPost({...nuevoPost, titulo: text})}
                placeholder="Escribe un título descriptivo"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Categoría</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categorias.filter(cat => cat !== 'Todas').map((categoria) => (
                  <TouchableOpacity
                    key={categoria}
                    style={[
                      styles.categoriaButton,
                      nuevoPost.categoria === categoria && styles.categoriaButtonSelected
                    ]}
                    onPress={() => setNuevoPost({...nuevoPost, categoria})}
                  >
                    <Text style={[
                      styles.categoriaButtonText,
                      nuevoPost.categoria === categoria && styles.categoriaButtonTextSelected
                    ]}>
                      {categoria}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contenido *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={nuevoPost.contenido}
                onChangeText={(text) => setNuevoPost({...nuevoPost, contenido: text})}
                placeholder="Comparte tu experiencia, pregunta o consejo..."
                multiline
                numberOfLines={6}
              />
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleCrearPost}
            >
              <Text style={styles.saveButtonText}>Publicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Foro de Salud</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      {renderFiltros()}
      
      <FlatList
        data={postsFiltrados}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      
      {renderModalCrearPost()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtrosContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filtroButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
    backgroundColor: '#F9F9F9',
  },
  filtroButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filtroButtonText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  filtroButtonTextSelected: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  postInfo: {
    flex: 1,
  },
  categoriaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoriaText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  postTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    lineHeight: 22,
  },
  postFecha: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 10,
  },
  postContenido: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 15,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postStats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  postAutor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autorText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  categoriaButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
    backgroundColor: '#F9F9F9',
  },
  categoriaButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoriaButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  categoriaButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666666',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ForoScreen;
