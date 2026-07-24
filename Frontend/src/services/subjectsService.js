// The backend doesn't expose subject/module endpoints yet (per the project
// brief, that's later in Sem 1). This service persists subjects to
// localStorage, scoped per logged-in user, so the dashboard is usable now.
//
// It's written with the same async, promise-returning shape a real
// `GET/POST /subjects` call would have (see authService.js), so swapping the
// body of each method for an axios call later doesn't require touching any
// component that imports `subjectsService`.

const STORAGE_KEY = "folio.subjects";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(subjects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
}

export const subjectsService = {
  list: async () => {
    return readAll();
  },

  create: async (name) => {
    const subjects = readAll();
    const subject = {
      id: crypto.randomUUID(),
      name,
      moduleCount: 0,
      createdAt: new Date().toISOString(),
    };
    writeAll([...subjects, subject]);
    return subject;
  },

  remove: async (id) => {
    writeAll(readAll().filter((s) => s.id !== id));
  },
};

export default subjectsService;
