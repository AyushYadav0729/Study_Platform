from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from fastapi.middleware.cors import CORSMiddleware

from app.models import User, Subject
from app.database import engine, Base, get_db
from app.security import hash_password, verify_password
from app.jwt_handler import create_access_token
from app.schemas import (
    UserSignup,
    SignupResponse,
    UserResponse,
    Token,
    SubjectCreate,
    SubjectResponse
)
from app.auth import get_current_user


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


@app.get("/about")
def about():
    return {
        "project": "All In One Study Platform",
        "version": "1.0",
        "developer": "Team : Ayush , Dhruv , Mridul , Meghavani "                           
    }