from fastapi import Depends, FastAPI, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from fastapi.middleware.cors import CORSMiddleware

from app.supabase_client import supabase
from app.models import User, Subject, Unit, Note
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
    NoteResponse
)
from app.auth import get_current_user
from uuid import UUID

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

    db.delete(unit)
    db.commit()

@app.post(
    "/units/{unit_id}/notes",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED
)
def upload_note(
    unit_id: UUID,
    file: UploadFile = File(...),
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

    # 2. Build the storage path
    file_path = (
        f"users/{current_user.id}/"
        f"subjects/{unit.subject_id}/"
        f"units/{unit.id}/"
        f"{file.filename}"
    )

    # 3. Read the uploaded file
    file_data = file.file.read()

    # 4. Upload to Supabase Storage
    try:
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            file_path,
            file_data,
            {
                "content-type": file.content_type
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )

    # 5. Create Note database record
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

    db.delete(note)
    db.commit()



@app.get("/about")
def about():
    return {
        "project": "All In One Study Platform",
        "version": "1.0",
        "developer": "Team : Ayush , Dhruv , Mridul , Meghavani "                           
    }