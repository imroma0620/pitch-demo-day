import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc, deleteDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Login Error:", error);
    // Standard Firebase error codes
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error("El inicio de sesión con Google no está habilitado en la consola de Firebase. Por favor, actívalo en Authentication > Sign-in method.");
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error("El navegador bloqueó la ventana emergente. Por favor, permite ventanas emergentes para este sitio.");
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Cerraste la ventana de acceso antes de completar el inicio de sesión.");
    } else if (error.code === 'auth/cancelled-popup-request') {
      throw new Error("Se canceló el intento de inicio de sesión (había otra ventana emergente en curso). Intenta de nuevo.");
    } else if (error.code === 'auth/unauthorized-domain') {
      const domain = window.location.hostname;
      throw new Error(`Dominio no autorizado: ${domain}. Añade este dominio en la consola de Firebase (Authentication > Settings > Authorized domains).`);
    } else {
      const code = error?.code || 'unknown';
      const message = error?.message || "Error al iniciar sesión con Google.";
      throw new Error(`[${code}] ${message}`);
    }
  }
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();
