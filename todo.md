# DentScribe AI - Project TODO

## Core Features

### Database & Schema
- [x] Create patients table
- [x] Create consultations table
- [x] Create consultation_templates table
- [x] Add indexes for performance

### Backend API
- [x] Patient management procedures (create, list, get by ID)
- [x] Consultation procedures (create, list, get by ID, update)
- [x] Audio upload and storage integration
- [x] Audio transcription integration with Whisper API
- [x] AI analysis integration with GPT-4 for SOAP note generation
- [ ] PDF export functionality for clinical notes
- [x] Template management procedures

### Frontend Pages
- [x] Dashboard page with consultation list
- [x] New consultation page with patient selection
- [x] Audio recording interface with waveform visualization
- [x] Transcription display component
- [x] SOAP note viewer/editor page
- [ ] Patient management page
- [ ] Settings page for user preferences

### Audio Recording Features
- [x] Browser audio recording with MediaRecorder API
- [x] Real-time audio level visualization
- [x] Recording timer display
- [x] Pause/resume recording functionality
- [x] Audio file upload to S3 storage

### AI Integration
- [x] Whisper API integration for Portuguese transcription
- [x] GPT-4 integration with specialized dental prompt
- [x] SOAP note structure generation
- [x] Red flags identification
- [x] Treatment urgency classification

### UI/UX Features
- [x] Responsive design with Tailwind CSS
- [x] Loading states for transcription and analysis
- [x] Error handling and user feedback
- [ ] Export to PDF functionality
- [x] Edit and save SOAP notes

### Security & Privacy
- [x] Patient data encryption
- [x] Access control (dentist can only see their own consultations)
- [x] LGPD compliance features
- [ ] Audit logging for data access

## Future Enhancements (Post-MVP)
- [ ] Multi-language support
- [ ] Integration with Brazilian dental management systems
- [ ] Radiographic image analysis
- [ ] Voice charting for periodontal records
- [ ] Offline mode with sync
- [ ] Analytics dashboard


## Critical MVP Features (In Progress)

### SOAP Note Editing
- [x] Create SOAPNoteEditor component with editable forms
- [x] Add edit mode toggle in consultation detail page
- [x] Implement inline editing for all SOAP sections
- [x] Add save/cancel functionality
- [x] Validate data before saving
- [x] Show visual feedback when editing

### PDF Export
- [x] Install PDF generation library (PDFKit or similar)
- [x] Create PDF generation endpoint in backend
- [x] Design professional PDF template with header/footer
- [x] Include dentist information (name, CRO)
- [x] Format SOAP note sections properly in PDF
- [x] Add digital signature placeholder
- [x] Implement download functionality
- [x] Handle PDF generation errors

### Patient Management
- [x] Create Patients page with list view
- [x] Create PatientForm component for add/edit
- [x] Add patient search functionality
- [x] Update new consultation flow to select existing patient
- [x] Create patient detail page with consultation history
- [x] Add patient fields: phone, CPF, allergies
- [x] Link consultations to patient records
- [x] Add navigation to patients page in header


## Bugs to Fix

- [x] Fix React hooks ordering error in ConsultationDetail component (hooks called conditionally)
