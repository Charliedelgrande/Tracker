export function newId() {
  // crypto.randomUUID is supported in modern browsers (including PWA contexts).
  return crypto.randomUUID()
}


