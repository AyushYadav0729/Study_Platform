#this is a pydantic validation script which checks if the input from forntend signup is correct or not 
from uuid import UUID
from pydantic import BaseModel, EmailStr

class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr

    model_config = {
        "from_attributes": True
    }

class SignupResponse(BaseModel):
    message: str
    id: UUID
    name: str
    email: EmailStr

    model_config = {
        "from_attributes": True
    }
class SubjectCreate(BaseModel):
    name: str


class SubjectResponse(BaseModel):
    id: UUID
    name: str

    model_config = {
        "from_attributes": True
    }

class UnitCreate(BaseModel):
    name: str


class UnitResponse(BaseModel):
    id: UUID
    name: str
    subject_id: UUID

    model_config = {
        "from_attributes": True
    }