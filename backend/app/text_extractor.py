import pdfplumber
from io import BytesIO

def extract_text(file_bytes: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    else:
        return file_bytes.decode("utf-8", errors="ignore")