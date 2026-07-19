#this is a pydantic validation script which checks if the input from forntend signup is correct or not 

from pydantic import BaseModel, EmailStr

class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

class SignupResponse(BaseModel):
    message: str
    id: int
    name: str
    email: EmailStr
