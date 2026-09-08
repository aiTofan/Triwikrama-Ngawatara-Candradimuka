import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export async function startAnonymousLogin(nama) {
  try {
    const result = await signInAnonymously(auth);
    const user = result.user;
    
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          id: user.uid,
          email: '',
          nama_tampilan: nama || 'Peserta',
          nama_lengkap: nama || 'Peserta',
          avatar_url: '',
          role: 'user'
        });
      } else {
        await updateDoc(userRef, {
          nama_tampilan: nama || userSnap.data().nama_tampilan,
          nama_lengkap: nama || userSnap.data().nama_lengkap
        });
      }
    } catch (e) {
      console.warn("Could not save user to Firestore (quota likely exceeded), proceeding anyway", e);
    }

    return user;
  } catch (error) {
    console.error("Error signing in anonymously", error);
    throw error;
  }
}

export async function startLogin() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    try {
      // Check if user exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          nama_tampilan: user.displayName || 'Peserta',
          nama_lengkap: user.displayName || 'Peserta',
          avatar_url: user.photoURL || '',
          role: user.email === 'tofantriwikrama@gmail.com' ? 'admin' : 'user' // Setup initial admin
        });
      }
    } catch (e) {
      console.warn("Could not save user to Firestore (quota likely exceeded), proceeding anyway", e);
    }

    return user;
  } catch (error) {
    console.error("Error signing in", error);
    throw error;
  }
}

export async function logout() {
  await signOut(auth);
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch from Firestore to get roles
        let userData = {
          uid: firebaseUser.uid,
          id: firebaseUser.uid,
          email: firebaseUser.email,
          nama_tampilan: firebaseUser.displayName,
          avatar_url: firebaseUser.photoURL,
          role: 'user'
        };
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            userData = { ...userData, ...userSnap.data() };
          }
        } catch (e) {
          console.warn("Could not fetch user role, fallback to default", e);
        }
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, setUser };
}

export async function exchangeSession(sessionId) {
  return null;
}

