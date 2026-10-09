from fastapi import Depends, FastAPI, HTTPException, status, File, UploadFile, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from fastapi.middleware.cors import CORSMiddleware

from app.config import SUPABASE_BUCKET, FIGURES_ENABLED
from app.figure_pipeline import collect_unit_text_with_figures, resolve_figure_markers, clear_figures_folder, figures_folder
from app.supabase_client import supabase
from app.models import User, Subject, Unit, Note, UnitContent
from app.config import SUPABASE_BUCKET
from app.database import engine, Base, get_db
from app.security import hash_password, verify_password
from app.jwt_handler import create_access_token
from app.schemas import (
    UserSignup,
    SignupResponse,
    UserResponse,
    Token,
    SubjectCreate,
    SubjectResponse,
    UnitCreate,
    UnitResponse,
    NoteResponse,
    SyllabusResponse
)
from app.auth import get_current_user
from app.text_extractor import extract_text
from app.gemini_client import (
    stream_parse_syllabus,
    classify_note_to_unit,
    generate_unit_summary,
    generate_unit_notes,
    generate_unit_flashcards,
)
from uuid import UUID
import json
import hashlib
from datetime import datetime


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)



@app.get("/")
def root():
    return {"message": "Backend is Running"}

@app.post("/signup" , response_model=SignupResponse,status_code=status.HTTP_201_CREATED)
def signup(user: UserSignup,db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    hashed_password = hash_password(user.password)
    new_user = User(
        name=user.name,
        email=user.email,
        password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User created successfully!",
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email
    }

credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid email or password"
)

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    
    existing_user = db.query(User).filter(User.email == form_data.username).first()

    if not existing_user:
        raise credentials_exception
    
    if not verify_password(form_data.password, existing_user.password):
        raise credentials_exception

    token = create_access_token(existing_user.id)
    return {
        "access_token": token,
        "token_type": "bearer"
    }

@app.get("/profile", response_model=UserResponse)
def profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    }

@app.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_subject = Subject(
        name=subject.name,
        user_id=current_user.id
    )

    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)

    return new_subject

@app.get("/subjects", response_model=list[SubjectResponse])
def get_subjects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subjects = db.query(Subject).filter(
        Subject.user_id == current_user.id
    ).all()

    return subjects

def remove_unit_storage(unit: Unit, user_id, db: Session):
    """
    Removes every uploaded file and extracted figure of a unit from Supabase Storage.
    Best-effort: a Storage hiccup is logged and never blocks the delete.
    """
    notes = db.query(Note).filter(Note.unit_id == unit.id).all()

    for n in notes:
        clear_figures_folder(figures_folder(user_id, unit, n))

    paths = [n.file_path for n in notes]
    if paths:
        try:
            supabase.storage.from_(SUPABASE_BUCKET).remove(paths)
        except Exception as e:
            print(f"[storage] could not remove files of unit {unit.id}: {e}")

@app.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == current_user.id
    ).first()

    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    for u in db.query(Unit).filter(Unit.subject_id == subject.id).all():
        remove_unit_storage(u, current_user.id, db)

    db.delete(subject)
    db.commit()

