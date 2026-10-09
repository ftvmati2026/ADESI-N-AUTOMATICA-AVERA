import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { AdhesionForm } from '../types';

const COLLECTION_NAME = 'forms';

/**
 * Obtener todos los formularios desde Firestore
 */
export async function getRemoteForms(): Promise<AdhesionForm[]> {
  try {
    const formsCol = collection(db, COLLECTION_NAME);
    const q = query(formsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const forms: AdhesionForm[] = [];
    snapshot.forEach(docSnap => {
      forms.push(docSnap.data() as AdhesionForm);
    });
    return forms;
  } catch (error) {
    console.error('Error al obtener formularios de Firestore:', error);
    // Fallback sin orderBy por si falta índice
    try {
      const formsCol = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(formsCol);
      const forms: AdhesionForm[] = [];
      snapshot.forEach(docSnap => {
        forms.push(docSnap.data() as AdhesionForm);
      });
      return forms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (fallbackError) {
      console.error('Error en fallback getRemoteForms:', fallbackError);
      return [];
    }
  }
}

/**
 * Obtener un formulario específico por su ID única desde cualquier dispositivo
 */
export async function getRemoteFormById(id: string): Promise<AdhesionForm | null> {
  if (!id) return null;
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AdhesionForm;
    }
    return null;
  } catch (error) {
    console.error(`Error al obtener formulario ${id} de Firestore:`, error);
    return null;
  }
}

/**
 * Guardar o crear un formulario en Firestore
 */
export async function saveRemoteForm(form: AdhesionForm): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, form.id);
  // Limpiar undefined antes de enviar a Firestore
  const cleanData: Record<string, any> = {};
  for (const [key, value] of Object.entries(form)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  await setDoc(docRef, cleanData, { merge: true });
}

/**
 * Actualizar datos de un formulario existente (por ej. cuando el cliente firma)
 */
export async function updateRemoteForm(id: string, updates: Partial<AdhesionForm>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const cleanUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }
  await updateDoc(docRef, cleanUpdates);
}

/**
 * Eliminar un formulario de Firestore
 */
export async function deleteRemoteForm(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}
