import api from "./authService";

export const subjectsService = {
  list: async () => {
    const response = await api.get("/subjects");
    return response.data;
  },

  create: async (name) => {
    const response = await api.post("/subjects", { name });
    return response.data;
  },

  // Streams the syllabus parse live: calls onEvent for each SSE payload
  // ({type: "module"|"meta"|"done"|"error", ...}) as Gemini emits it,
  // instead of waiting for the whole parse to finish.
  streamSyllabus: async (subjectId, { text, file } = {}, onEvent) => {
    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    } else if (text) {
      formData.append("text", text);
    }

    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `${api.defaults.baseURL}/subjects/${subjectId}/syllabus/stream`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      }
    );

    if (!response.ok || !response.body) {
      throw new Error("Syllabus stream request failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex).trim();
        buffer = buffer.slice(sepIndex + 2);
        if (!rawEvent.startsWith("data:")) continue;
        try {
          onEvent(JSON.parse(rawEvent.slice(5).trim()));
        } catch {
          // malformed chunk, skip
        }
      }
    }
  },

  remove: async (id) => {
    await api.delete(`/subjects/${id}`);
  },

  createUnit: async (subjectId, name) => {
    const response = await api.post(`/subjects/${subjectId}/units`, {
      name: name,
    });
    return response.data;
  },

  removeUnit: async (subjectId, unitId) => {
    await api.delete(`/units/${unitId}`);
  },
};

export default subjectsService;