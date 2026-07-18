from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from sqlalchemy.orm import declarative_base 

from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base() # Acts as a parent class for every database task 

def get_db():
    db = SessionLocal()
    try:
        yield db  # this pauses the fn until the work at the session is coomplete
                  # once the task is completed it closes the db
                  # If we used return db then at each endpoint we'll have to write close stt. 
    finally:
        db.close()