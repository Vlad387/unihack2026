// Hands a chat-prepared answer to /participa through sessionStorage, not the URL (a citizen's words
// shouldn't land in browser history or server logs). Read once by the form, then cleared.
const KEY = "citymind-answer-draft";

export function saveDraft(text: string): void {
  try {
    sessionStorage.setItem(KEY, text);
  } catch (err) {
    console.warn("draft not saved", err);
  }
}

export function readDraft(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return ""; // storage blocked (private mode): the form just starts empty
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch (err) {
    console.warn("draft not cleared", err);
  }
}
