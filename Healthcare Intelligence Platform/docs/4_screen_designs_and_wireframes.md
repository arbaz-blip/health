# Screen Designs & UI Wireframes

This document details the user interface structures, clinical usability considerations, style guides, and layout wireframes for key workflows in HIP.

---

## 1. UI/UX Style Guide & Color System

To achieve a premium, clinical, and high-trust experience, the Healthcare Intelligence Platform (HIP) uses a curated Dark Slate color system with vibrant, specialized accent colors to denote medical severity.

### 1.1 Color Palette (HSL & Hex Mapping)
*   **Primary Background (Slate Deep):** `#0F172A` (HSL 222, 47%, 11%) — Dominant background for the application canvas.
*   **Secondary Background (Slate Card):** `#1E293B` (HSL 217, 33%, 17%) — Background color for dashboards, metric cards, grids, and form containers.
*   **Primary Text (Off-White):** `#F8FAFC` (HSL 210, 40%, 98%) — Crisp, legible reading text.
*   **Secondary Text (Muted Slate):** `#94A3B8` (HSL 215, 20%, 65%) — Label names, details, and helper notes.
*   **Clinical Accents (Primary Action / Cyan):** `#06B6D4` (HSL 188, 86%, 53%) — Primary buttons, navigation highlights, active queue states.
*   **Information Accent (Indigo):** `#6366F1` (HSL 239, 84%, 67%) — Informational messages and scheduling status.

### 1.2 Severity & Triage Color Codes (Strict Clinical Standard)
*   **Critical (Red Alert):** `#EF4444` (HSL 0, 84%, 60%) — Active emergency resuscitation, extremely abnormal lab values.
*   **High (Orange Alert):** `#F97316` (HSL 20, 96%, 53%) — Emergent cases, out-of-range lab results.
*   **Medium (Yellow Alert):** `#EAB308` (HSL 45, 93%, 47%) — Urgent ER cases, validated warnings.
*   **Low (Green Normal):** `#10B981` (HSL 160, 84%, 39%) — Stable patients, standard waiting, normal lab levels.

### 1.3 Typography System
*   **Primary Typography:** `Outfit`, Sans-serif (Google Fonts) — clean, geometric, professional look.
*   **Body & Form Typography:** `Inter`, Sans-serif — high legibility, optimized for data-dense grids and forms.
*   **Scale:**
    *   **Main Dashboard Headers:** `24px` / `Font Weight: 700 (Bold)`
    *   **Subheaders / Section Headers:** `18px` / `Font Weight: 600 (Semibold)`
    *   **Body / Lab Metrics Input:** `14px` / `Font Weight: 400 (Regular)`
    *   **Data Labels:** `12px` / `Font Weight: 500 (Medium)`

---

## 2. Visual UI Mockups

Here are the visual representations showing the final polished layout, color system, and clinical dashboards.

### 2.1 Executive Dashboard Design Concept
![Executive Dashboard Mockup](C:/Users/CD User/.gemini/antigravity/brain/1264567c-5f3b-45ec-9049-2e31490c22fb/executive_dashboard_mockup_1782295612508.png)

### 2.2 Emergency Triage & Tracking Board Concept
![Emergency Triage Mockup](C:/Users/CD User/.gemini/antigravity/brain/1264567c-5f3b-45ec-9049-2e31490c22fb/triage_board_mockup_1782295626478.png)

---

## 3. UI/UX Clinical Design Guidelines
To minimize training and accelerate data entry for clinical and administrative staff, the frontend adheres to these core guidelines:
* **Keyboard Navigation:** Form layouts support complete keyboard operation (`Tab`, `Enter`, and hotkeys like `Alt+S` to save) to speed up front-desk and emergency registrations.
* **Responsive Layouts:** Sidebar navigation collapses on tablets and mobiles, expanding on 1080p desktop monitors to show split-screen patient cards.
* **Aggressive Data Caching:** Immediate visual loads of tables, grids, and patient cards using query invalidation patterns to prevent blank loading states.

---

## 4. UI Wireframes (Mermaid Mockups)

Below are the mock visual layouts representing the system's key operational screens.

### 2.1 Patient Registration Screen (Front Desk)
A split layout with dynamic validation state indicators and photo uploads.

```mermaid
graph TD
    subgraph UI_Layout_Registration ["Front Desk - Patient Registration Screen"]
        Header["[ HIP - Phase 1 ]  Logged In: Sarah Miller (Front Desk)  |  Current Time: 15:05"]
        
        subgraph RegistrationForm ["New Patient Registration Form"]
            PhotoBox["[ UPLOAD PHOTO ]\n(Drag & drop photo)"]
            
            NameInput["* Full Name:\n[ John Doe ]"]
            CnicInput["* CNIC / National ID:\n[ 42101-1234567-1 ]"]
            PassportInput["Passport Number (Optional):\n[ ]"]
            DobInput["* Date of Birth:\n[ 1990-05-15 ] (Age: 36)"]
            GenderInput["* Gender:\n(o) Male   ( ) Female   ( ) Other"]
            
            ContactInput["* Mobile Number:\n[ +923001234567 ]"]
            BloodInput["Blood Group:\n[ O+ ] (v)"]
            
            Consent["[X] I accept terms and consent to medical data processing"]
            
            SubmitBtn["[ SAVE & GENERATE MRN (Alt+S) ]"]
        end
    end
```

