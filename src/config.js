import { TINGKAT } from "./domain/soal";

export const CONFIG = {
  QUOTAS: {
    [TINGKAT.BHURLOKA]: 17,
    [TINGKAT.AKASA]: 30,
    [TINGKAT.PARAMARTHA]: 33
  },
  WAKTU_MENIT: {
    [TINGKAT.BHURLOKA]: 10,
    [TINGKAT.AKASA]: 15,
    [TINGKAT.PARAMARTHA]: 20
  },
  PENALTI_JEBAKAN: 20,
  PENALTI_KONSISTENSI: 10,
  DEVIASI_MAKSIMUM: 25
};

export function withTimeout(promise, ms = 3000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timeoutId = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error('TIMEOUT'));
    }, ms);

    promise.then(
      (res) => {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        resolve(res);
      },
      (err) => {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        reject(err);
      }
    );
  });
}
