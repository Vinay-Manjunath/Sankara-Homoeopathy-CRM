import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Calendar, Clock, User, Phone, Search, Plus, Eye, Download,
    CheckCircle, RefreshCw, FileText, UploadCloud, Copy, X,
    Stethoscope, CalendarPlus, Pencil, Trash2, MessageCircle,
    RotateCcw
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const DOCTORS = [
    "Dr. Jeevesh Paramathmuni",
    "Dr. Padmashree M",
    "Dr. Dheeraj Paramathmuni"
];

export default function App() {
    // Navigation: 'appointments' | 'consultation' | 'followups'
    const [currentView, setCurrentView] = useState('appointments');

    // Master Data
    const [appointments, setAppointments] = useState([]);
    const [medicinesList, setMedicinesList] = useState([]);
    const [followupsList, setFollowupsList] = useState([]);

    // Appointments Hub Filters
    const [apptDoctorFilter, setApptDoctorFilter] = useState('ALL');
    const [apptTypeFilter, setApptTypeFilter] = useState('ALL');
    const [apptDateFrom, setApptDateFrom] = useState('');
    const [apptDateTo, setApptDateTo] = useState('');

    // Followups Hub Filters
    const [followupDoctorFilter, setFollowupDoctorFilter] = useState('ALL');
    const [followupDateFrom, setFollowupDateFrom] = useState('');
    const [followupDateTo, setFollowupDateTo] = useState('');

    // Active Patient Context (Only for Consultation Desk)
    const [activePatientId, setActivePatientId] = useState('ongaa01');
    const [activePatient, setActivePatient] = useState(null);
    const [activePatientCases, setActivePatientCases] = useState([]);

    // Active appointment linked to current consultation
    const [activeAppointmentId, setActiveAppointmentId] = useState(null);

    // Editing State
    const [editingCaseId, setEditingCaseId] = useState(null);

    // Modals
    const [showNewPatientModal, setShowNewPatientModal] = useState(false);
    const [showEditPatientModal, setShowEditPatientModal] = useState(false);
    const [showNewApptModal, setShowNewApptModal] = useState(false);
    const [showAddMedModal, setShowAddMedModal] = useState(false);
    const [newMedInput, setNewMedInput] = useState('');
    const [viewCaseModal, setViewCaseModal] = useState(null);

    // Forms
    const [newPatient, setNewPatient] = useState({
        name: '', age: '', contact: '', email: '', treatment: '', end_date: ''
    });
    const [editPatientForm, setEditPatientForm] = useState({
        name: '', age: '', contact: '', email: '', treatment: '', end_date: ''
    });
    const [newAppt, setNewAppt] = useState({
        patient_id: '', doctor_id: 1, app_type: 'new patient', app_datetime: ''
    });

    // Clinical Consultation Form
    const [doctorName, setDoctorName] = useState(DOCTORS[0]);
    const [consultDate, setConsultDate] = useState(new Date().toISOString().split('T')[0]);
    const [followupDate, setFollowupDate] = useState('');
    const [patientStatus, setPatientStatus] = useState('');
    const [clinicalObs, setClinicalObs] = useState('');
    const [rxMeds, setRxMeds] = useState([
        { medicine: '', potency: '200C', medicine_days: '3', suggested_duration: '15 Days', progress: '' }
    ]);
    const [dynamicFields, setDynamicFields] = useState({});

    // Staged Upload Documents (Multi-document support with pre-upload removal)
    const [selectedFiles, setSelectedFiles] = useState([]);

    useEffect(() => {
        fetchMedicines();
        fetchAppointments();
        fetchFollowups();
        loadPatient('ongaa01');
    }, []);

    const fetchMedicines = async () => {
        try {
            const res = await axios.get(`${API_BASE}/medicines`);
            setMedicinesList(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAppointments = async () => {
        try {
            const res = await axios.get(`${API_BASE}/appointments`);
            setAppointments(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchFollowups = async () => {
        try {
            const res = await axios.get(`${API_BASE}/followups`);
            setFollowupsList(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const loadPatient = async (pid) => {
        if (!pid) return;
        try {
            const pRes = await axios.get(`${API_BASE}/patients/${pid}`);
            setActivePatient(pRes.data);
            setActivePatientId(pid);
            const cRes = await axios.get(`${API_BASE}/patients/${pid}/cases`);
            setActivePatientCases(cRes.data);
        } catch (e) {
            alert("Patient ID not found in database.");
        }
    };

    const resetConsultationForm = () => {
        setEditingCaseId(null);
        setActiveAppointmentId(null);
        setDoctorName(DOCTORS[0]);
        setConsultDate(new Date().toISOString().split('T')[0]);
        setFollowupDate('');
        setPatientStatus('');
        setClinicalObs('');
        setDynamicFields({});
        setSelectedFiles([]);
        setRxMeds([{ medicine: '', potency: '200C', medicine_days: '3times', suggested_duration: '15 Days', progress: '' }]);
    };

    // Launch consultation from appointment row (+ button)
    const handleLaunchConsultationFromAppt = (appt) => {
        loadPatient(appt.patient_id);
        resetConsultationForm();
        setActiveAppointmentId(appt.id);
        setDoctorName(appt.assigned_doctor || DOCTORS[0]);
        setCurrentView('consultation');
    };

    // Delete Appointment directly
    const handleDeleteAppointment = async (apptId) => {
        if (!window.confirm(`Delete Appointment #${apptId}?`)) return;
        try {
            await axios.delete(`${API_BASE}/appointments/${apptId}`);
            fetchAppointments();
        } catch (e) {
            alert("Failed to delete appointment: " + e.message);
        }
    };

    // Add Custom Remedy not in DB
    const handleSaveCustomMedicine = async (e) => {
        e.preventDefault();
        if (!newMedInput.trim()) return;
        try {
            const res = await axios.post(`${API_BASE}/medicines`, { name: newMedInput.trim() });
            setMedicinesList(prev => [...prev, res.data]);
            setNewMedInput('');
            setShowAddMedModal(false);
            alert(`Remedy "${res.data.name}" added to database!`);
        } catch (err) {
            alert("Could not save remedy: " + err.message);
        }
    };

    // Populate form to EDIT existing case
    const startEditCase = async (caseId) => {
        try {
            const res = await axios.get(`${API_BASE}/cases/${caseId}`);
            const c = res.data;
            setEditingCaseId(c.id);
            setDoctorName(c.doctor_name || DOCTORS[0]);
            setConsultDate(c.consultation_date || '');
            setFollowupDate(c.followup_date || '');
            setPatientStatus(c.patient_status || '');
            setClinicalObs(c.clinical_observations || '');
            setRxMeds(c.medicines?.length ? c.medicines : [{ medicine: '', potency: '', medicine_days: '', suggested_duration: '', progress: '' }]);
            setDynamicFields(c.entered_data || {});
            setSelectedFiles([]);
            setCurrentView('consultation');
        } catch (e) {
            alert("Could not load case for editing: " + e.message);
        }
    };

    // Delete Consultation Case
    const handleDeleteCase = async (caseId) => {
        if (!window.confirm(`Are you sure you want to permanently delete Consultation #${caseId}?`)) {
            return;
        }
        try {
            await axios.delete(`${API_BASE}/cases/${caseId}`);
            alert(`Consultation Case #${caseId} deleted.`);
            if (viewCaseModal?.id === caseId) setViewCaseModal(null);
            if (editingCaseId === caseId) resetConsultationForm();
            loadPatient(activePatient.patient_id);
            fetchFollowups();
        } catch (err) {
            alert("Failed to delete case: " + err.message);
        }
    };

    // Open Edit Patient Modal
    const openEditPatientModal = () => {
        if (!activePatient) return;
        setEditPatientForm({
            name: activePatient.name || '',
            age: activePatient.age || '',
            contact: activePatient.contact || '',
            email: activePatient.email || '',
            treatment: activePatient.treatment || '',
            end_date: activePatient.end_date || ''
        });
        setShowEditPatientModal(true);
    };

    // PUT: Update Patient
    const handleUpdatePatient = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.put(`${API_BASE}/patients/${activePatient.patient_id}`, {
                name: editPatientForm.name,
                age: parseInt(editPatientForm.age),
                contact: editPatientForm.contact,
                email: editPatientForm.email,
                treatment: editPatientForm.treatment,
                end_date: editPatientForm.end_date || null
            });
            alert(`Patient ${res.data.patient_id} updated successfully!`);
            setActivePatient(res.data);
            setShowEditPatientModal(false);
            fetchAppointments();
            fetchFollowups();
        } catch (err) {
            alert("Failed to update patient: " + err.message);
        }
    };

    // File Upload Handlers
    const handleFileSelection = (e) => {
        if (e.target.files) {
            const newlyAdded = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...newlyAdded]);
            e.target.value = '';
        }
    };

    const removeStagedFile = (indexToRemove) => {
        setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    };

    const handleField = (key, val) => {
        setDynamicFields(prev => ({ ...prev, [key]: val }));
    };

    const handleVitals = (key, val) => {
        const updated = { ...dynamicFields, [key]: val };
        const w = parseFloat(key === 'weight' ? val : dynamicFields.weight);
        const h = parseFloat(key === 'height' ? val : dynamicFields.height);
        if (w > 0 && h > 0) {
            const m = h / 100;
            updated.bmi = (w / (m * m)).toFixed(1);
        }
        setDynamicFields(updated);
    };

    const addMedRow = () => {
        setRxMeds([...rxMeds, { medicine: '', potency: '30C', medicine_days: '', suggested_duration: '', progress: '' }]);
    };
    const updateMed = (idx, key, val) => {
        const arr = [...rxMeds];
        arr[idx][key] = val;
        setRxMeds(arr);
    };
    const removeMed = (idx) => {
        setRxMeds(rxMeds.filter((_, i) => i !== idx));
    };

    // Copy prior findings
    const copyPreviousFindings = async () => {
        if (activePatientCases.length === 0) {
            alert("No prior consultations exist for this patient.");
            return;
        }
        try {
            const res = await axios.get(`${API_BASE}/cases/${activePatientCases[0].id}`);
            if (res.data.entered_data) setDynamicFields(res.data.entered_data);
            if (res.data.medicines?.length) setRxMeds(res.data.medicines);
            alert("Previous visit records copied! Adjust delta values as needed.");
        } catch (e) {
            alert("Error copying prior findings: " + e.message);
        }
    };

    // Save Consultation Case
    const handleSaveConsultation = async (e) => {
        e.preventDefault();
        if (!activePatient) {
            alert("Select a patient before saving consultation.");
            return;
        }

        const formData = new FormData();
        formData.append("patient_id", activePatient.patient_id);
        formData.append("doctor_name", doctorName);
        formData.append("consultation_date", consultDate);
        if (clinicalObs) formData.append("clinical_observations", clinicalObs);
        if (followupDate) formData.append("followup_date", followupDate);
        if (patientStatus) formData.append("patient_status", patientStatus);
        formData.append("medicines_json", JSON.stringify(rxMeds.filter(m => m.medicine)));
        formData.append("entered_data_json", JSON.stringify(dynamicFields));

        selectedFiles.forEach(f => formData.append("files", f));

        try {
            if (editingCaseId) {
                await axios.put(`${API_BASE}/cases/${editingCaseId}/form`, formData);
                alert(`Consultation updated successfully!`);
            } else {
                await axios.post(`${API_BASE}/cases`, formData);
                alert("Consultation recorded & synced to cloud!");
            }

            if (activeAppointmentId) {
                try {
                    await axios.delete(`${API_BASE}/appointments/${activeAppointmentId}`);
                    fetchAppointments();
                } catch (delErr) {
                    console.error("Could not auto-remove appointment:", delErr);
                }
            }

            resetConsultationForm();
            loadPatient(activePatient.patient_id);
            fetchFollowups();
            setCurrentView('followups');
        } catch (err) {
            alert("Save failed: " + err.message);
        }
    };

    // Register New Patient
    const handleSavePatient = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_BASE}/patients`, {
                ...newPatient,
                end_date: newPatient.end_date || null
            });
            alert(`Patient registered! Assigned ID: ${res.data.patient_id}`);
            setShowNewPatientModal(false);
            loadPatient(res.data.patient_id);
            fetchFollowups();
        } catch (err) {
            alert("Registration failed: " + err.message);
        }
    };

    // Book Appointment
    const handleSaveAppointment = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/appointments`, {
                patient_id: newAppt.patient_id,
                doctor_id: parseInt(newAppt.doctor_id),
                app_type: newAppt.app_type,
                app_datetime: new Date(newAppt.app_datetime).toISOString()
            });
            alert("Appointment scheduled successfully!");
            setShowNewApptModal(false);
            fetchAppointments();
        } catch (err) {
            alert("Scheduling failed: " + err.message);
        }
    };

    // WhatsApp redirect helper
    const openWhatsApp = (contact, patientName, followupDate) => {
        const cleanNumber = contact.replace(/[^0-9]/g, '');
        const message = encodeURIComponent(
            `Hello ${patientName}, this is a gentle reminder from Sankara Homoeopathy regarding your scheduled follow-up consultation on ${followupDate}. Please contact us if you need to reschedule.`
        );
        window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
    };

    // Helper: Computes patient-specific visit number chronologically (Visit #1, Visit #2, ...)
    const getPatientVisitNumber = (caseId) => {
        if (!caseId || !activePatientCases.length) return '';
        const sorted = [...activePatientCases].sort((a, b) => {
            const dateDiff = new Date(a.consultation_date) - new Date(b.consultation_date);
            return dateDiff !== 0 ? dateDiff : (a.id - b.id);
        });
        const idx = sorted.findIndex(c => c.id === caseId);
        return idx !== -1 ? `#${idx + 1}` : `Case #${caseId}`;
    };

    // Filtered Appointments
    const filteredAppointments = appointments.filter(a => {
        const docMatch = apptDoctorFilter === 'ALL' || a.assigned_doctor === apptDoctorFilter;
        const typeMatch = apptTypeFilter === 'ALL' || a.app_type === apptTypeFilter;
        const apptDateStr = a.app_datetime ? a.app_datetime.split('T')[0] : '';
        const fromMatch = !apptDateFrom || apptDateStr >= apptDateFrom;
        const toMatch = !apptDateTo || apptDateStr <= apptDateTo;

        return docMatch && typeMatch && fromMatch && toMatch;
    });

    // Filtered Followups
    const filteredFollowups = followupsList.filter(f => {
        const doctorMatch = followupDoctorFilter === 'ALL' || f.doctor_name === followupDoctorFilter;
        const fromMatch = !followupDateFrom || f.followup_date >= followupDateFrom;
        const toMatch = !followupDateTo || f.followup_date <= followupDateTo;
        return doctorMatch && fromMatch && toMatch;
    });

    return (
        <div className="flex h-screen bg-[#FAF7F2] font-sans antialiased text-slate-800">

            {/* SIDEBAR NAVIGATION */}
            <aside className="w-64 bg-[#502479] text-white flex flex-col justify-between shrink-0 shadow-xl z-20">
                <div>
                    {/* Clinic Brand with Logo */}
                    <div className="p-4 border-b border-purple-900/50 flex items-center space-x-3">
                        <img
                            src="/logo.png"
                            alt="Sankara Homoeopathy Logo"
                            className="w-12 h-12 object-contain rounded-xl bg-white p-1 shadow-sm"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="hidden w-12 h-12 rounded-xl bg-white items-center justify-center font-serif font-extrabold text-[#502479] text-xl shadow">
                            SH
                        </div>
                        <div>
                            <h1 className="font-bold text-[#D4AF37] leading-tight tracking-tight uppercase">Sankara</h1>
                            <span className="font-bold text-[#D4AF37] leading-tight tracking-tight uppercase">Homoeopathy</span>
                            <span className="text-[#D4AF37] text-[14px] uppercase">   CRM</span>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="p-4 space-y-1.5 text-xs font-semibold">
                        <button
                            onClick={() => setCurrentView('appointments')}
                            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition ${currentView === 'appointments' ? 'bg-white/15 text-[#D4AF37] shadow-inner' : 'text-purple-100 hover:bg-white/5'}`}
                        >
                            <Calendar className="w-4 h-4" />
                            <span>Appointments</span>
                        </button>

                        <button
                            onClick={() => { resetConsultationForm(); setCurrentView('consultation'); }}
                            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition ${currentView === 'consultation' ? 'bg-white/15 text-[#D4AF37] shadow-inner' : 'text-purple-100 hover:bg-white/5'}`}
                        >
                            <Stethoscope className="w-4 h-4" />
                            <span>Consultations</span>
                        </button>

                        <button
                            onClick={() => { fetchFollowups(); setCurrentView('followups'); }}
                            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition ${currentView === 'followups' ? 'bg-white/15 text-[#D4AF37] shadow-inner' : 'text-purple-100 hover:bg-white/5'}`}
                        >
                            <Clock className="w-4 h-4" />
                            <span>Follow-ups Schedule</span>
                        </button>
                    </nav>
                </div>

                {/* Sidebar Action Buttons */}
                <div className="p-4 border-t border-purple-900/50 bg-[#381755]/50 space-y-2">
                    <button
                        onClick={() => setShowNewApptModal(true)}
                        className="w-full py-2 bg-[#208396] hover:bg-[#165c69] text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                    >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>Book Appointment</span>
                    </button>
                    <button
                        onClick={() => setShowNewPatientModal(true)}
                        className="w-full py-2 bg-[#D4AF37] hover:bg-[#b89326] text-slate-900 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Patient</span>
                    </button>
                </div>
            </aside>

            {/* MAIN VIEWPORT */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* TOP CONTEXT BAR: VISIBLE STRICTLY ON CONSULTATION DESK */}
                {currentView === 'consultation' ? (
                    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs">
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Patient ID (e.g. ongaa01)"
                                    value={activePatientId}
                                    onChange={e => setActivePatientId(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold w-48 focus:ring-2 focus:ring-[#208396] focus:outline-none"
                                />
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            </div>
                            <button
                                onClick={() => loadPatient(activePatientId)}
                                className="px-3 py-1.5 bg-[#208396] text-white rounded-lg text-xs font-bold hover:bg-[#165c69] transition"
                            >
                                Switch Patient
                            </button>
                        </div>

                        {activePatient && (
                            <div className="flex items-center space-x-3 text-xs bg-[#FAF7F2] border border-[#D4AF37]/30 px-3.5 py-1.5 rounded-xl">
                                <div>
                                    <span className="font-bold text-slate-900">{activePatient.name}</span>
                                    <span className="font-mono text-slate-500 ml-1.5">({activePatient.patient_id})</span>
                                </div>
                                <span className="text-slate-300">|</span>
                                <div>Age: <b className="text-slate-800">{activePatient.age}</b></div>
                                <span className="text-slate-300">|</span>
                                <div>Contact: <b className="text-slate-800">{activePatient.contact}</b></div>
                                {activePatient.end_date && (
                                    <>
                                        <span className="text-slate-300">|</span>
                                        <div>End Date: <b className="text-rose-600">{activePatient.end_date}</b></div>
                                    </>
                                )}

                                {/* Edit Patient Button */}
                                <button
                                    onClick={openEditPatientModal}
                                    className="ml-2 p-1.5 bg-white text-[#502479] hover:bg-[#502479] hover:text-white rounded-lg border border-slate-200 transition shadow-2xs"
                                    title="Edit Patient Details"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </header>
                ) : (
                    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs">
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-[#502479] uppercase tracking-wider">
                                {currentView === 'appointments' ? 'Reception & Scheduling Desk' : 'Follow-up Monitoring Desk'}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setShowNewApptModal(true)}
                                className="px-3 py-1.5 bg-[#208396] hover:bg-[#165c69] text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs transition"
                            >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                <span>Schedule New</span>
                            </button>
                            <button
                                onClick={() => setShowNewPatientModal(true)}
                                className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#b89326] text-slate-900 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs transition"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>New Patient</span>
                            </button>
                        </div>
                    </header>
                )}

                {/* WORKSPACE ROUTER */}
                <main className="flex-1 overflow-y-auto p-6">

                    {/* VIEW 1: APPOINTMENTS WITH FULL FILTERS & DATE RANGE */}
                    {currentView === 'appointments' && (
                        <div className="space-y-5">

                            {/* Filter Panel */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                                            <Calendar className="w-4 h-4 text-[#208396]" />
                                            <span>Doctor Scheduling & Daily Agenda</span>
                                        </h2>
                                        <p className="text-xs text-slate-500">Filter appointments by doctor, appointment type, or date range</p>
                                    </div>
                                    <span className="text-xs bg-[#e6f4f6] text-[#208396] px-3 py-1 rounded-full font-bold">
                                        {filteredAppointments.length} Matching
                                    </span>
                                </div>

                                {/* Filters Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t text-xs">
                                    <div>
                                        <label className="font-semibold text-slate-600 block mb-1">Consultant</label>
                                        <select
                                            value={apptDoctorFilter}
                                            onChange={e => setApptDoctorFilter(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg p-2 bg-white font-medium"
                                        >
                                            <option value="ALL">All Doctors</option>
                                            {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="font-semibold text-slate-600 block mb-1">Appointment Type</label>
                                        <select
                                            value={apptTypeFilter}
                                            onChange={e => setApptTypeFilter(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg p-2 bg-white font-medium"
                                        >
                                            <option value="ALL">All Types</option>
                                            <option value="new patient">New Patient</option>
                                            <option value="follow up">Follow Up</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="font-semibold text-slate-600 block mb-1">From Date</label>
                                        <input
                                            type="date"
                                            value={apptDateFrom}
                                            onChange={e => setApptDateFrom(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg p-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-semibold text-slate-600 block mb-1">To Date</label>
                                        <input
                                            type="date"
                                            value={apptDateTo}
                                            onChange={e => setApptDateTo(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg p-2"
                                        />
                                    </div>

                                    <div className="flex items-end">
                                        <button
                                            onClick={() => {
                                                setApptDoctorFilter('ALL');
                                                setApptTypeFilter('ALL');
                                                setApptDateFrom('');
                                                setApptDateTo('');
                                            }}
                                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition flex items-center justify-center space-x-1.5"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            <span>Reset</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Table of Appointments */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-[#FAF7F2] text-slate-600 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="p-3">Patient ID</th>
                                            <th className="p-3">Patient Name</th>
                                            <th className="p-3">Age</th>
                                            <th className="p-3">Mobile Contact</th>
                                            <th className="p-3">Appt Type</th>
                                            <th className="p-3">Date & Slot</th>
                                            <th className="p-3">Assigned Doctor</th>
                                            <th className="p-3 text-center">Consult</th>
                                            <th className="p-3 text-center">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredAppointments.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" className="p-6 text-center text-slate-400 italic">No scheduled appointments matching the selected filters.</td>
                                            </tr>
                                        ) : (
                                            filteredAppointments.map(a => (
                                                <tr key={a.id} className="hover:bg-slate-50 transition">
                                                    <td className="p-3 font-mono font-bold text-[#208396]">{a.patient_id}</td>
                                                    <td className="p-3 font-bold text-slate-900">{a.patient_name}</td>
                                                    <td className="p-3">{a.patient_age}</td>
                                                    <td className="p-3">{a.patient_contact}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${a.app_type === 'new patient' ? 'bg-[#e6f4f6] text-[#208396]' : 'bg-[#fbf7eb] text-[#b89326]'}`}>
                                                            {a.app_type}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-semibold text-slate-700">
                                                        {new Date(a.app_datetime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                    <td className="p-3 font-bold text-[#502479]">{a.assigned_doctor}</td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            onClick={() => handleLaunchConsultationFromAppt(a)}
                                                            className="p-1.5 bg-[#208396] text-white hover:bg-[#165c69] rounded-lg transition shadow-2xs"
                                                            title="Start Consultation & Load History"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            onClick={() => handleDeleteAppointment(a.id)}
                                                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition shadow-2xs"
                                                            title="Cancel / Delete Appointment"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* VIEW 2: CONSULTATION DESK */}
                    {currentView === 'consultation' && (
                        <div className="space-y-6">

                            {/* HISTORICAL CONSULTATIONS TABLE ON TOP WITH PATIENT VISIT # COLUMN */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-4 border-b flex justify-between items-center bg-[#FAF7F2]">
                                    <div>
                                        <h2 className="text-sm font-bold text-[#502479] flex items-center space-x-2">
                                            <Clock className="w-4 h-4 text-[#208396]" />
                                            <span>Previous Case History for {activePatient?.name} ({activePatient?.patient_id})</span>
                                        </h2>
                                        <p className="text-[11px] text-slate-400">Review past symptoms, remedies, or click pencil to edit before taking new consultation</p>
                                    </div>
                                    <span className="text-xs bg-[#e6f4f6] text-[#208396] px-2.5 py-0.5 rounded-full font-bold">
                                        {activePatientCases.length} Past Visits
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="p-2.5">Visit#</th>
                                                <th className="p-2.5">Date</th>
                                                <th className="p-2.5">Attending Doctor</th>
                                                <th className="p-2.5">Clinical Observations</th>
                                                <th className="p-2.5">Follow-up</th>
                                                <th className="p-2.5">Remedies</th>
                                                <th className="p-2.5 text-center">Edit</th>
                                                <th className="p-2.5 text-center">Inspect</th>
                                                <th className="p-2.5 text-center">PDF</th>
                                                <th className="p-2.5 text-center">Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {activePatientCases.length === 0 ? (
                                                <tr>
                                                    <td colSpan="10" className="p-4 text-center text-slate-400 italic">No prior cases found for this patient record.</td>
                                                </tr>
                                            ) : (
                                                activePatientCases.map((c) => (
                                                    <tr key={c.id} className="hover:bg-slate-50">
                                                        <td className="p-2.5 font-bold text-[#208396]">
                                                            <span className="bg-[#e6f4f6] px-2 py-0.5 rounded text-[11px] font-mono">
                                                                {getPatientVisitNumber(c.id)}
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5 font-semibold text-slate-900">{c.consultation_date}</td>
                                                        <td className="p-2.5 text-slate-700">{c.doctor_name}</td>
                                                        <td className="p-2.5 max-w-xs truncate text-slate-600" title={c.clinical_observations || ''}>
                                                            {c.clinical_observations || 'N/A'}
                                                        </td>
                                                        <td className="p-2.5 text-slate-600">{c.followup_date || '--'}</td>
                                                        <td className="p-2.5 text-slate-700">{c.medicines?.map(m => m.medicine).join(', ') || '--'}</td>

                                                        <td className="p-2.5 text-center">
                                                            <button
                                                                onClick={() => startEditCase(c.id)}
                                                                className="p-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition"
                                                                title="Edit Case Record"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>

                                                        <td className="p-2.5 text-center">
                                                            <button
                                                                onClick={async () => {
                                                                    const res = await axios.get(`${API_BASE}/cases/${c.id}`);
                                                                    setViewCaseModal(res.data);
                                                                }}
                                                                className="p-1 rounded bg-purple-50 text-[#502479] hover:bg-[#502479] hover:text-white transition"
                                                                title="View non-empty fields"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>

                                                        <td className="p-2.5 text-center">
                                                            <a
                                                                href={`${API_BASE}/cases/${c.id}/pdf`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-block p-1 rounded bg-teal-50 text-[#208396] hover:bg-[#208396] hover:text-white transition"
                                                                title="Download Letterhead PDF"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </a>
                                                        </td>

                                                        <td className="p-2.5 text-center">
                                                            <button
                                                                onClick={() => handleDeleteCase(c.id)}
                                                                className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition"
                                                                title="Delete Case Record"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* NEW OR EDIT CONSULTATION ENTRY FORM */}
                            <form onSubmit={handleSaveConsultation} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-7">

                                <div className="flex items-center justify-between border-b pb-4">
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${editingCaseId ? 'bg-amber-500 animate-pulse' : 'bg-[#502479]'}`}></span>
                                            <h2 className="text-base font-bold text-[#502479]">
                                                {editingCaseId
                                                    ? `Editing Consultation — ${getPatientVisitNumber(editingCaseId)} (${activePatient?.name})`
                                                    : `New Consultation & Case Sheet — Visit #${activePatientCases.length + 1}`}
                                            </h2>
                                            {activeAppointmentId && (
                                                <span className="text-[10px] font-bold bg-[#e6f4f6] text-[#208396] px-2 py-0.5 rounded-md border border-[#208396]/30">
                                                    Linked to Appt #{activeAppointmentId} (Auto-removes on save)
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400">Universal case intake covering Preliminary, Personal History, and Full Examination.</p>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        {editingCaseId && (
                                            <button
                                                type="button"
                                                onClick={resetConsultationForm}
                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                            >
                                                Cancel Edit Mode
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={copyPreviousFindings}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#fbf7eb] text-[#b89326] border border-[#D4AF37]/40 hover:bg-[#D4AF37] hover:text-white transition flex items-center space-x-1.5"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copy Previous Visit Findings</span>
                                        </button>
                                    </div>
                                </div>

                                {/* SECTION 1: PRESCRIPTION AND TREATMENT */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#502479]">Section 1: Prescription and Treatment Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                        <div>
                                            <label className="font-semibold text-slate-600 block mb-1">Attending Doctor</label>
                                            <select
                                                value={doctorName}
                                                onChange={e => setDoctorName(e.target.value)}
                                                className="w-full border rounded-lg p-2 font-semibold bg-white"
                                            >
                                                {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="font-semibold text-slate-600 block mb-1">Consultation Date</label>
                                            <input
                                                type="date"
                                                value={consultDate}
                                                onChange={e => setConsultDate(e.target.value)}
                                                className="w-full border rounded-lg p-2"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="font-semibold text-slate-600 block mb-1">Followup Date</label>
                                            <input
                                                type="date"
                                                value={followupDate}
                                                onChange={e => setFollowupDate(e.target.value)}
                                                className="w-full border rounded-lg p-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-semibold text-slate-600 block mb-1">Patient Status</label>
                                            <input
                                                type="text"
                                                value={patientStatus}
                                                onChange={e => setPatientStatus(e.target.value)}
                                                className="w-full border rounded-lg p-2"
                                            />
                                        </div>
                                    </div>

                                    {/* ENLARGED CLINICAL OBSERVATIONS TEXTBOX */}
                                    <div>
                                        <label className="font-semibold text-slate-600 block mb-1 text-xs">
                                            Clinical Observations & Case Highlights (Enlarged)
                                        </label>
                                        <textarea
                                            rows={6}
                                            value={clinicalObs}
                                            onChange={e => setClinicalObs(e.target.value)}
                                            placeholder="Enter detailed presenting symptoms, mental disposition, modalities, tongue coat, thermals, and specific homeopathic totality..."
                                            className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#208396] focus:outline-none min-h-[140px]"
                                        />
                                    </div>

                                    {/* Prescription Table with + Custom Remedy */}
                                    <div className="bg-[#FAF7F2] p-4 rounded-xl border border-slate-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-[#502479] uppercase">Prescribed Medicines</span>
                                            <div className="flex space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddMedModal(true)}
                                                    className="px-3 py-1 bg-[#D4AF37] hover:bg-[#b89326] text-slate-900 rounded text-xs font-bold flex items-center space-x-1"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>Custom Remedy</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={addMedRow}
                                                    className="px-3 py-1 bg-[#208396] hover:bg-[#165c69] text-white rounded text-xs font-bold"
                                                >
                                                    Add Remedy Row
                                                </button>
                                            </div>
                                        </div>
                                        {rxMeds.map((row, idx) => (
                                            <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 text-xs">
                                                <select
                                                    value={row.medicine}
                                                    onChange={e => updateMed(idx, 'medicine', e.target.value)}
                                                    className="border rounded p-1.5 bg-white md:col-span-2 font-semibold"
                                                >
                                                    <option value="">-- Select Remedy from DB --</option>
                                                    {medicinesList.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                                </select>
                                                <input
                                                    type="text"
                                                    placeholder="Potency"
                                                    value={row.potency}
                                                    onChange={e => updateMed(idx, 'potency', e.target.value)}
                                                    className="border rounded p-1.5"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Days"
                                                    value={row.medicine_days}
                                                    onChange={e => updateMed(idx, 'medicine_days', e.target.value)}
                                                    className="border rounded p-1.5"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Duration"
                                                    value={row.suggested_duration}
                                                    onChange={e => updateMed(idx, 'suggested_duration', e.target.value)}
                                                    className="border rounded p-1.5"
                                                />
                                                <div className="flex space-x-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Progress / Directions"
                                                        value={row.progress}
                                                        onChange={e => updateMed(idx, 'progress', e.target.value)}
                                                        className="border rounded p-1.5 flex-1"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMed(idx)}
                                                        className="text-rose-500 font-bold px-1.5"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Multi-Document Upload with Staging & Pre-Upload Delete */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 block">
                                            Patient Documents, Lab Reports & Clinical Photos
                                        </label>

                                        <div className="flex items-center space-x-3">
                                            <label className="cursor-pointer px-4 py-2 bg-[#208396] hover:bg-[#165c69] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition">
                                                <UploadCloud className="w-4 h-4" />
                                                <span>Choose Documents (Multiple)</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    className="hidden"
                                                    onChange={handleFileSelection}
                                                />
                                            </label>
                                            <span className="text-[11px] text-slate-500">
                                                {selectedFiles.length === 0 ? "No files staged yet" : `${selectedFiles.length} file(s) ready to upload`}
                                            </span>
                                        </div>

                                        {/* Staged File Cards List */}
                                        {selectedFiles.length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                                                {selectedFiles.map((file, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs"
                                                    >
                                                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                                                            <div className="w-7 h-7 rounded-lg bg-[#e6f4f6] text-[#208396] flex items-center justify-center shrink-0">
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                                                                    {file.name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 font-mono">
                                                                    {formatFileSize(file.size)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeStagedFile(idx)}
                                                            className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center shrink-0 transition"
                                                            title="Cancel this file before upload"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* SECTION 2: PRELIMINARY DATA */}
                                <div className="space-y-3 border-t pt-5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#208396]">Section 2: Preliminary Data</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                        <input
                                            type="text"
                                            placeholder="Treatment"
                                            value={dynamicFields.prelim_treatment || ''}
                                            onChange={e => handleField('prelim_treatment', e.target.value)}
                                            className="border rounded-lg p-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Presenting Complain & History"
                                            value={dynamicFields.presenting_complain_history || ''}
                                            onChange={e => handleField('presenting_complain_history', e.target.value)}
                                            className="border rounded-lg p-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Rare Disease"
                                            value={dynamicFields.rare_disease || ''}
                                            onChange={e => handleField('rare_disease', e.target.value)}
                                            className="border rounded-lg p-2"
                                        />
                                    </div>
                                </div>

                                {/* SECTION 3: PERSONAL HISTORY */}
                                <div className="space-y-3 border-t pt-5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#b89326]">Section 3: Personal History</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                        {[
                                            'Appetite', 'Bowels', 'Aversion', 'Sleep', 'Sun Headache', 'Thirst',
                                            'Dreams', 'Diabetics', 'Thyroid', 'Past & Treatment History',
                                            'Menstrual & Obstetrics History', 'Desires', 'Sweat', 'Urine',
                                            'Side Affinity', 'Habits', 'Thermals', 'Investigation',
                                            'Hypertension', 'Hyperlipidemia', 'Family History', 'MIND'
                                        ].map(field => {
                                            const key = field.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                            return (
                                                <div key={field}>
                                                    <label className="font-semibold text-slate-500 block mb-0.5 text-[10px] uppercase">{field}</label>
                                                    <input
                                                        type="text"
                                                        value={dynamicFields[key] || ''}
                                                        onChange={e => handleField(key, e.target.value)}
                                                        className="w-full border rounded p-1.5 focus:ring-1 focus:ring-[#208396]"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* SECTION 4: GENERAL EXAMINATION */}
                                <div className="space-y-3 border-t pt-5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#502479]">Section 4: General Examination</h3>

                                    {/* Vitals with auto-BMI */}
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs bg-[#FAF7F2] p-3 rounded-xl border border-slate-200">
                                        <div>
                                            <label className="font-bold text-slate-600 block text-[10px]">BP (mmHg)</label>
                                            <input
                                                type="text"
                                                placeholder="120/80"
                                                value={dynamicFields.bp || ''}
                                                onChange={e => handleVitals('bp', e.target.value)}
                                                className="w-full border rounded p-1.5 bg-white font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-slate-600 block text-[10px]">Pulse (bpm)</label>
                                            <input
                                                type="text"
                                                placeholder="72"
                                                value={dynamicFields.pulse || ''}
                                                onChange={e => handleVitals('pulse', e.target.value)}
                                                className="w-full border rounded p-1.5 bg-white font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-slate-600 block text-[10px]">Weight (kg)</label>
                                            <input
                                                type="text"
                                                placeholder="68"
                                                value={dynamicFields.weight || ''}
                                                onChange={e => handleVitals('weight', e.target.value)}
                                                className="w-full border rounded p-1.5 bg-white font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-slate-600 block text-[10px]">Height (cm)</label>
                                            <input
                                                type="text"
                                                placeholder="172"
                                                value={dynamicFields.height || ''}
                                                onChange={e => handleVitals('height', e.target.value)}
                                                className="w-full border rounded p-1.5 bg-white font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-slate-600 block text-[10px]">Temp (°F)</label>
                                            <input
                                                type="text"
                                                placeholder="98.6"
                                                value={dynamicFields.temp || ''}
                                                onChange={e => handleVitals('temp', e.target.value)}
                                                className="w-full border rounded p-1.5 bg-white font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-slate-600 block text-[10px]">BMI</label>
                                            <input
                                                type="text"
                                                placeholder="--"
                                                value={dynamicFields.bmi || ''}
                                                readOnly
                                                className="w-full border rounded p-1.5 bg-slate-100 font-bold text-[#208396]"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                        {[
                                            'Systematic Examination', 'Repertorial Result', 'Particular', 'Exercises',
                                            'Mental General', 'Present Medication', 'Level of Assurance', 'Nutrition',
                                            'Miasmatic Diagnosis', 'Management', 'Diet', 'Analysis Totality',
                                            'Physical General', 'Criteria Future Plan', 'Dos and Donts', 'Prescribed Medicine Summary'
                                        ].map(field => {
                                            const key = field.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                            return (
                                                <div key={field}>
                                                    <label className="font-semibold text-slate-500 block mb-0.5 text-[10px] uppercase">{field}</label>
                                                    <input
                                                        type="text"
                                                        value={dynamicFields[key] || ''}
                                                        onChange={e => handleField(key, e.target.value)}
                                                        className="w-full border rounded p-1.5"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex justify-end space-x-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={resetConsultationForm}
                                        className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                                    >
                                        Clear Form
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-[#502479] hover:bg-[#381755] text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-2"
                                    >
                                        <CheckCircle className="w-4 h-4 text-[#D4AF37]" />
                                        <span>{editingCaseId ? `Update ${getPatientVisitNumber(editingCaseId)}` : "Save Consultation & Complete Visit"}</span>
                                    </button>
                                </div>

                            </form>
                        </div>
                    )}

                    {/* VIEW 3: UPCOMING FOLLOW-UPS HUB */}
                    {currentView === 'followups' && (
                        <div className="space-y-5">

                            {/* Header & Filter Bar */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">Upcoming Patient Follow-ups</h2>
                                        <p className="text-xs text-slate-500">Sorted nearest date first with 1-click WhatsApp alerts & patient contacts</p>
                                    </div>
                                    <span className="text-xs bg-[#e6f4f6] text-[#208396] px-3 py-1 rounded-full font-bold">
                                        {filteredFollowups.length} Scheduled
                                    </span>
                                </div>

                                {/* Filter Controls */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t text-xs">
                                    <div>
                                        <label className="font-semibold text-slate-600 block mb-1">Doctor Filter</label>
                                        <select
                                            value={followupDoctorFilter}
                                            onChange={e => setFollowupDoctorFilter(e.target.value)}
                                            className="w-full border rounded-lg p-2 bg-white"
                                        >
                                            <option value="ALL">All Doctors</option>
                                            {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-600 block mb-1">From Date</label>
                                        <input
                                            type="date"
                                            value={followupDateFrom}
                                            onChange={e => setFollowupDateFrom(e.target.value)}
                                            className="w-full border rounded-lg p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-600 block mb-1">To Date</label>
                                        <input
                                            type="date"
                                            value={followupDateTo}
                                            onChange={e => setFollowupDateTo(e.target.value)}
                                            className="w-full border rounded-lg p-2"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={() => { setFollowupDoctorFilter('ALL'); setFollowupDateFrom(''); setFollowupDateTo(''); }}
                                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Table of Followups */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-[#FAF7F2] text-slate-600 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="p-3">Follow-up Date</th>
                                            <th className="p-3">Patient ID</th>
                                            <th className="p-3">Patient Name</th>
                                            <th className="p-3">Contact Number</th>
                                            <th className="p-3">End Date</th>
                                            <th className="p-3">Doctor</th>
                                            <th className="p-3">Last Visit</th>
                                            <th className="p-3 text-center">WhatsApp Alert</th>
                                            <th className="p-3 text-center">Inspect Case</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredFollowups.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" className="p-6 text-center text-slate-400 italic">No matching follow-ups found.</td>
                                            </tr>
                                        ) : (
                                            filteredFollowups.map(f => (
                                                <tr key={f.case_id} className="hover:bg-slate-50 transition">
                                                    <td className="p-3 font-bold text-[#208396]">{f.followup_date}</td>
                                                    <td className="p-3 font-mono font-bold text-slate-700">{f.patient_id}</td>
                                                    <td className="p-3 font-bold text-slate-900">{f.patient_name}</td>
                                                    <td className="p-3 font-semibold text-slate-700 flex items-center space-x-1.5 pt-3.5">
                                                        <Phone className="w-3 h-3 text-[#208396]" />
                                                        <span>{f.patient_contact}</span>
                                                    </td>
                                                    <td className="p-3 text-rose-600 font-semibold">{f.patient_end_date || '--'}</td>
                                                    <td className="p-3 font-medium text-[#502479]">{f.doctor_name}</td>
                                                    <td className="p-3 text-slate-500">{f.consultation_date}</td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            onClick={() => openWhatsApp(f.patient_contact, f.patient_name, f.followup_date)}
                                                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center space-x-1 mx-auto transition shadow-xs"
                                                            title="Send WhatsApp Follow-up Reminder"
                                                        >
                                                            <MessageCircle className="w-3.5 h-3.5" />
                                                            <span>WhatsApp</span>
                                                        </button>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            onClick={async () => {
                                                                const res = await axios.get(`${API_BASE}/cases/${f.case_id}`);
                                                                setViewCaseModal(res.data);
                                                            }}
                                                            className="p-1 rounded bg-purple-50 text-[#502479] hover:bg-[#502479] hover:text-white"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    )}

                </main>
            </div>

            {/* MODAL: ADD CUSTOM REMEDY */}
            {showAddMedModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl border">
                        <h3 className="font-bold text-sm text-[#502479]">Add Custom Remedy to Database</h3>
                        <p className="text-[11px] text-slate-500">Remedies added here are immediately available in the central dropdown.</p>
                        <form onSubmit={handleSaveCustomMedicine} className="space-y-3 text-xs">
                            <input
                                type="text"
                                required
                                placeholder="e.g. Baryta Carbonica"
                                value={newMedInput}
                                onChange={e => setNewMedInput(e.target.value)}
                                className="w-full border rounded-lg p-2 font-semibold"
                                autoFocus
                            />
                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddMedModal(false)}
                                    className="px-3 py-1.5 border rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-[#208396] text-white rounded-lg font-bold"
                                >
                                    Save Remedy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: EDIT PATIENT */}
            {showEditPatientModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-bold text-sm text-[#502479]">Edit Patient ({activePatient?.patient_id})</h3>
                            <button onClick={() => setShowEditPatientModal(false)} className="text-slate-400 font-bold">✕</button>
                        </div>

                        <form onSubmit={handleUpdatePatient} className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-600 block mb-1">Full Patient Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editPatientForm.name}
                                    onChange={e => setEditPatientForm({ ...editPatientForm, name: e.target.value })}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-600 block mb-1">Age</label>
                                    <input
                                        type="number"
                                        required
                                        value={editPatientForm.age}
                                        onChange={e => setEditPatientForm({ ...editPatientForm, age: e.target.value })}
                                        className="w-full border rounded-lg p-2"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-600 block mb-1">Contact Mobile</label>
                                    <input
                                        type="text"
                                        required
                                        value={editPatientForm.contact}
                                        onChange={e => setEditPatientForm({ ...editPatientForm, contact: e.target.value })}
                                        className="w-full border rounded-lg p-2"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-600 block mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={editPatientForm.end_date}
                                    onChange={e => setEditPatientForm({ ...editPatientForm, end_date: e.target.value })}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-600 block mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={editPatientForm.email}
                                    onChange={e => setEditPatientForm({ ...editPatientForm, email: e.target.value })}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-600 block mb-1">Treatment Protocol</label>
                                <input
                                    type="text"
                                    value={editPatientForm.treatment}
                                    onChange={e => setEditPatientForm({ ...editPatientForm, treatment: e.target.value })}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditPatientModal(false)}
                                    className="px-3 py-1.5 border rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-1.5 bg-[#502479] text-white rounded-lg font-bold"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: EYE INSPECT */}
            {viewCaseModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl border">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-bold text-sm text-[#502479]">
                                Consultation Record ({viewCaseModal.consultation_date} — {getPatientVisitNumber(viewCaseModal.id)})
                            </h3>
                            <button onClick={() => setViewCaseModal(null)} className="text-slate-400 font-bold">✕</button>
                        </div>

                        <div className="text-xs space-y-3">
                            <div className="flex justify-between items-center">
                                <p><b>Attending Doctor:</b> {viewCaseModal.doctor_name}</p>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => {
                                            const cid = viewCaseModal.id;
                                            setViewCaseModal(null);
                                            startEditCase(cid);
                                        }}
                                        className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md font-bold flex items-center space-x-1"
                                    >
                                        <Pencil className="w-3 h-3" />
                                        <span>Edit Case</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCase(viewCaseModal.id)}
                                        className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-md font-bold flex items-center space-x-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>
                            <p><b>Clinical Observations:</b> {viewCaseModal.clinical_observations || 'None logged'}</p>

                            <h4 className="font-bold text-[#208396] uppercase text-[11px]">Prescribed Remedies</h4>
                            <div className="space-y-1">
                                {viewCaseModal.medicines?.map((m, i) => (
                                    <div key={i} className="p-2 bg-slate-50 border rounded flex justify-between">
                                        <b>{m.medicine} ({m.potency})</b>
                                        <span>Days: {m.medicine_days || '--'} | {m.suggested_duration || '--'}</span>
                                    </div>
                                ))}
                            </div>

                            <h4 className="font-bold text-[#502479] uppercase text-[11px]">Recorded Findings (Only Non-Empty)</h4>
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border">
                                {Object.entries(viewCaseModal.entered_data || {}).map(([k, v]) => (
                                    <div key={k} className="bg-white p-2 rounded border">
                                        <b className="capitalize text-slate-500 block text-[10px]">{k.replace(/_/g, ' ')}</b>
                                        <span className="font-semibold text-slate-800">{v}</span>
                                    </div>
                                ))}
                            </div>

                            {viewCaseModal.attachments?.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-blue-700 uppercase text-[11px]">Attached Documents & Reports</h4>
                                    <ul className="list-disc pl-5 mt-1">
                                        {viewCaseModal.attachments.map((a, i) => (
                                            <li key={i}>
                                                <a href={a.url} target="_blank" rel="noreferrer" className="text-[#208396] underline">
                                                    {a.name}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: REGISTER NEW PATIENT */}
            {showNewPatientModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border">
                        <h3 className="font-bold text-sm text-[#502479]">Register New Patient</h3>
                        <form onSubmit={handleSavePatient} className="space-y-3 text-xs">
                            <input
                                type="text"
                                required
                                placeholder="Full Patient Name"
                                value={newPatient.name}
                                onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                                className="w-full border rounded p-2"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    required
                                    placeholder="Age"
                                    value={newPatient.age}
                                    onChange={e => setNewPatient({ ...newPatient, age: e.target.value })}
                                    className="w-full border rounded p-2"
                                />
                                <input
                                    type="text"
                                    required
                                    placeholder="Mobile Contact"
                                    value={newPatient.contact}
                                    onChange={e => setNewPatient({ ...newPatient, contact: e.target.value })}
                                    className="w-full border rounded p-2"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">End Date</label>
                                    <input
                                        type="date"
                                        value={newPatient.end_date}
                                        onChange={e => setNewPatient({ ...newPatient, end_date: e.target.value })}
                                        className="w-full border rounded p-2"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Email (Optional)</label>
                                    <input
                                        type="email"
                                        placeholder="patient@example.com"
                                        value={newPatient.email}
                                        onChange={e => setNewPatient({ ...newPatient, email: e.target.value })}
                                        className="w-full border rounded p-2"
                                    />
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Treatment Protocol"
                                value={newPatient.treatment}
                                onChange={e => setNewPatient({ ...newPatient, treatment: e.target.value })}
                                className="w-full border rounded p-2"
                            />
                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewPatientModal(false)}
                                    className="px-3 py-1.5 border rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-[#502479] text-white rounded font-bold"
                                >
                                    Save Patient
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: BOOK APPOINTMENT */}
            {showNewApptModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border">
                        <h3 className="font-bold text-sm text-[#208396]">Schedule Patient Appointment</h3>
                        <form onSubmit={handleSaveAppointment} className="space-y-3 text-xs">
                            <div>
                                <label className="block mb-1 font-semibold text-slate-600">Patient ID</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. ongaa01"
                                    value={newAppt.patient_id}
                                    onChange={e => setNewAppt({ ...newAppt, patient_id: e.target.value })}
                                    className="w-full border rounded p-2 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold text-slate-600">Assign Consultant</label>
                                <select
                                    value={newAppt.doctor_id}
                                    onChange={e => setNewAppt({ ...newAppt, doctor_id: e.target.value })}
                                    className="w-full border rounded p-2 bg-white font-semibold"
                                >
                                    <option value={1}>Dr. Jeevesh Paramathmuni</option>
                                    <option value={2}>Dr. Padmashree M</option>
                                    <option value={3}>Dr. Dheeraj Paramathmuni</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold text-slate-600">Appointment Type</label>
                                <select
                                    value={newAppt.app_type}
                                    onChange={e => setNewAppt({ ...newAppt, app_type: e.target.value })}
                                    className="w-full border rounded p-2 bg-white"
                                >
                                    <option value="new patient">New Patient</option>
                                    <option value="follow up">Follow Up</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold text-slate-600">Date & Slot</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={newAppt.app_datetime}
                                    onChange={e => setNewAppt({ ...newAppt, app_datetime: e.target.value })}
                                    className="w-full border rounded p-2"
                                />
                            </div>
                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewApptModal(false)}
                                    className="px-3 py-1.5 border rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-[#208396] text-white rounded font-bold"
                                >
                                    Confirm Appointment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}