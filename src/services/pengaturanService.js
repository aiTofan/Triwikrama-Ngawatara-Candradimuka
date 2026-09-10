import { db } from "./firestore";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { KOLEKSI } from "./koleksi";
import { CONFIG } from "../config";

class PengaturanService {
  async getQuotas() {
    try {
      const docRef = doc(db, KOLEKSI.PENGATURAN, "kuota_sesi");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        CONFIG.QUOTAS = { ...CONFIG.QUOTAS, ...data };
        return data;
      }
      return CONFIG.QUOTAS;
    } catch (e) {
      console.warn("Gagal mengambil pengaturan kuota, menggunakan default", e);
      return CONFIG.QUOTAS;
    }
  }

  async saveQuotas(quotas) {
    try {
      const docRef = doc(db, KOLEKSI.PENGATURAN, "kuota_sesi");
      await setDoc(docRef, quotas, { merge: true });
      CONFIG.QUOTAS = { ...CONFIG.QUOTAS, ...quotas };
      return { success: true };
    } catch (e) {
      console.error("Gagal menyimpan kuota", e);
      return { success: false, message: e.message };
    }
  }

  async getAppConfig() {
    try {
      const docRef = doc(db, KOLEKSI.PENGATURAN, "app_config");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
      return { maintenance_mode: false, bot_protection: true };
    } catch (e) {
      console.warn("Gagal mengambil pengaturan aplikasi", e);
      return { maintenance_mode: false, bot_protection: true };
    }
  }

  async saveAppConfig(config) {
    try {
      const docRef = doc(db, KOLEKSI.PENGATURAN, "app_config");
      await setDoc(docRef, config, { merge: true });
      return { success: true };
    } catch (e) {
      console.error("Gagal menyimpan pengaturan aplikasi", e);
      return { success: false, message: e.message };
    }
  }
}

export const pengaturanService = new PengaturanService();
