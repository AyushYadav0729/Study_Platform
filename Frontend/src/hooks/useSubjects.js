import { useCallback, useEffect, useState } from "react";

import subjectsService from "../services/subjectsService";

export function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshSubjects = useCallback(async () => {
    try {
      setLoading(true);

      const data = await subjectsService.list();

      setSubjects(data);
    } catch (error) {
      console.error("Failed to load subjects:", error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSubjects();
  }, [refreshSubjects]);

  const addSubject = useCallback(async (name) => {
    const subject = await subjectsService.create(name);
    setSubjects((prev) => [...prev, subject]);
    return subject;
  }, []);

  const updateSubject = useCallback((id, patch) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }, []);

  const removeSubject = useCallback(async (id) => {
    await subjectsService.remove(id);

    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSubjects = useCallback(() => {
    setSubjects([]);
  }, []);

  return {
    subjects,
    loading,
    addSubject,
    updateSubject,
    removeSubject,
    refreshSubjects,
    clearSubjects,
  };
}

export default useSubjects;