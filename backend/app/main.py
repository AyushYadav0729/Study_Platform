from fastapi import FastAPI , HTTPException, status , Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.models import User
from app.database import engine, Base, get_db
from app.security import hash_password, verify_password
from app.jwt_handler import create_access_token
from app.schemas import UserSignup , SignupResponse , UserResponse, Token
from app.auth import get_current_user

app = FastAPI()

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

@app.get("/about")
def about():
    return {
        "project": "All In One Study Platform",
        "version": "1.0",
        "developer": "Team : Ayush , Dhruv , Mridul , Meghavani "                           
    }