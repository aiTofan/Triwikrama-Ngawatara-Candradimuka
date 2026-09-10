import { db } from "../firebase";
import { 
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, setDoc, updateDoc, deleteDoc, writeBatch, runTransaction
} from "firebase/firestore";

// Fungsi untuk menerjemahkan pesan error Firebase
const terjemahkanError = (code) => {
  switch (code) {
    case 'permission-denied':
      return 'Anda tidak memiliki hak akses untuk melakukan tindakan ini.';
    case 'not-found':
      return 'Data yang dicari tidak ditemukan.';
    case 'already-exists':
      return 'Data sudah ada di sistem.';
    case 'unauthenticated':
      return 'Anda harus masuk terlebih dahulu.';
    case 'unavailable':
      return 'Layanan sedang tidak tersedia. Periksa koneksi internet Anda.';
    case 'deadline-exceeded':
      return 'Waktu permintaan habis. Silakan coba lagi.';
    default:
      return 'Terjadi kesalahan sistem. Silakan coba lagi nanti.';
  }
};

// Wrapper untuk operasi Firebase dengan timeout 3 detik
const denganTimeout = (promise, waktu = 3000) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('Waktu habis');
      err.code = 'deadline-exceeded';
      reject(err);
    }, waktu);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
};

// Fungsi tunggal penanganan operasi dan galat
export const listenerManager = { unsubscribes: [], add: (unsub) => listenerManager.unsubscribes.push(unsub), clearAll: () => { listenerManager.unsubscribes.forEach(unsub => { if (typeof unsub === "function") unsub(); }); listenerManager.unsubscribes = []; } };

export const jalankanOperasi = async (operasi, customTimeout) => {
  try {
    const hasil = await denganTimeout(operasi(), customTimeout || 3000);
    return { success: true, data: hasil, errorCode: null, message: 'Operasi berhasil' };
  } catch (error) {
    // Telan galat yang mungkin datang terlambat atau gagal
    console.warn("Firestore operasi gagal:", error.code || error.message);
    const errorCode = error.code || 'unknown';
    return {
      success: false,
      data: null,
      errorCode,
      message: terjemahkanError(errorCode)
    };
  }
};

export { 
  db, collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, setDoc, updateDoc, deleteDoc, writeBatch, runTransaction 
};
