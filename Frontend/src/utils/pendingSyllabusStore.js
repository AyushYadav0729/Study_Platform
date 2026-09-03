// In-memory handoff for a syllabus (text or File) picked in AddSubjectModal,
// consumed once by the Subject page right after navigation. Not persisted —
// a File can't survive router state/serialization, so this stays module-local.
const store = new Map();

export function setPendingSyllabus(subjectId, payload) {
  store.set(subjectId, payload);
}

export function takePendingSyllabus(subjectId) {
  const payload = store.get(subjectId);
  store.delete(subjectId);
  return payload;
}
