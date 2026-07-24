import { useCallback, useEffect, useState } from "react";
import subjectsService from "../services/subjectsService";

export function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    subjectsService.list().then((data) => {
      if (active) {
        setSubjects(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const addSubject = useCallback(async (name) => {
    const subject = await subjectsService.create(name);
    setSubjects((prev) => [...prev, subject]);
    return subject;
  }, []);

  const removeSubject = useCallback(async (id) => {
    await subjectsService.remove(id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { subjects, loading, addSubject, removeSubject };
}

export default useSubjects;
