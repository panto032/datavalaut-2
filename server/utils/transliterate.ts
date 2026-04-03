const cyrToLat: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Ђ: "Đ", Е: "E", Ж: "Ž",
  З: "Z", И: "I", Ј: "J", К: "K", Л: "L", Љ: "Lj", М: "M", Н: "N",
  Њ: "Nj", О: "O", П: "P", Р: "R", С: "S", Т: "T", Ћ: "Ć", У: "U",
  Ф: "F", Х: "H", Ц: "C", Ч: "Č", Џ: "Dž", Ш: "Š",
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "đ", е: "e", ж: "ž",
  з: "z", и: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n",
  њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "ć", у: "u",
  ф: "f", х: "h", ц: "c", ч: "č", џ: "dž", ш: "š",
};

const latToCyr: Record<string, string> = {
  Lj: "Љ", Nj: "Њ", Dž: "Џ",
  lj: "љ", nj: "њ", dž: "џ",
  LJ: "Љ", NJ: "Њ", DŽ: "Џ",
  A: "А", B: "Б", V: "В", G: "Г", D: "Д", Đ: "Ђ", E: "Е", Ž: "Ж",
  Z: "З", I: "И", J: "Ј", K: "К", L: "Л", M: "М", N: "Н",
  O: "О", P: "П", R: "Р", S: "С", T: "Т", Ć: "Ћ", U: "У",
  F: "Ф", H: "Х", C: "Ц", Č: "Ч", Š: "Ш",
  a: "а", b: "б", v: "в", g: "г", d: "д", đ: "ђ", e: "е", ž: "ж",
  z: "з", i: "и", j: "ј", k: "к", l: "л", m: "м", n: "н",
  o: "о", p: "п", r: "р", s: "с", t: "т", ć: "ћ", u: "у",
  f: "ф", h: "х", c: "ц", č: "ч", š: "ш",
};

export function toLatin(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // Check digraphs first (Љ, Њ, Џ are single chars in Cyrillic)
    result += cyrToLat[ch] ?? ch;
  }
  return result;
}

export function toCyrillic(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    // Check digraphs first
    if (i + 1 < text.length) {
      const two = text[i] + text[i + 1];
      if (latToCyr[two]) {
        result += latToCyr[two];
        i++;
        continue;
      }
    }
    const ch = text[i];
    result += latToCyr[ch] ?? ch;
  }
  return result;
}

export function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

export function hasLatin(text: string): boolean {
  return /[a-zA-ZčćžšđČĆŽŠĐ]/.test(text);
}

export function getAlternateScript(text: string): string {
  if (hasCyrillic(text)) return toLatin(text);
  if (hasLatin(text)) return toCyrillic(text);
  return text;
}

// Transliteracija ćirilice u latinicu za sve string polja objekta
export function latinize<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj as any)) {
    if (typeof value === "string" && hasCyrillic(value)) {
      result[key] = toLatin(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) => (typeof v === "string" && hasCyrillic(v) ? toLatin(v) : v));
    } else {
      result[key] = value;
    }
  }
  return result;
}
