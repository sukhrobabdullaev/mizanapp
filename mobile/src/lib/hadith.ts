/** Hadith hero card content.
 *
 * Bundled locally (no network, no per-user data) and rotated deterministically
 * by day so everyone sees the same narration on a given date.
 */

export interface Hadith {
  text: string;
  source: string;
}

export const HADITHS: readonly Hadith[] = [
  { text: 'Amallar niyatga bog‘liqdir.', source: 'Imom Buxoriy rivoyati' },
  { text: 'Kuchli mo‘min zaif mo‘mindan yaxshiroq va Allohga suyukliroqdir.', source: 'Imom Muslim rivoyati' },
  { text: 'Kimki Allohga va oxirat kuniga imon keltirgan bo‘lsa, yaxshi so‘z aytsin yoki jim tursin.', source: 'Buxoriy va Muslim' },
  { text: 'Sadaqa molni kamaytirmaydi.', source: 'Imom Muslim rivoyati' },
  { text: 'Eng yaxshi amal — oz bo‘lsa ham, doimiy bo‘lganidir.', source: 'Buxoriy va Muslim' },
  { text: 'Ikki ne’mat borki, ko‘p odamlar ularda aldanadi: sog‘liq va bo‘sh vaqt.', source: 'Imom Buxoriy rivoyati' },
  { text: 'Insonlarga rahm qilmagan kishiga Alloh ham rahm qilmaydi.', source: 'Buxoriy va Muslim' },
] as const;

/** Same hadith for the whole day, different across days. */
export function hadithOfTheDay(isoDate: string): Hadith {
  const digits = isoDate.replace(/\D/g, '');
  const index = Number(digits) % HADITHS.length;
  return HADITHS[index] ?? (HADITHS[0] as Hadith);
}
