import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Standard Firebase config from environment variables
// Values prefixed with VITE_ are exposed to the client in Vite projects
const firebaseEnvConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let firestoreDatabaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID;

// Fallback logic for AI Studio preview environment
// We use import.meta.glob to avoid build failures in environments where the file is missing (like Cloudflare)
const localConfigs = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const localConfig: any = Object.values(localConfigs)[0] || {};
const firebaseLocalConfig = localConfig.default || {};

const config = {
  apiKey: firebaseEnvConfig.apiKey || firebaseLocalConfig.apiKey,
  authDomain: firebaseEnvConfig.authDomain || firebaseLocalConfig.authDomain,
  projectId: firebaseEnvConfig.projectId || firebaseLocalConfig.projectId,
  storageBucket: firebaseEnvConfig.storageBucket || firebaseLocalConfig.storageBucket,
  messagingSenderId: firebaseEnvConfig.messagingSenderId || firebaseLocalConfig.messagingSenderId,
  appId: firebaseEnvConfig.appId || firebaseLocalConfig.appId,
};

const dbId = firestoreDatabaseId || firebaseLocalConfig.firestoreDatabaseId;

const app = initializeApp(config);
export const db = getFirestore(app, dbId || '(default)');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
