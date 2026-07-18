from pydantic import BaseModel

class UserSignup(BaseModel):
    name: str
    email: str
    password: str