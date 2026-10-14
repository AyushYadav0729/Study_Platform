// Small shared state for the landing page. The page writes it every frame; HUD
// pieces read it inside their own frame callbacks (no React re-renders).
export const v2 = {
  deck: null, // CardDeck instance once ready
  fa: 0, // formation we're leaving
  fb: 1, // formation we're heading to
  t: 0, // 0..1 between them
  progress: 0, // whole-page scroll 0..1
  anchors: [], // scrollY for each formation anchor
  heroZones: null, // where the hero copy sits, so cards keep clear of it
};

export const weightOf = (f) => (v2.fa === f ? 1 - v2.t : 0) + (v2.fb === f ? v2.t : 0);

export const SECTIONS = [
  { id: "v2-top", label: "Intro" },
  { id: "v2-syllabus", label: "Syllabus" },
  { id: "v2-sorting", label: "Sorting" },
  { id: "v2-summaries", label: "Summaries" },
  { id: "v2-flashcards", label: "Flashcards" },
  { id: "v2-start", label: "Start" },
];
