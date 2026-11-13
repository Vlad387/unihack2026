// Citizens join without an account, so the browser remembers an anonymous id.
const KEY = "citymind:participant";

export function getParticipantId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch (err) {
    // private mode / blocked storage: still let them take part, just not across reloads
    console.warn("localStorage unavailable, using a one-off participant id", err);
    return crypto.randomUUID();
  }
}
