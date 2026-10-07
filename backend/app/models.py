# this defines how we will write the data in signup database 
from sqlalchemy import Column, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime


from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)

    subjects = relationship(
        "Subject",
        back_populates="owner",
        cascade="all, delete-orphan"
    )


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

    syllabus_json = Column(JSONB, nullable=True)

    syllabus_status = Column(String, default="not_uploaded")

    owner = relationship("User", back_populates="subjects")

    units = relationship(
        "Unit",
        back_populates="subject",
        cascade="all, delete-orphan"
    )


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

    subject = relationship(
        "Subject",
        back_populates="units"
    )

    notes = relationship(
        "Note",
        back_populates="unit",
        cascade="all, delete-orphan"
    )

    contents = relationship(
        "UnitContent",
        back_populates="unit",
        cascade="all, delete-orphan"
    )


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

    unit = relationship(
        "Unit",
        back_populates="notes"
    )

class UnitContent(Base):
    __tablename__ = "unit_contents"
    __table_args__ = (
        UniqueConstraint("unit_id", "content_type", name="uq_unit_content_type"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    unit_id = Column(
        UUID(as_uuid=True),
        ForeignKey("units.id", ondelete="CASCADE"),
        nullable=False
    )

    # "summary" | "notes" | "flashcards"
    content_type = Column(String, nullable=False)

    # Markdown string for summary/notes, list of cards for flashcards
    content = Column(JSONB, nullable=False)

    # {"files_used": [...], "files_skipped": [...]}
    meta = Column(JSONB, nullable=True)

    # Fingerprint of the unit's files when this was generated
    source_hash = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    unit = relationship("Unit", back_populates="contents")