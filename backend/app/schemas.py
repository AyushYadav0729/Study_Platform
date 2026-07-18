#this is a validation script which checks if the input from forntend signup is correct or not 

from pydantic import BaseModel

class UserSignup(BaseModel):
    name: str
    email: str
    password: str
    