@app.post("/subjects/{subject_id}/units", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
def create_unit(subject_id: UUID, unit: UnitCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == current_user.id
    ).first()

    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    new_unit = Unit(
        name=unit.name,
        subject_id=subject.id
    )

    db.add(new_unit)
    db.commit()
    db.refresh(new_unit)

    return new_unit

@app.get(
    "/subjects/{subject_id}/units",
    response_model=list[UnitResponse]
)
def get_units(
    subject_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == current_user.id
    ).first()

    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    units = db.query(Unit).filter(
        Unit.subject_id == subject.id
    ).all()

    return units

@app.delete(
    "/units/{unit_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_unit(
    unit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    unit = db.query(Unit).join(Subject).filter(
        Unit.id == unit_id,
        Subject.user_id == current_user.id
    ).first()

    if unit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found"
        )
    remove_unit_storage(unit, current_user.id, db)
    db.delete(unit)
    db.commit()

@app.post(
    "/units/{unit_id}/notes",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED
)
def upload_note(
    unit_id: str,
    subject_id: str = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_data = file.file.read()

    if unit_id == "ai_recommend":
        if subject_id is None:
            raise HTTPException(status_code=400, detail="subject_id is required for AI recommendation")

        subject = db.query(Subject).filter(
            Subject.id == subject_id, Subject.user_id == current_user.id
        ).first()
        if subject is None:
            raise HTTPException(status_code=404, detail="Subject not found")
        if not subject.syllabus_json:
            raise HTTPException(status_code=400, detail="No syllabus parsed for this subject yet")

        units = db.query(Unit).filter(Unit.subject_id == subject.id).all()
        if not units:
            raise HTTPException(status_code=400, detail="No units exist for this subject yet")

        note_text = extract_text(file_data, file.content_type)
        unit_names = [u.name for u in units]

        try:
            index = classify_note_to_unit(note_text, subject.syllabus_json, unit_names)
            unit = units[index]
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI classification failed: {str(e)}")

    else:
        unit = db.query(Unit).join(Subject).filter(
            Unit.id == unit_id,
            Subject.user_id == current_user.id
        ).first()
        if unit is None:
            raise HTTPException(status_code=404, detail="Unit not found")

    file_path = (
        f"users/{current_user.id}/"
        f"subjects/{unit.subject_id}/"
        f"units/{unit.id}/"
        f"{file.filename}"
    )

    try:
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            file_path, file_data, {"content-type": file.content_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    new_note = Note(
        unit_id=unit.id,
        file_name=file.filename,
        file_path=file_path,
        file_type=file.content_type
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return new_note

@app.get(
    "/units/{unit_id}/notes",
    response_model=list[NoteResponse]
)
def get_notes(
    unit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Verify that the unit belongs to the logged-in user
    unit = db.query(Unit).join(Subject).filter(
        Unit.id == unit_id,
        Subject.user_id == current_user.id
    ).first()

    if unit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found"
        )

    # 2. Get all notes belonging to this unit
    notes = db.query(Note).filter(
        Note.unit_id == unit_id
    ).all()

    return notes

@app.delete(
    "/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_note(
    note_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    note = db.query(Note).join(Unit).join(Subject).filter(
        Note.id == note_id,
        Subject.user_id == current_user.id
    ).first()

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    try:
        supabase.storage.from_(SUPABASE_BUCKET).remove(
            [note.file_path]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File deletion failed: {str(e)}"
        )
    # Also remove this file's extracted figures (best-effort, never blocks the delete)
    clear_figures_folder(figures_folder(current_user.id, note.unit, note))
    db.delete(note)
    db.commit()

@app.get("/notes/{note_id}/preview")
def preview_note(
    note_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify that the note belongs to the current user
    note = db.query(Note).join(Unit).join(Subject).filter(
        Note.id == note_id,
        Subject.user_id == current_user.id
    ).first()

    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    try:
        # Create a temporary signed URL
        response = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(
            note.file_path,
            3600
        )

        return {
            "url": response["signedURL"],
            "file_name": note.file_name,
            "file_type": note.file_type
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not generate preview URL: {str(e)}"
        )

SUPPORTED_TEXT_TYPES = {"application/pdf", "text/plain"}


def collect_unit_text(unit: Unit, db: Session):
    """
    Downloads all files of a unit from Supabase, extracts their text,
    and returns (combined_text, files_used, files_skipped).
    Raises HTTPException if there is nothing usable.
    """
    notes = db.query(Note).filter(Note.unit_id == unit.id).all()

    if not notes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No materials uploaded for this unit yet"
        )

    parts = []
    files_used = []
    files_skipped = []

    for note in notes:
        # extract_text only handles PDF/plain text properly for now
        if note.file_type not in SUPPORTED_TEXT_TYPES:
            files_skipped.append(note.file_name)
            continue

        try:
            file_bytes = supabase.storage.from_(SUPABASE_BUCKET).download(note.file_path)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not download {note.file_name}: {str(e)}"
            )

        text = extract_text(file_bytes, note.file_type).strip()

        # e.g. scanned PDFs have no extractable text
        if not text:
            files_skipped.append(note.file_name)
            continue

        parts.append(f"=== {note.file_name} ===\n{text}")
        files_used.append(note.file_name)

    if not parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable text found in this unit's files"
        )

    return "\n\n".join(parts), files_used, files_skipped

def get_or_generate(unit: Unit, content_type: str, generator, db: Session, regenerate: bool = False, collect=None):
    """
    Returns (content, files_used, files_skipped, cached).
    Uses the stored result if it exists and the unit's files haven't changed;
    otherwise generates with Gemini, stores it, and returns it.
    """
    # Fingerprint = the current set of note IDs in this unit.
    # Uploading or deleting a file changes it, which invalidates the stored result.
    note_ids = sorted(str(r[0]) for r in db.query(Note.id).filter(Note.unit_id == unit.id).all())
    source_hash = hashlib.sha256("|".join(note_ids).encode()).hexdigest()

    row = db.query(UnitContent).filter(
        UnitContent.unit_id == unit.id,
        UnitContent.content_type == content_type
    ).first()

    if row and not regenerate and row.source_hash == source_hash:
        meta = row.meta or {}
        return row.content, meta.get("files_used", []), meta.get("files_skipped", []), True

    collector = collect or collect_unit_text
    combined_text, files_used, files_skipped = collector(unit, db)

    try:
        content = generator(combined_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI {content_type} generation failed: {str(e)}"
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI returned empty {content_type}"
        )

    meta = {"files_used": files_used, "files_skipped": files_skipped}

    if row is None:
        row = UnitContent(
            unit_id=unit.id,
            content_type=content_type,
            content=content,
            meta=meta,
            source_hash=source_hash,
        )
        db.add(row)
    else:
        row.content = content
        row.meta = meta
        row.source_hash = source_hash
        row.updated_at = datetime.utcnow()

    db.commit()
    return content, files_used, files_skipped, False

def get_owned_unit(unit_id: UUID, current_user: User, db: Session) -> Unit:
    unit = db.query(Unit).join(Subject).filter(
        Unit.id == unit_id,
        Subject.user_id == current_user.id
    ).first()

    if unit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found"
        )
    return unit


@app.get("/units/{unit_id}/summary")
def get_unit_summary(
    unit_id: UUID,
    regenerate: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    unit = get_owned_unit(unit_id, current_user, db)
    content, used, skipped, cached = get_or_generate(
        unit, "summary", generate_unit_summary, db, regenerate
    )
    return {
        "unit_id": unit.id,
        "unit_name": unit.name,
        "summary": content,
        "files_used": used,
        "files_skipped": skipped,
        "cached": cached
    }


@app.get("/units/{unit_id}/ai-notes")
def get_unit_ai_notes(
    unit_id: UUID,
    regenerate: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    unit = get_owned_unit(unit_id, current_user, db)
    collect = None
    if FIGURES_ENABLED:
        collect = lambda u, d: collect_unit_text_with_figures(u, current_user.id, d)

    content, used, skipped, cached = get_or_generate(
        unit, "notes", generate_unit_notes, db, regenerate, collect=collect
    )
    content = resolve_figure_markers(content, unit, current_user.id, db)
    return {
        "unit_id": unit.id,
        "unit_name": unit.name,
        "notes": content,
        "files_used": used,
        "files_skipped": skipped,
        "cached": cached
    }


@app.get("/units/{unit_id}/flashcards")
def get_unit_flashcards(
    unit_id: UUID,
    regenerate: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    unit = get_owned_unit(unit_id, current_user, db)
    content, used, skipped, cached = get_or_generate(
        unit, "flashcards", generate_unit_flashcards, db, regenerate
    )
    return {
        "unit_id": unit.id,
        "unit_name": unit.name,
        "flashcards": content,
        "files_used": used,
        "files_skipped": skipped,
        "cached": cached
    }

@app.post("/subjects/{subject_id}/syllabus/stream")
def upload_syllabus_stream(
    subject_id: UUID,
    text: str = Form(None),
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(
        Subject.id == subject_id, Subject.user_id == current_user.id
    ).first()
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")

    if file is not None:
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        raw_text = extract_text(file.file.read(), file.content_type)
    elif text is not None:
        raw_text = text
    else:
        raise HTTPException(status_code=400, detail="Provide either text or file")

    def event_stream():
        all_modules = []
        unparsed_lines = []
        confidence = "medium"
        buffer = ""
        try:
            for chunk in stream_parse_syllabus(raw_text):
                buffer += chunk
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    if obj.get("type") == "module":
                        module = obj["data"]
                        all_modules.append(module)

                        unit = Unit(name=module["title"], subject_id=subject.id)
                        db.add(unit)
                        db.commit()
                        db.refresh(unit)

                        yield f"data: {json.dumps({'type': 'module', 'unit_id': str(unit.id), 'module': module})}\n\n"

                    elif obj.get("type") == "meta":
                        confidence = obj["data"].get("parse_confidence", confidence)
                        unparsed_lines = obj["data"].get("unparsed_lines", [])

        except Exception as e:
            subject.syllabus_status = "failed"
            db.commit()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        subject.syllabus_json = {
            "modules": all_modules,
            "parse_confidence": confidence,
            "unparsed_lines": unparsed_lines,
        }
        subject.syllabus_status = "parsed"
        db.commit()

        yield f"data: {json.dumps({'type': 'done', 'parse_confidence': confidence, 'unparsed_lines': unparsed_lines})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/subjects/{subject_id}/syllabus", response_model=SyllabusResponse)
def get_syllabus(
    subject_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.user_id == current_user.id
    ).first()
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")

    return {
        "subject_id": subject.id,
        "syllabus_status": subject.syllabus_status,
        "parsed_json": subject.syllabus_json
    }





@app.get("/about")
def about():
    return {
        "project": "All In One Study Platform",
        "version": "1.0",
        "developer": "Team : Ayush , Dhruv , Mridul , Meghavani "                           
    }
