import json
from google import genai
from google.genai import types
from app.config import GEMINI_API_KEY
from pydantic import BaseModel

client = genai.Client(api_key=GEMINI_API_KEY)
m = "gemini-3.5-flash"

SYLLABUS_PARSING_PROMPT = """You convert a raw college syllabus into structured data.

Real syllabi come in inconsistent formats. You must handle at least these two patterns:

PATTERN A - narrative module blocks:
Modules are marked like "Module: 1 <Title> <N hours>" followed by a paragraph of
comma/period-separated topics. Split the paragraph into individual subtopics at
natural topic boundaries (roughly one subtopic per clause or sentence). If the
paragraph ends with real-world application examples, include them as a final
subtopic, don't drop them, but don't let them dominate the split.
IGNORE entirely: "Text Book(s)", "Reference Book(s)", "Mode of evaluation", and any
"Embedded Lab / Indicative Experiments" section - these are not modules.

PATTERN B - flattened table export:
A "Module Detail" style column gives a combined "<number> - <Title> - CO: <n>" value,
but that value only appears ONCE, on the first row of that module. Every row after it
(until the next "Module Detail" value appears) is a subtopic belonging to that same
module. Do not treat each topic row as its own module. Ignore the "CO: <n>" / number
prefix when building the title - just use the descriptive text.

If a line is genuinely ambiguous, skip it and note it in the final meta line's
unparsed_lines instead of guessing.

Output NEWLINE-DELIMITED JSON. One complete JSON object per line, nothing else on
that line, no markdown fences. Emit one line per module, as soon as that module is
fully determined - don't wait until the whole syllabus is processed to emit the first
module. Each module line looks like:
{"type": "module", "data": {"title": str, "subtopics": [{"title": str}]}}

After all modules, emit exactly one final line:
{"type": "meta", "data": {"parse_confidence": "high"|"medium"|"low", "unparsed_lines": [str]}}

--- EXAMPLE (Pattern A input) ---
Module: 1 Probability and Random Variables 11 hours
Basic Probability- Axioms, probability spaces, conditional probability, Bayes' theorem.
Random Variables and Distributions - Discrete and Continuous random variables. Spam
filtering, password strength estimation, disease prediction.

--- EXAMPLE (Pattern A output, each line emitted as soon as it's ready) ---
{"type": "module", "data": {"title": "Probability and Random Variables", "subtopics": [{"title": "Basic Probability - Axioms, probability spaces"}, {"title": "Conditional probability, Bayes' theorem"}, {"title": "Random Variables and Distributions - Discrete and Continuous random variables"}, {"title": "Applications: spam filtering, password strength estimation, disease prediction"}]}}
{"type": "meta", "data": {"parse_confidence": "medium", "unparsed_lines": []}}

--- EXAMPLE (Pattern B input) ---
1 - Probability and Random Variables - CO: 1 | 1 - Basic Probability- Axioms, probability spaces
(blank) | 2 - conditional probability, Bayes' theorem
(blank) | 3 - Random Variables and Distributions - Discrete and Continuous random variables

--- EXAMPLE (Pattern B output) ---
{"type": "module", "data": {"title": "Probability and Random Variables", "subtopics": [{"title": "Basic Probability - Axioms, probability spaces"}, {"title": "Conditional probability, Bayes' theorem"}, {"title": "Random Variables and Distributions - Discrete and Continuous random variables"}]}}
{"type": "meta", "data": {"parse_confidence": "high", "unparsed_lines": []}}
"""

def stream_parse_syllabus(raw_text: str):
    response_stream = client.models.generate_content_stream(
        model=m,
        contents=raw_text,
        config=types.GenerateContentConfig(
            system_instruction=SYLLABUS_PARSING_PROMPT,
            temperature=0.1,
        ),
    )
    for chunk in response_stream:
        if chunk.text:
            yield chunk.text

NOTE_CLASSIFICATION_PROMPT = """You are matching a student's uploaded notes document to the
single best-fitting module from their course syllabus.

You will be given: the parsed syllabus structure (modules with subtopics), a numbered
list of the student's actual existing units to choose from, and the extracted text of
the notes document.

Pick exactly ONE unit that best matches the content, even if the match isn't perfect -
always pick the closest one, never refuse to pick.

Return ONLY valid JSON, no markdown fences, matching exactly:
{"unit_index": <integer, 0-based index into the numbered unit list>}
"""

