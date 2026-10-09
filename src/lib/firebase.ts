import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicializar la app de Firebase (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Conectar con Firestore utilizando la base de datos provisionada
export const db = initializeFirestore(
  app,
  {},
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export default app;
