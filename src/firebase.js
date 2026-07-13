import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyB1sdUFUbxuvtKpR_Kj5fKPIKsx48qenRA',
  authDomain: 'planner-ed856.firebaseapp.com',
  projectId: 'planner-ed856',
  storageBucket: 'planner-ed856.firebasestorage.app',
  messagingSenderId: '390254678358',
  appId: '1:390254678358:web:76f4cbe56692373f5f86f7',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
