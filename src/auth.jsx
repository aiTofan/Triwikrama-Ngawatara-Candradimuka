import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously, linkWithPopup } from "firebase/auth";
import { penggunaService } from "./services/penggunaService";

export async function startAnonymousLogin(nama) {
  try {
    const result = await signInAnonymously(auth);
    const user = result.user;
    
    // Jangan langsung menulis ke Firestore saat pembuatan sesi tamu pertama kali, 
    // karena token auth Firebase seringkali belum sepenuhnya sinkron ke klien Firestore.
    // Menulis langsung akan menyebabkan galat permission-denied.
    // Profil akan disimpan di kemudian waktu atau diabaikan untuk tamu.
    
    return user;
  } catch (error) {
    console.error("Error signing in anonymously", error);
    throw error;
  }
}

export async function startLogin() {
  const provider = new GoogleAuthProvider();
  let user;
  try {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        const result = await linkWithPopup(auth.currentUser, provider);
        user = result.user;
      } catch (linkError) {
        if (linkError.code === 'auth/credential-already-in-use') {
          await signOut(auth);
          const result = await signInWithPopup(auth, provider);
          user = result.user;
        } else {
          throw linkError;
        }
      }
    } else {
      const result = await signInWithPopup(auth, provider);
      user = result.user;
    }
    
    try {
      await penggunaService.sinkronkanPenggunaGoogle(user);
    } catch (e) {
      console.warn("Could not save user to Firestore (quota likely exceeded), proceeding anyway", e);
    }

    return user;
  } catch (error) {
    console.error("Error signing in", error);
    throw error;
  }
}

export async function logoutAndClear() {
  await signOut(auth);
  localStorage.clear();
  window.location.href = "/";
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
          const profileRes = await penggunaService.ambilProfil(firebaseUser.uid);
          if (profileRes.success && profileRes.data) {
            userData = { ...userData, ...profileRes.data };
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

