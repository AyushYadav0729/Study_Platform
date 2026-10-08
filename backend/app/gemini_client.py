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

SUMMARY_PROMPT = r"""
You are an AI study assistant for college students.

You will receive study material belonging to ONE unit of a course.

Generate a very short, exam-oriented revision summary. The student should be able to scan the whole unit in a few minutes.

Content rules:
- Cover every important topic, but each point must be ONE short line (a phrase or a single short sentence).
- Do NOT include examples, worked calculations, case studies, or background explanations.
- List the important definitions, key terms, rules, types/classifications, steps, and distinctions as brief points.
- Include every important formula, but only the formula itself with one short line saying what it is. Do not derive it or work through numbers.
- Do not invent information that is not present in the material.
- Do not repeat the same point.
- No introduction and no conclusion.

Structure rules:
- Use clear headings (##) for major topics and bullet points beneath them.
- Use a table only when comparing items side by side.
- Put each key definition or exam-critical rule on its own line as a Markdown blockquote starting with "> ", with the key term in bold. Use these sparingly (at most 5 in total).

Formula rules:
- Write all mathematical expressions in LaTeX.
- Put every formula on its own line wrapped in $$...$$, with a blank line before and after it. Write fractions with \dfrac.
- Use $...$ only for short inline symbols such as $X_1$.

Return clean Markdown only.
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

NOTES_PROMPT = r"""
You are an AI study assistant for college students.

You will receive study material belonging to ONE unit of a course.

Generate complete, detailed study notes that let the student fully understand the unit WITHOUT reading the original material. Do not miss any detail.

Content rules:
- Cover EVERY topic, subtopic, definition, concept, type, step, rule, and formula that appears in the material, in the same order as the material.
- Explain each point properly: what it is, how it works, why it matters, and how it differs from related concepts, when the material supports it.
- Include all examples, worked calculations, and case studies from the material, with the steps shown clearly.
- Keep every number, name, condition, and exception that the material mentions.
- Do not invent information that is not in the material. If something is unclear in the material, keep it as written and do not guess.
- Do not copy the material word for word. Rewrite it in clear, simple language.
- Do not repeat the same point, and do not add filler, an introduction, or a conclusion.

Structure rules:
- At the end of every worked example, put its final result on its own line as a Markdown blockquote that starts exactly with "> **Final Answer:** " followed by the result (use $...$ for any math inside it). Use this label only for final results of examples, never for definitions or rules.
- Use headings (##) for major topics and subheadings (###) for subtopics.
- Use short paragraphs for explanations and bullet points for lists, types, and steps.
- Use a table when comparing items side by side.
- Put each key definition or exam-critical rule on its own line as a Markdown blockquote starting with "> ", with the key term in bold. Use these sparingly (at most 8 in total).

Formula rules:
- Write all mathematical expressions in LaTeX.
- Put every formula and every step of a worked calculation on its own line wrapped in $$...$$, with a blank line before and after it. Write fractions with \dfrac.
- Use $...$ only for short inline symbols such as $X_1$.
- After each formula, add a short line explaining what each symbol means.

Return clean Markdown only.
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