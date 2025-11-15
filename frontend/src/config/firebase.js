import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBTIHqmghC8B1vq1BanvAV8Y8anxrrzE5E",
  authDomain: "sistemaserviciomedico.firebaseapp.com",
  projectId: "sistemaserviciomedico",
  storageBucket: "sistemaserviciomedico.firebasestorage.app",
  messagingSenderId: "844713637365",
  appId: "1:844713637365:web:5ff39d13c99845c580dcbc",
  databaseURL: "https://sistemaserviciomedico-default-rtdb.firebaseio.com"
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase: Configuración incompleta. Verifica tus credenciales.');
}

let app;
try {
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado correctamente');
    console.log('Proyecto:', firebaseConfig.projectId);
  } else {
    app = firebase.app();
    console.log('✅ Firebase ya estaba inicializado');
  }
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
  console.error('Detalles:', error.message);
  throw error;
}

if (!app) {
  throw new Error('Firebase no se pudo inicializar');
}

let auth;
try {
  auth = firebase.auth();
  if (auth) {
    console.log('✅ Firebase Auth configurado');
  } else {
    console.error('❌ Firebase Auth no está disponible');
  }
} catch (error) {
  console.error('❌ Error obteniendo Firebase Auth:', error);
  throw new Error('No se pudo configurar Firebase Auth. Verifica que Authentication esté habilitado en Firebase Console.');
}

export { auth };

let database;
try {
  if (firebaseConfig.databaseURL) {
    database = firebase.database();
    console.log('✅ Firebase Realtime Database configurado');
  } else {
    console.warn('⚠️ Realtime Database URL no configurada');
  }
} catch (error) {
  console.warn('⚠️ Realtime Database no está configurado:', error.message);
  database = null;
}

export { database };

let firestore, storage;
try {
  firestore = firebase.firestore();
  storage = firebase.storage();
  console.log('✅ Firebase Firestore y Storage configurados');
} catch (error) {
  console.error('❌ Error configurando Firestore/Storage:', error);
}

export { firestore, storage };
export default app;