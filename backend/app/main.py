from fastapi import FastAPI
from .schemas import UserSignup

from app.models import User

from app.database import engine, Base
from app import models

from fastapi import Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import hash_password

app = FastAPI()
Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Backend is Running"}

@app.post("/signup")
def signup(user: UserSignup,db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        return {
            "message": "Email already registered."
        }
    
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

@app.get("/about")
def about():
    return {
        "project": "All In One Study Platform",
        "version": "1.0",
        "developer": "Team : Ayush , Dhruv , Mridul , Meghavani "
                                
    }