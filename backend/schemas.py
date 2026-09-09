from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from models import AppointmentType

class PatientCreate(BaseModel):
    name: str
    age: int
    contact: str
    end_date: Optional[date] = None
    treatment: Optional[str] = None
    email: Optional[str] = None

class PatientOut(PatientCreate):
    patient_id: str
    class Config:
        from_attributes = True

class MedicineOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: int
    app_type: AppointmentType
    app_datetime: datetime

class AppointmentOut(BaseModel):
    id: int
    patient_id: str
    patient_name: str
    patient_age: int
    patient_contact: str
    app_type: AppointmentType
    app_datetime: datetime
    assigned_doctor: str
    doctor_id: int
    class Config:
        from_attributes = True

class CaseSummaryOut(BaseModel):
    id: int
    consultation_date: date
    doctor_name: str
    clinical_observations: Optional[str] = None
    followup_date: Optional[date] = None
    patient_status: Optional[str] = None
    medicines: List[Dict[str, Any]] = []
    class Config:
        from_attributes = True

# --- Update Schemas ---

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    contact: Optional[str] = None
    end_date: Optional[date] = None
    treatment: Optional[str] = None
    email: Optional[str] = None

class AppointmentUpdate(BaseModel):
    patient_id: Optional[str] = None
    doctor_id: Optional[int] = None
    app_type: Optional[AppointmentType] = None
    app_datetime: Optional[datetime] = None

class MedicineUpdate(BaseModel):
    name: str

class CaseUpdate(BaseModel):
    doctor_name: Optional[str] = None
    consultation_date: Optional[date] = None
    clinical_observations: Optional[str] = None
    followup_date: Optional[date] = None
    patient_status: Optional[str] = None
    medicines: Optional[List[Dict[str, Any]]] = None
    entered_data: Optional[Dict[str, Any]]= None

class MedicineCreate(BaseModel):
    name: str

class MedicineCreate(BaseModel):
    name: str