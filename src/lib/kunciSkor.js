const PEPPER = "9A8B7C6D5E4F3G2H1I0J9K8L7M6N5O4P3Q2R1S0T_TRWK";

function getHashByte(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 256;
}

export function sandiSkor(opsiId, nilai) {
  if (nilai === null || nilai === undefined || isNaN(nilai)) return null;
  const keyByte = getHashByte(PEPPER + opsiId);
  const intVal = Math.round(Number(nilai) * 10);
  const masked = intVal ^ keyByte;
  return 'z' + masked.toString(36);
}

export function bukaSkor(opsiId, sandi) {
  if (sandi === null || sandi === undefined || sandi === '') return null;
  
  const keyByte = getHashByte(PEPPER + opsiId);
  
  if (typeof sandi === 'string' && sandi.startsWith('z')) {
      const masked = parseInt(sandi.slice(1), 36);
      if (isNaN(masked)) return null;
      const intVal = masked ^ keyByte;
      return intVal / 10;
  } else {
      const masked = parseInt(sandi, 36);
      if (isNaN(masked)) return null;
      const intVal = masked ^ keyByte;
      return intVal;
  }
}