### 2.2 Emergency Triage & Tracking Board (ER Nurse/Doctor)
A real-time tracking interface showing patients sorted by triage priority with color coding.

```mermaid
graph TD
    subgraph UI_Layout_EmergencyBoard ["Emergency Intake & Triage Tracker"]
        ERHeader["[ ER TRACKING BOARD ]  Active ER Patients: 8  |  Critical: 2  |  Avg Response: 6m"]
        
        subgraph ActivePatientsTable ["Live Patient Board (Sorted by Priority)"]
            Row1["[ RED ]   MRN-0092 | Unknown Male  | Ambulance | Vitals: BP 90/50, SpO2 88% | status: Under Treatment"]
            Row2["[ ORANGE ] MRN-0078 | Sarah Khan    | Self      | Vitals: BP 140/90, SpO2 94%| status: Waiting Doctor"]
            Row3["[ YELLOW ] MRN-0081 | Alex Mercer   | Bystander | Vitals: BP 120/80, SpO2 97%| status: In Triage"]
            Row4["[ GREEN ]  MRN-0054 | Liam O'Connor | Police    | Vitals: BP 115/75, SpO2 99%| status: Waiting Triage"]
        end
        
        subgraph TriageSidePanel ["Quick Triage Form (Side Panel)"]
            BPAccess["Blood Pressure: [ 120 ] / [ 80 ] mmHg"]
            PulseAccess["Pulse Rate:     [ 85 ] bpm"]
            TempAccess["Temperature:    [ 37.0 ] C"]
            Spo2Access["SpO2 %:         [ 98 ] %"]
            ConsciousAccess["Consciousness: (o) Alert  ( ) Voice  ( ) Pain  ( ) Unresponsive"]
            PrioritySelect["Triage Category: [ Medium - Yellow ] (v)"]
            SubmitTriageBtn["[ SUBMIT TRIAGE DATA ]"]
        end
    end
```

### 2.3 Laboratory Result Validation Screen (Lab Supervisor)
Displays test items, reference ranges, and critical flags before publication.

```mermaid
graph TD
    subgraph UI_Layout_LabValidation ["Lab Supervisor - Result Approval Screen"]
        LabHeader["[ LIMS RESULT APPROVAL ] Order ID: ORD-2026-9922  |  Patient: John Doe (36M)"]
        
        subgraph ResultsGrid ["Test Results Comparison Panel"]
            GridHeader["Test Code  |  Test Name  |  Entered Value  |  Reference Range  |  Status"]
            GRow1["CBC_HEM    |  Hemoglobin |  10.2 g/dL     |  13.8 - 17.2      |  [ LOW - RED FLAG ]"]
            GRow2["CBC_WBC    |  WBC Count  |  8,500 /uL     |  4,500 - 11,000   |  [ NORMAL ]"]
            GRow3["LFT_ALT    |  ALT        |  85 U/L        |  7 - 56           |  [ HIGH - ORANGE FLAG ]"]
        end
        
        subgraph ActionPanel ["Approval / Rejection Controls"]
            NotesBox["Supervisor Clinical Validation Notes:\n[ Values validated. Low Hb corresponds to patient clinical history. ]"]
            ApproveBtn["[ APPROVE & SIGN REPORT (Alt+A) ]"]
            RejectBtn["[ REJECT & SEND FOR RE-TEST ]"]
        end
    end
```

### 2.4 Executive Analytics Dashboard (Reporting Manager)
Displays operational analytics, patient volume trends, and service bottlenecks.

```mermaid
graph TD
    subgraph UI_Layout_Dashboard ["Hospital Executive Dashboard"]
        DashHeader["[ EXECUTIVE DASHBOARD ]  Timeframe: Last 30 Days  |  Last Sync: Just Now"]
        
        subgraph KPICards ["Key Performance Indicators (KPIs)"]
            Card1["Total Patients\n 12,450 \n (+5.2%)"]
            Card2["ER Avg Response\n 6.4 Mins \n (-12%)"]
            Card3["Lab Turnaround\n 2.1 Hours \n (+4.5%)"]
            Card4["Avg Queue Wait\n 14.2 Mins \n (-8.1%)"]
        end
        
        subgraph ChartsGrid ["Analytical Visualization Charts"]
            Chart1["[ Trend Line: Patient Volume ]\nJan [===] Feb [=====] Mar [========]"]
            Chart2["[ Pie Chart: ER Triage Breakdown ]\nCritical (15%) | High (25%) | Med (40%) | Low (20%)"]
            Chart3["[ Bar Chart: Lab Test Distribution ]\nCBC [=======] LFT [=====] RFT [===]"]
        end
        
        subgraph ExportOptions ["Export & Report Scheduler"]
            ExpBtns["[ Export PDF ]  [ Export Excel ]  [ Export CSV ]"]
            ScheduleReport["Schedule Weekly Delivery to:\n[ admin.reports@hospital.com ] [ Set Schedule ]"]
        end
    end
```
