// Format spoken code like "A one two three four five six" or "a 1 2 3 4 5 6" -> "A123456"
export function cleanSpokenCode(raw: string): string {
  if (!raw) return "";
  let clean = raw.toUpperCase().replace(/\s+/g, "");
  // Word to digit replacement if spoken in English
  const words: Record<string, string> = {
    ZERO: "0",
    ONE: "1",
    TWO: "2",
    THREE: "3",
    FOUR: "4",
    FIVE: "5",
    SIX: "6",
    SEVEN: "7",
    EIGHT: "8",
    NINE: "9",
  };
  Object.keys(words).forEach((w) => {
    clean = clean.split(w).join(words[w]);
  });
  // Extract letter + 6 digits
  const match = clean.match(/([A-Z]\d{6})/);
  return match ? match[1] : clean.slice(0, 7);
}
