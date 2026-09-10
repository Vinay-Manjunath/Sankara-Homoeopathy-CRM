import json
import os
from datetime import date, datetime
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from database import engine, Base, get_db
from models import Patient, Doctor, Medicine, Appointment, ConsultationCase, AppointmentType
from schemas import (
    MedicineCreate, PatientCreate, PatientOut, MedicineOut,
    AppointmentCreate, AppointmentOut, CaseSummaryOut,
    PatientUpdate, AppointmentUpdate, MedicineUpdate, CaseUpdate
)
from drive_service import upload_file_to_drive
from pdf_generator import generate_prescription_pdf

# Auto create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sankara Homoeopathy CRM Backend", version="1.0.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://crm-sankarahomoeopathy.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# Reuse a single HTTP request object to cache Google's public signing keys
GOOGLE_AUTH_REQUEST = google_requests.Request()

# Hardcoded authorized clinic staff emails
ALLOWED_CLINIC_EMAILS = {
    "vinayksm86@gmail.com",
    "jeeveshparamathmuni22@gmail.com",
    "saidheerajparamathmuni@gmail.com",
    "sankarahomoeopathy@gmail.com",
    "padmashreeksm25@gmail.com",
}


class GoogleAuthPayload(BaseModel):
    credential: str


def verify_google_jwt(token: str) -> dict:
    """Cryptographically verifies Google token and enforces hardcoded clinic email whitelist."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500, detail="GOOGLE_CLIENT_ID not configured on server"
        )
    try:
        idinfo = id_token.verify_oauth2_token(
            token, GOOGLE_AUTH_REQUEST, GOOGLE_CLIENT_ID
        )

        user_email = idinfo.get("email", "").strip().lower()

        if user_email not in ALLOWED_CLINIC_EMAILS:
            print(f"[SECURITY REJECTED] Unauthorized email access: {user_email}")
            raise HTTPException(
                status_code=403,
                detail=f"Access Denied: {user_email} is not authorized for clinic access."
            )

        return {
            "email": user_email,
            "name": idinfo.get("name", "Doctor"),
            "picture": idinfo.get("picture", ""),
        }
    except ValueError as err:
        print(f"[AUTH ERROR] Token verification failed: {err}")
        raise HTTPException(
            status_code=401, detail=f"Google token verification failed: {str(err)}"
        )


def require_auth_user(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency to enforce valid authenticated user on protected routes."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header"
        )
    token = authorization.split(" ")[1]
    return verify_google_jwt(token)


@app.post("/api/auth/google")
def auth_google_login(payload: GoogleAuthPayload):
    """Initial sign-in verification called by React frontend."""
    user_info = verify_google_jwt(payload.credential)
    return {
        "status": "success",
        "token": payload.credential,
        "user": user_info,
    }


def get_next_patient_id(db: Session) -> str:
    """Computes alphanumeric sequence: ongaa01 -> ongaa99, ongab01 -> ongba01."""
    last = db.query(Patient).filter(Patient.patient_id.like("ONG%")).order_by(Patient.patient_id.desc()).first()
    if not last:
        return "ONGAA01"

    curr_id = last.patient_id[3:]
    if len(curr_id) != 4:
        return "ONGAA01"

    c1, c2 = curr_id[0], curr_id[1]
    num = int(curr_id[2:])

    if num < 99:
        num += 1
    else:
        num = 1
        if c2 < 'Z':
            c2 = chr(ord(c2) + 1)
        else:
            c2 = 'A'
            c1 = chr(ord(c1) + 1) if c1 < 'Z' else 'A'

    return f"ONG{c1}{c2}{num:02d}"


@app.on_event("startup")
def bootstrap_database():
    """Seeds doctors and homeopathic remedies if database is empty."""
    db = next(get_db())
    if not db.query(Doctor).first():
        db.add_all([
            Doctor(name="Dr. Jeevesh Paramathmuni"),
            Doctor(name="Dr. Padmashree M"),
            Doctor(name="Dr. Dheeraj Paramathmuni")
        ])
    if not db.query(Medicine).first():
        seeds = [
            "Arnica Montana", "Nux Vomica", "Belladonna", "Bryonia Alba",
            "Rhus Toxicodendron", "Lycopodium Clavatum", "Silicea",
            "Pulsatilla", "Arsenicum Album", "Phosphorus", "Calcarea Carbonica",
            "Sulphur", "Natrum Muriaticum", "Thuja Occidentalis", "Gelsemium"
        ]
        for name in seeds:
            db.add(Medicine(name=name))
    db.commit()


# --- Health Check ---
@app.get("/")
def health_check():
    return {"status": "healthy", "service": "Sankara Homoeopathy CRM API"}


# --- Medicine Directory ---
@app.get("/api/medicines", response_model=List[MedicineOut])
def list_medicines(db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    return db.query(Medicine).order_by(Medicine.name.asc()).all()


@app.post("/api/medicines", response_model=MedicineOut)
def create_medicine(payload: MedicineCreate, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Medicine name cannot be blank")

    existing = db.query(Medicine).filter(Medicine.name.ilike(clean_name)).first()
    if existing:
        return existing

    new_med = Medicine(name=clean_name)
    db.add(new_med)
    db.commit()
    db.refresh(new_med)
    return new_med


@app.put("/api/medicines/{medicine_id}", response_model=MedicineOut)
def update_medicine(medicine_id: int, payload: MedicineUpdate, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    med = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")

    med.name = payload.name
    db.commit()
    db.refresh(med)
    return med


# --- Patient Management ---
@app.post("/api/patients", response_model=PatientOut)
def register_patient(p: PatientCreate, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    pid = get_next_patient_id(db)
    patient = Patient(patient_id=pid, **p.dict())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@app.get("/api/patients/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: str, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    p = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient ID not found")
    return p


@app.put("/api/patients/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: str, payload: PatientUpdate, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return patient


# --- Appointments ---
@app.get("/api/appointments", response_model=List[AppointmentOut])
def get_appointments(doctor_id: Optional[int] = None, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    q = db.query(Appointment).join(Patient).join(Doctor)
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)

    appts = q.order_by(Appointment.app_datetime.asc()).all()
    results = []
    for a in appts:
        results.append(AppointmentOut(
            id=a.id,
            patient_id=a.patient_id,
            patient_name=a.patient.name,
            patient_age=a.patient.age,
            patient_contact=a.patient.contact,
            app_type=a.app_type,
            app_datetime=a.app_datetime,
            assigned_doctor=a.doctor.name,
            doctor_id=a.doctor_id
        ))
    return results


@app.post("/api/appointments")
def book_appointment(data: AppointmentCreate, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    appt = Appointment(**data.dict())
    db.add(appt)
    db.commit()
    return {"status": "success", "appointment_id": appt.id}


@app.put("/api/appointments/{appointment_id}")
def update_appointment(appointment_id: int, payload: AppointmentUpdate, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appt, field, value)

    db.commit()
    db.refresh(appt)
    return {"status": "success", "message": "Appointment updated successfully"}


@app.delete("/api/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt)
    db.commit()
    return {"status": "success", "message": f"Appointment #{appointment_id} removed"}


# --- Consultation Cases ---
@app.get("/api/patients/{patient_id}/cases", response_model=List[CaseSummaryOut])
def get_cases_for_patient(patient_id: str, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    return (
        db.query(ConsultationCase)
        .filter(ConsultationCase.patient_id == patient_id)
        .order_by(ConsultationCase.consultation_date.desc(), ConsultationCase.id.desc())
        .all()
    )


@app.get("/api/cases/{case_id}")
def get_case_detail(case_id: int, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    c = db.query(ConsultationCase).filter(ConsultationCase.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case record not found")

    filtered_entered = {
        k: v for k, v in (c.entered_data or {}).items()
        if v is not None and str(v).strip() != ""
    }

    return {
        "id": c.id,
        "patient_id": c.patient_id,
        "doctor_name": c.doctor_name,
        "consultation_date": c.consultation_date,
        "clinical_observations": c.clinical_observations,
        "followup_date": c.followup_date,
        "patient_status": c.patient_status,
        "medicines": c.medicines or [],
        "entered_data": filtered_entered,
        "attachments": c.attachments or []
    }


@app.post("/api/cases")
async def save_consultation_case(
    patient_id: str = Form(...),
    doctor_name: str = Form(...),
    consultation_date: date = Form(...),
    clinical_observations: Optional[str] = Form(None),
    followup_date: Optional[date] = Form(None),
    patient_status: Optional[str] = Form(None),
    medicines_json: str = Form("[]"),
    entered_data_json: str = Form("{}"),
    files: List[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: dict = Depends(require_auth_user)
):
    try:
        meds = json.loads(medicines_json)
    except Exception:
        meds = []

    try:
        entered = json.loads(entered_data_json)
    except Exception:
        entered = {}

    attachments = []
    if files:
        for f in files:
            if f.filename:
                res = upload_file_to_drive(f.file, f.filename, f.content_type)
                attachments.append({
                    "name": f.filename,
                    "url": res.get("url"),
                    "file_id": res.get("id")
                })

    new_case = ConsultationCase(
        patient_id=patient_id,
        doctor_name=doctor_name,
        consultation_date=consultation_date,
        clinical_observations=clinical_observations,
        followup_date=followup_date,
        patient_status=patient_status,
        medicines=meds,
        entered_data=entered,
        attachments=attachments
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return {"status": "success", "case_id": new_case.id}


@app.put("/api/cases/{case_id}")
def update_case_json(case_id: int, payload: CaseUpdate, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    case = db.query(ConsultationCase).filter(ConsultationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case, field, value)

    db.commit()
    db.refresh(case)
    return {"status": "success", "message": "Case updated successfully", "case_id": case.id}


@app.put("/api/cases/{case_id}/form")
async def update_case_with_files(
    case_id: int,
    doctor_name: Optional[str] = Form(None),
    consultation_date: Optional[date] = Form(None),
    clinical_observations: Optional[str] = Form(None),
    followup_date: Optional[date] = Form(None),
    patient_status: Optional[str] = Form(None),
    medicines_json: Optional[str] = Form(None),
    entered_data_json: Optional[str] = Form(None),
    files: List[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: dict = Depends(require_auth_user)
):
    case = db.query(ConsultationCase).filter(ConsultationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if doctor_name is not None:
        case.doctor_name = doctor_name
    if consultation_date is not None:
        case.consultation_date = consultation_date
    if clinical_observations is not None:
        case.clinical_observations = clinical_observations
    if followup_date is not None:
        case.followup_date = followup_date
    if patient_status is not None:
        case.patient_status = patient_status
    if medicines_json is not None:
        try:
            case.medicines = json.loads(medicines_json)
        except Exception:
            pass
    if entered_data_json is not None:
        try:
            case.entered_data = json.loads(entered_data_json)
        except Exception:
            pass

    if files:
        current_attachments = list(case.attachments or [])
        for f in files:
            if f.filename:
                res = upload_file_to_drive(f.file, f.filename, f.content_type)
                current_attachments.append({
                    "name": f.filename,
                    "url": res.get("url"),
                    "file_id": res.get("id")
                })
        case.attachments = current_attachments

    db.commit()
    db.refresh(case)
    return {"status": "success", "message": "Case and attachments updated successfully"}


@app.delete("/api/cases/{case_id}")
def delete_consultation_case(case_id: int, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    c = db.query(ConsultationCase).filter(ConsultationCase.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    db.delete(c)
    db.commit()
    return {"status": "success", "message": f"Case #{case_id} deleted successfully"}


@app.get("/api/cases/{case_id}/pdf")
def export_prescription_pdf(case_id: int, db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    case = db.query(ConsultationCase).filter(ConsultationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case record not found")
    patient = db.query(Patient).filter(Patient.patient_id == case.patient_id).first()

    case_dict = {
        "doctor_name": case.doctor_name,
        "consultation_date": case.consultation_date,
        "clinical_observations": case.clinical_observations,
        "followup_date": case.followup_date,
        "patient_status": case.patient_status,
        "medicines": case.medicines or [],
        "entered_data": case.entered_data or {}
    }
    patient_dict = {
        "patient_id": patient.patient_id,
        "name": patient.name,
        "age": patient.age,
        "contact": patient.contact,
        "treatment": patient.treatment
    }

    pdf_buffer = generate_prescription_pdf(case_dict, patient_dict)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=Prescription_{patient.patient_id}_{case.id}.pdf"}
    )


# --- Followups Schedule ---
@app.get("/api/followups")
def get_all_followups(db: Session = Depends(get_db), user: dict = Depends(require_auth_user)):
    cases = (
        db.query(ConsultationCase, Patient)
        .join(Patient, ConsultationCase.patient_id == Patient.patient_id)
        .filter(ConsultationCase.followup_date.isnot(None))
        .order_by(ConsultationCase.followup_date.asc())
        .all()
    )

    return [
        {
            "case_id": c.id,
            "patient_id": p.patient_id,
            "patient_name": p.name,
            "patient_contact": p.contact,
            "patient_end_date": p.end_date,
            "doctor_name": c.doctor_name,
            "consultation_date": c.consultation_date,
            "followup_date": c.followup_date,
            "clinical_observations": c.clinical_observations,
            "medicines": c.medicines or []
        }
        for c, p in cases
    ]