def classify_note_to_unit(note_text: str, syllabus_json: dict, unit_names: list[str]) -> int:
    numbered_units = "\n".join(f"{i}: {name}" for i, name in enumerate(unit_names))
    prompt = f"""SYLLABUS STRUCTURE:
{json.dumps(syllabus_json)}

EXISTING UNITS (choose by index):
{numbered_units}

NOTES DOCUMENT TEXT (may be truncated):
{note_text[:8000]}
"""
    response = client.models.generate_content(
        model=m,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=NOTE_CLASSIFICATION_PROMPT,
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )
    result = json.loads(response.text)
    return result["unit_index"]

SUMMARY_PROMPT = """
You are an AI study assistant for college students.

You will receive study material belonging to ONE unit of a course.

Generate a concise, exam-oriented summary of the material.

Requirements:
- Cover the important concepts from the provided material.
- Organize the answer using clear headings and subheadings.
- Use bullet points wherever appropriate.
- Keep explanations short and easy to revise.
- Include important definitions, concepts, formulas, steps, and distinctions when present.
- Do not invent information that is not present in the material.
- Do not repeat the same point unnecessarily.
- Focus on information useful for understanding and exam revision.
- Do not write a conclusion or introduction unless it is useful.
- Return clean Markdown only.
"""


def generate_unit_summary(unit_text: str) -> str:
    response = client.models.generate_content(
        model=m,
        contents=unit_text,
        config=types.GenerateContentConfig(
            system_instruction=SUMMARY_PROMPT,
            temperature=0.2,
        ),
    )

    return response.text

NOTES_PROMPT = """
You are an AI study assistant for college students.

You will receive study material belonging to ONE unit of a course.

Generate clear study notes that help the student UNDERSTAND the material.

Requirements:
- These notes are more explanatory than a summary: explain each concept in 2-4 short sentences, not just keywords.
- Organize the notes with clear headings and subheadings that follow the logical flow of the material.
- Explain what each concept is, how it works, and why it matters, when the material supports it.
- Include examples, formulas, and steps that appear in the material.
- Use bullet points for lists and short paragraphs for explanations.
- Keep the notes concise. Do not copy the material word for word.
- Do not invent information that is not present in the material.
- Do not repeat the same point unnecessarily.
- Return clean Markdown only.
"""


def generate_unit_notes(unit_text: str) -> str:
    response = client.models.generate_content(
        model=m,
        contents=unit_text,
        config=types.GenerateContentConfig(
            system_instruction=NOTES_PROMPT,
            temperature=0.3,
        ),
    )

    return response.text

class FlashcardItem(BaseModel):
    topic: str
    question: str
    answer: str


FLASHCARDS_PROMPT = """
You are an AI study assistant for college students.

You will receive study material belonging to ONE unit of a course.

Generate flashcards for active recall covering ONLY the important concepts
of the material (key definitions, differences between concepts, formulas,
important steps/processes, and core principles).

Requirements:
- Generate between 15 and 25 flashcards, depending on how much important content the material has.
- "topic": a short label (1-4 words) taken from the heading or subject the card belongs to.
- "question": ONE specific, self-contained question. Avoid vague questions like "Explain X".
- "answer": a short, direct answer (1-3 sentences, or a few short lines for steps/lists). Never a full paragraph.
- Do not make cards for minor details, examples, or trivia.
- Do not create duplicate or near-duplicate cards.
- Do not invent information that is not present in the material.
- Order the cards in the same order the topics appear in the material.
"""


def generate_unit_flashcards(unit_text: str) -> list[dict]:
    response = client.models.generate_content(
        model=m,
        contents=unit_text,
        config=types.GenerateContentConfig(
            system_instruction=FLASHCARDS_PROMPT,
            temperature=0.3,
            response_mime_type="application/json",
            response_schema=list[FlashcardItem],
        ),
    )

    cards = json.loads(response.text)

    # Keep only well-formed cards
    return [
        {
            "topic": c["topic"].strip(),
            "question": c["question"].strip(),
            "answer": c["answer"].strip(),
        }
        for c in cards
        if c.get("question", "").strip() and c.get("answer", "").strip()
    ]