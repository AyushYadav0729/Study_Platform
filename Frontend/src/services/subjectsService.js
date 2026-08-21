import api from "./authService";

export const subjectsService = {
  list: async () => {
    const response = await api.get("/subjects");
    return response.data;
  },

  create: async (name) => {
    const response = await api.post("/subjects", {
      name: name,
    });

    return response.data;
  },

  remove: async (id) => {
    await api.delete(`/subjects/${id}`);
  },
};

export default subjectsService;