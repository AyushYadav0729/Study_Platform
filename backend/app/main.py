from fastapi import FastAPI
from .schemas import UserSignup

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Backend is Running"}

@app.post("/signup")
def signup(user: UserSignup):
    return {
        "message": "Signup data received successfully!",
        "name": user.name,
        "email": user.email
    }

@app.get("/about")
def about():
    return {
        "project": "Study Platform",
        "version": "1.0",
        "developer": "Team"
    }