import React, { useState } from 'react';
import { 
  Activity, 
  ArrowRight, 
  Database, 
  Server, 
  Shield, 
  Users, 
  FlaskConical, 
  CreditCard, 
  Stethoscope, 
  Terminal,
  HelpCircle,
  CheckCircle2,
  Workflow,
  Cpu,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

export default function WorkflowExplorer() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'flows' | 'datamodel' | 'simulator'>('architecture');
  const [selectedArchNode, setSelectedArchNode] = useState<string | null>('gateway');
  const [activeFlowId, setActiveFlowId] = useState<string>('intake-triage');
  const [simStep, setSimStep] = useState<number>(0);
  const [simLogs, setSimLogs] = useState<string[]>([
    '[INIT] System initialized in Offline Fallback (JSON mode)...',
    '[DB] Loaded 7 users, 2 patients, 3 lab orders, 2 invoices.'
  ]);

  // Tab definitions
  const tabs = [
    { id: 'architecture', label: 'System Architecture', icon: Layers },
    { id: 'flows', label: 'Feature Workflows', icon: Workflow },
    { id: 'datamodel', label: 'Data Relationships', icon: Database },
    { id: 'simulator', label: 'Interactive Simulator', icon: Cpu }
  ] as const;

  // Architecture Nodes Details
  const archNodes = {
    client: {
      title: 'React SPA Client (Vite)',
      tech: 'React 18, TypeScript, Tailwind CSS, Lucide React, Zustand',
      description: 'Single Page Application providing role-based interfaces with glassmorphic dashboards. Authenticates using signed JWT headers.',
      security: 'Tokens stored in memory/Zustand store; protected routing guards paths based on authenticated user roles.'
    },
    gateway: {
      title: 'Express API Gateway',
      tech: 'Express.js, TypeScript, helmet, express-rate-limit, cors',
      description: 'Central request controller that implements security middlewares, sanitizes inputs, and routes requests to specific modules.',
      security: 'Global rate limiting (100 requests per 15m), specialized authentication limiters (5 logins per 15m), and CORS protection.'
    },
    auth: {
      title: 'JWT Auth & RBAC Middleware',
      tech: 'jsonwebtoken, bcrypt',
      description: 'Intercepts requests, validates authorization headers containing JWTs, and injects user profile context into request variables.',
      security: 'Role-Based Access Control (RBAC) verifies if the user\'s role matches the API endpoint\'s permitted scopes.'
    },
    db: {
      title: 'Dual-Mode Database Layer',
      tech: 'pg (node-postgres), fs (File System), bcrypt',
      description: 'Automatically detects if PostgreSQL database connection is available. If PostgreSQL is offline, falls back transparently to local file-based JSON storage (`db.json`) keeping the platform fully functional.',
      security: 'Passwords pre-hashed with bcrypt (12 rounds) on creation and matching. Prevents data corruption during fallback transitions.'
    }
  };

  // Process Flows
  const workflows = [
    {
      id: 'intake-triage',
      title: '1. Front Desk Intake & Nurse Triage',
      steps: [
        {
          role: 'Front Desk Officer',
          action: 'Patient Search & Registration',
          details: 'Search by CNIC or Passport. If new patient, register details with consent checkbox and photo URL. System auto-generates Medical Record Number (MRN-YYYY-XXXXX).'
        },
        {
          role: 'Reception Officer',
          action: 'Select Visit & Queue Assignment',
          details: 'Selects visit type (OPD, Emergency, or Follow-up), assigns a consultation doctor & department, then places them in the digital queue.'
        },
        {
          role: 'Triage Nurse',
          action: 'Collect Vitals & Classify Urgency',
          details: 'Takes vitals (BP, heart rate, temp, SpO2, respiratory rate) and assigns triage priority level (Critical, High, Medium, Low) using Glasgow Coma Scale.'
        },
        {
          role: 'Emergency Doctor',
          action: 'Physician Review & Clinical Signing',
          details: 'Views active triage list, selects critical patients first, records findings (chief complaints, SOAP notes), and signs EMR record.'
        }
      ]
    },
    {
      id: 'lims-flow',
      title: '2. LIMS (Laboratory Investigation & Validation)',
      steps: [
        {
          role: 'Emergency Doctor',
          action: 'Place Investigation Order',
          details: 'Adds order specifying desired tests (e.g. CBC, ALT, Dengue NS1), status initializes as "Ordered".'
        },
        {
          role: 'Lab Technician',
          action: 'Sample Collection & Labeling',
          details: 'Collects whole blood/serum sample. Generates tracking sample number (SMP-YYYYMMDD-XX) and changes status to "Sample Collected".'
        },
        {
          role: 'Lab Technician',
          action: 'Enter Lab Findings',
          details: 'Analyzes sample, inputs findings against standard reference ranges, flags critical values, and submits for supervisor verification.'
        },
        {
          role: 'Lab Supervisor',
          action: 'Validate & Authorize Results',
          details: 'Reviews critical flags, validates credentials, signs off. Automatically makes results visible to Ordering Doctor.'
        }
      ]
    },
    {
      id: 'billing-flow',
      title: '3. Financial Invoicing & Auto-Queuing',
      steps: [
        {
          role: 'Front Desk Officer',
          action: 'Generate Invoice',
          details: 'Compiles consultation prices & lab tests. Calculates net amount after optional discounts.'
        },
        {
          role: 'Finance Officer',
          action: 'Process Payment',
          details: 'Records payment (Cash, Card, Digital Transfer), registers transaction reference, marks invoice status as "Paid".'
        },
        {
          role: 'Automated System',
          action: 'Trigger Queue Placement',
          details: 'Upon payment detection, the system triggers webhook logic: generates a Queue Token (e.g., GENMED-004) and queues the patient automatically.'
        }
      ]
    }
  ];

  // Simulator steps
  const simSteps = [
    {
      title: 'Register Patient & Generate MRN',
      code: 'POST /api/v1/patients',
      run: () => {
        const id = 'p-' + Math.random().toString(36).substring(2, 6);
        const mrn = `MRN-2026-00${Math.floor(Math.random() * 900 + 100)}`;
        logSim(`[CLIENT] Sent registration request for "Imran Khan"`);
        logSim(`[API] Validated schema: cnic, phone, consent check OK`);
        logSim(`[DB] Patient saved. Assigned MRN: ${mrn}`);
        return { patientId: id, mrn };
      }
    },
    {
      title: 'Create Billable Invoice',
      code: 'POST /api/v1/billing/invoices',
      run: () => {
        logSim(`[CLIENT] Created consultation invoice for 1500 PKR`);
        logSim(`[API] Invoicing controller generated invoice ID: inv-99382`);
        logSim(`[DB] Invoice written to disk in fallback storage. Status: Unpaid`);
      }
    },
    {
      title: 'Capture Payment & Trigger Webhook',
      code: 'POST /api/v1/billing/payments',
      run: () => {
        logSim(`[CLIENT] Captured Cash Payment of 1500 PKR for inv-99382`);
        logSim(`[API] Payment updated to "Paid". Webhook listener fired!`);
        logSim(`[WEBHOOK] Auto-Queue: Generating Consultation Token...`);
        logSim(`[DB] Created Queue Item "GENMED-009" for Dr. House. Status: Waiting`);
      }
    },
    {
      title: 'Conduct Nurse Emergency Triage',
      code: 'POST /api/v1/emergency/triage',
      run: () => {
        logSim(`[CLIENT] Nurse Jane Foster entered vitals: SpO2 91%, Pulse 118`);
        logSim(`[API] Evaluated Triage Matrix. SpO2 < 92% -> Critical Urgency`);
        logSim(`[DB] Triage saved. Emergency queue updated.`);
        logSim(`[AUDIT] Action: "TRIAGE_COMPLETE" on triage-128`);
      }
    },
    {
      title: 'Physician SOAP Entry & Sign EMR',
      code: 'POST /api/v1/emr/visits',
      run: () => {
        logSim(`[CLIENT] Dr. House submitted clinical SOAP & prescription`);
        logSim(`[API] MD signature verified via JWT checksum`);
        logSim(`[DB] Visit finalized. Encounter locked to protect audit integrity.`);
        logSim(`[SUCCESS] Simulation Workflow Completed! 🎉`);
      }
    }
  ];

  const logSim = (msg: string) => {
    setSimLogs(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);
  };

  const executeNextSimStep = () => {
    if (simStep >= simSteps.length) {
      setSimStep(0);
      setSimLogs([
        '[INIT] Simulator reset.',
        '[DB] Loaded 7 users, 2 patients, 3 lab orders, 2 invoices.'
      ]);
      return;
    }
    const current = simSteps[simStep];
    current.run();
    setSimStep(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-850 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md">
              Developer Visualizer
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Platform Workflow & Architecture</h1>
          <p className="text-slate-400 text-sm mt-1">
            An interactive blueprint mapping the system topology, clinical states, database schemas, and micro-transaction logs.
          </p>
        </div>
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/15' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content - System Architecture */}
      {activeTab === 'architecture' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Visual Architecture Chart */}
          <div className="lg:col-span-2 bg-slate-850 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[450px]">
            <div>
              <h2 className="font-bold text-white text-base">Interactive Infrastructure Pipeline</h2>
              <p className="text-xs text-slate-400 mt-0.5">Click any component to inspect its implementation parameters</p>
            </div>

            <div className="my-8 flex flex-col md:flex-row items-center justify-between gap-6 relative px-4">
              
              {/* Client SPA Node */}
              <button 
                onClick={() => setSelectedArchNode('client')}
                className={`relative w-full md:w-36 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  selectedArchNode === 'client'
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-md ring-2 ring-cyan-500/30'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Terminal className="h-6 w-6" />
                <span className="text-xs font-extrabold text-center">React SPA Client</span>
                <span className="text-[8px] bg-slate-900 px-1 py-0.5 rounded text-slate-400">Port 3001</span>
              </button>

              <ArrowRight className="h-5 w-5 text-slate-600 hidden md:block" />

              {/* Express API Node */}
              <button 
                onClick={() => setSelectedArchNode('gateway')}
                className={`relative w-full md:w-36 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  selectedArchNode === 'gateway'
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-md ring-2 ring-cyan-500/30'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Server className="h-6 w-6" />
                <span className="text-xs font-extrabold text-center">Express Gateway</span>
                <span className="text-[8px] bg-slate-900 px-1 py-0.5 rounded text-slate-400">Port 5000</span>
              </button>

              <ArrowRight className="h-5 w-5 text-slate-600 hidden md:block" />

              {/* RBAC Mid Node */}
              <button 
                onClick={() => setSelectedArchNode('auth')}
                className={`relative w-full md:w-36 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  selectedArchNode === 'auth'
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-md ring-2 ring-cyan-500/30'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Shield className="h-6 w-6" />
                <span className="text-xs font-extrabold text-center">RBAC & Token Validation</span>
                <span className="text-[8px] bg-emerald-500/15 text-emerald-400 px-1 py-0.5 rounded">Middleware</span>
              </button>

              <ArrowRight className="h-5 w-5 text-slate-600 hidden md:block" />

              {/* Database Layer */}
              <button 
                onClick={() => setSelectedArchNode('db')}
                className={`relative w-full md:w-36 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  selectedArchNode === 'db'
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-md ring-2 ring-cyan-500/30'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Database className="h-6 w-6" />
                <span className="text-xs font-extrabold text-center">Dual-Mode DB Layer</span>
                <span className="text-[8px] bg-indigo-500/15 text-indigo-400 px-1 py-0.5 rounded">Postgres/JSON</span>
              </button>

            </div>

            {/* Micro details panel for dual-mode DB */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-300">
                <ArrowRightLeft className="h-4 w-4 text-cyan-400" />
                <span>
                  <strong>Database Online Auto-Discovery Mode:</strong> When PostgreSQL is running, it performs table syncing. When offline, it switches to <code>data/db.json</code>.
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1 shrink-0 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                Active Fallback Active
              </span>
            </div>
          </div>

          {/* Details sidecard */}
          <div className="bg-slate-850 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
            {selectedArchNode && archNodes[selectedArchNode as keyof typeof archNodes] ? (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Selected Blueprint Node</span>
                  <h3 className="text-lg font-black text-white">{archNodes[selectedArchNode as keyof typeof archNodes].title}</h3>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Technology Stack</h4>
                  <p className="text-xs text-cyan-300 font-mono mt-1 bg-slate-900/80 p-2 rounded border border-slate-800">
                    {archNodes[selectedArchNode as keyof typeof archNodes].tech}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Functional Role</h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">
                    {archNodes[selectedArchNode as keyof typeof archNodes].description}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Security Integrity</h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">
                    {archNodes[selectedArchNode as keyof typeof archNodes].security}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                <HelpCircle className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-xs">Click a pipeline component node to inspect details.</p>
              </div>
            )}

            <div className="text-[11px] text-slate-500 italic mt-6 border-t border-slate-800 pt-3">
              * The architecture satisfies local on-premise constraints (requiring zero external internet lookup dependency for offline functionality).
            </div>
          </div>

        </div>
      )}

      {/* Tab Content - Feature Workflows */}
      {activeTab === 'flows' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Navigation panel */}
          <div className="space-y-2">
            {workflows.map(flow => (
              <button
                key={flow.id}
                onClick={() => setActiveFlowId(flow.id)}
                className={`w-full text-left p-4 rounded-xl border font-bold text-sm transition-all flex items-center justify-between ${
                  activeFlowId === flow.id
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-md'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{flow.title.split('. ')[1]}</span>
                <ArrowRight className="h-4 w-4 shrink-0 ml-2" />
              </button>
            ))}
          </div>

          {/* Chronological Stepper */}
          <div className="md:col-span-3 bg-slate-850 p-6 rounded-2xl border border-slate-800 space-y-6">
            {workflows.find(f => f.id === activeFlowId) && (
              <>
                <div>
                  <h2 className="font-bold text-white text-base">
                    {workflows.find(f => f.id === activeFlowId)?.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Step-by-step transaction walkthrough</p>
                </div>

                <div className="relative border-l border-slate-800 pl-6 ml-4 space-y-8">
                  {workflows.find(f => f.id === activeFlowId)?.steps.map((step, idx) => (
                    <div key={idx} className="relative">
                      {/* Stepper Dot */}
                      <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-cyan-500 text-[10px] font-black text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        {idx + 1}
                      </span>
                      
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 hover:border-slate-750 transition-colors">
                        <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
                          <h4 className="text-xs font-black text-white uppercase font-mono tracking-wider">
                            {step.action}
                          </h4>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                            {step.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-350 leading-relaxed">{step.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* Tab Content - Data Model Relationships */}
      {activeTab === 'datamodel' && (
        <div className="bg-slate-850 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div>
            <h2 className="font-bold text-white text-base">Logical Schema Hierarchy</h2>
            <p className="text-xs text-slate-400 mt-0.5">Core data entities representing relations across operations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Patient Entity */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 border-b border-slate-800 pb-2">
                <Users className="h-4 w-4" />
                <h4 className="text-xs font-bold text-white">patients</h4>
              </div>
              <ul className="text-[10.5px] text-slate-400 space-y-1.5 font-mono">
                <li><strong className="text-slate-300">id</strong> : UUID</li>
                <li><strong className="text-slate-300">mrn</strong> : VARCHAR(Unique)</li>
                <li><strong className="text-slate-300">full_name</strong> : VARCHAR</li>
                <li><strong className="text-slate-300">cnic</strong> : VARCHAR(Unique)</li>
                <li><strong className="text-slate-300">blood_group</strong> : VARCHAR</li>
                <li><strong className="text-slate-300">consent_accepted</strong> : BOOLEAN</li>
              </ul>
            </div>

            {/* Emergency Intake Entity */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800 pb-2">
                <Activity className="h-4 w-4" />
                <h4 className="text-xs font-bold text-white font-mono">emergency_intakes</h4>
              </div>
              <ul className="text-[10.5px] text-slate-400 space-y-1.5 font-mono">
                <li><strong className="text-slate-300">id</strong> : UUID</li>
                <li><strong className="text-slate-300">patient_id</strong> : UUID (FK: patients)</li>
                <li><strong className="text-slate-300">temporary_name</strong> : VARCHAR</li>
                <li><strong className="text-slate-300">mode_of_arrival</strong> : VARCHAR</li>
                <li><strong className="text-slate-300">initial_condition</strong> : TEXT</li>
                <li><strong className="text-slate-300">status</strong> : VARCHAR</li>
              </ul>
            </div>

            {/* LIMS lab_orders Entity */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2">
                <FlaskConical className="h-4 w-4" />
                <h4 className="text-xs font-bold text-white font-mono">lab_orders</h4>
              </div>
              <ul className="text-[10.5px] text-slate-400 space-y-1.5 font-mono">
                <li><strong className="text-slate-300">id</strong> : UUID</li>
                <li><strong className="text-slate-300">patient_id</strong> : UUID (FK: patients)</li>
                <li><strong className="text-slate-300">ordering_doctor_id</strong> : UUID</li>
                <li><strong className="text-slate-300">status</strong> : VARCHAR</li>
                <li><strong className="text-slate-300">verified_by</strong> : UUID</li>
              </ul>
            </div>

            {/* Invoicing billing_invoices Entity */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 border-b border-slate-800 pb-2">
                <CreditCard className="h-4 w-4" />
                <h4 className="text-xs font-bold text-white font-mono">billing_invoices</h4>
              </div>
              <ul className="text-[10.5px] text-slate-400 space-y-1.5 font-mono">
                <li><strong className="text-slate-300">id</strong> : UUID</li>
                <li><strong className="text-slate-300">patient_id</strong> : UUID (FK: patients)</li>
                <li><strong className="text-slate-300">total_amount</strong> : NUMERIC</li>
                <li><strong className="text-slate-300">discount_amount</strong> : NUMERIC</li>
                <li><strong className="text-slate-300">net_amount</strong> : NUMERIC</li>
                <li><strong className="text-slate-300">payment_status</strong> : VARCHAR</li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* Tab Content - Live Simulator */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Controls Panel */}
          <div className="bg-slate-850 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[400px]">
            <div className="space-y-4">
              <div>
                <h2 className="font-bold text-white text-base">Step-by-step API Simulator</h2>
                <p className="text-xs text-slate-400 mt-0.5">Trigger mock lifecycle requests to trace route behaviors</p>
              </div>

              <div className="space-y-3">
                {simSteps.map((step, idx) => {
                  const isPast = idx < simStep;
                  const isCurrent = idx === simStep;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        isCurrent 
                          ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 font-extrabold'
                          : isPast
                            ? 'bg-slate-900/50 border-slate-800 text-slate-500'
                            : 'bg-slate-900 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isPast ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <span className={`h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            isCurrent ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {idx + 1}
                          </span>
                        )}
                        <span>{step.title}</span>
                      </div>
                      <span className="font-mono text-[9px] opacity-75">{step.code}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={executeNextSimStep}
              className="w-full flex items-center justify-center gap-2 mt-6 py-3 bg-cyan-500 hover:bg-cyan-450 text-slate-950 font-black rounded-xl text-xs transition-colors"
            >
              <span>{simStep >= simSteps.length ? 'Reset Simulation' : 'Execute Step'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Console Output Logger */}
          <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between font-mono">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-500 animate-ping"></span>
                  <span>System Console Outputs</span>
                </h3>
                <span className="text-[10px] text-slate-500">development mode</span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[300px] text-xs text-slate-350 scrollbar-thin">
                {simLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-cyan-600 shrink-0 select-none">&gt;</span>
                    <span className={log.includes('[SUCCESS]') ? 'text-emerald-400 font-bold' : log.includes('[API]') ? 'text-cyan-300' : ''}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-[10px] text-slate-500 italic mt-6 border-t border-slate-800/80 pt-3">
              * Audit logs are appended internally with hash checksums to protect patients records from modification.
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
