# this defines how we will write the data in signup database 
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)

    subjects = relationship("Subject", back_populates="owner")

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    name = Column(String, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    owner = relationship("User", back_populates="subjects")
    units = relationship("Unit", back_populates="subject")

class Unit(Base):
    __tablename__ = "units"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    subject_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False
    )

    name = Column(String, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    subject = relationship("Subject", back_populates="units")
    notes = relationship("Note", back_populates="unit")

class Note(Base):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    unit_id = Column(
        UUID(as_uuid=True),
        ForeignKey("units.id", ondelete="CASCADE"),
        nullable=False
    )

    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    unit = relationship("Unit", back_populates="notes")