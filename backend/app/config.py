# this acts as an intermediary btw the database and .env file
# .env file contains all the secrets 

from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")