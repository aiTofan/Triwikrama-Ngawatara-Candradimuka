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
  if (nilai === null || nilai === undefined) return null;
  const keyByte = getHashByte(PEPPER + opsiId);
  const masked = parseInt(nilai, 10) ^ keyByte;
  return masked.toString(36);
}

export function bukaSkor(opsiId, sandi) {
  if (sandi === null || sandi === undefined) return 0;
  const keyByte = getHashByte(PEPPER + opsiId);
  const masked = parseInt(sandi, 36);
  return masked ^ keyByte;
}
