import { useCallback, useEffect, useState } from "react";

import subjectsService from "../services/subjectsService";

export function useSubjects({ enabled = true } = {}) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(enabled);

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
    if (!enabled) {
      setLoading(false);
      return;
    }

    refreshSubjects();
  }, [enabled, refreshSubjects]);

  const addSubject = useCallback(async (name) => {
    const subject = await subjectsService.create(name);

    setSubjects((prev) => [...prev, subject]);

    return subject;
  }, []);

  const updateSubject = useCallback((id, patch) => {
    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === id ? { ...subject, ...patch } : subject
      )
    );
  }, []);

  const removeSubject = useCallback(async (id) => {
    await subjectsService.remove(id);

    setSubjects((prev) =>
      prev.filter((subject) => subject.id !== id)
    );
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