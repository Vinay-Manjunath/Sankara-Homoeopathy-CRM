import enum
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, JSON, Enum, Text
from sqlalchemy.orm import relationship
from database import Base

class AppointmentType(str, enum.Enum):
    NEW_PATIENT = "new patient"
    FOLLOW_UP = "follow up"

class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    appointments = relationship("Appointment", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"
    # Sequential ID: ongaa01 -> ongaa99, ongab01 -> ongab99 ...
    patient_id = Column(String(20), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    end_date = Column(Date, nullable=True)
    treatment = Column(String(255), nullable=True)
    contact = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)

    cases = relationship("ConsultationCase", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")

class Medicine(Base):
    __tablename__ = "medicines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(20), ForeignKey("patients.patient_id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    app_type = Column(Enum(AppointmentType), default=AppointmentType.NEW_PATIENT, nullable=False)
    app_datetime = Column(DateTime, nullable=False)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")

class ConsultationCase(Base):
    __tablename__ = "consultation_cases"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(20), ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_name = Column(String(255), nullable=False)
    consultation_date = Column(Date, nullable=False)

    # Core Summary & Prescriptions
    clinical_observations = Column(Text, nullable=True)
    followup_date = Column(Date, nullable=True)
    patient_status = Column(String(100), nullable=True)
    medicines = Column(JSON, default=list) # [{medicine, potency, medicine_days, suggested_duration, progress}]
    
    # Universal Comprehensive Clinical Data (Sections 2, 3, 4)
    entered_data = Column(JSON, default=dict)
    
    # Uploaded media from Google Drive
    attachments = Column(JSON, default=list) # [{name, url, file_id}]

    patient = relationship("Patient", back_populates="cases")