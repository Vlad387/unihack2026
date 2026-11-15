// Hands a chat-prepared answer to Participă. Kept in memory only (never saved on the phone or sent anywhere):
// a citizen's words shouldn't outlive the session. Read once by the form, then cleared.
let draft = '';

export const saveDraft = (text: string) => {
  draft = text;
};

export function takeDraft(): string {
  const text = draft;
  draft = '';
  return text;
}
