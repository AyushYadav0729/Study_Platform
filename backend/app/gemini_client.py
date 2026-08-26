import json
from google import genai
from google.genai import types
from app.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """You convert a raw college syllabus into structured data.

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
        model="gemini-3.6-flash",
        contents=raw_text,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.1,
        ),
    )
    for chunk in response_stream:
        if chunk.text:
            yield chunk.text