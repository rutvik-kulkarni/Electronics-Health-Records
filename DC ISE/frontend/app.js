// EHR Dashboard JavaScript Application (Revised)

/* eslint-disable no-unused-vars */
/* global Chart */

// -------- SAMPLE DATA (provided) -------- //
const ehrData = {
  patients: [
    {
      patient_id: "PAT_001",
      demographics: {
        first_name: "John",
        last_name: "Smith",
        date_of_birth: "1985-03-15",
        age: 38,
        gender: "Male",
        blood_type: "A+",
        address: "123 Main Street, Austin, TX 73301",
        phone: "555-0123",
        email: "john.smith@email.com",
        emergency_contact: {
          name: "Jane Smith",
          relationship: "Spouse",
          phone: "555-0124"
        }
      },
      medical_history: [
        {
          condition: "Hypertension",
          diagnosed_date: "2020-05-15",
          status: "Active",
          severity: "Mild"
        },
        {
          condition: "Diabetes Type 2",
          diagnosed_date: "2019-08-22",
          status: "Active",
          severity: "Moderate"
        }
      ],
      prescriptions: [
        {
          medication: "Metformin",
          dosage: "500mg",
          frequency: "Twice daily",
          prescribed_date: "2019-08-22",
          prescribing_doctor: "Dr. Williams",
          status: "Active"
        },
        {
          medication: "Lisinopril",
          dosage: "10mg",
          frequency: "Once daily",
          prescribed_date: "2020-05-15",
          prescribing_doctor: "Dr. Johnson",
          status: "Active"
        }
      ],
      lab_reports: [
        {
          test_date: "2023-09-01",
          test_type: "Blood Panel",
          results: {
            glucose: "95 mg/dL",
            cholesterol: "180 mg/dL",
            blood_pressure: "130/85 mmHg",
            hemoglobin: "14.2 g/dL"
          },
          ordered_by: "Dr. Williams"
        }
      ],
      visits: [
        {
          visit_date: "2023-09-01",
          visit_type: "Regular Checkup",
          doctor: "Dr. Williams",
          chief_complaint: "Routine diabetes and hypertension monitoring",
          diagnosis: "Diabetes Type 2, Hypertension",
          treatment_plan: "Continue current medications, diet counseling"
        }
      ]
    },
    {
      patient_id: "PAT_002",
      demographics: {
        first_name: "Sarah",
        last_name: "Johnson",
        date_of_birth: "1992-07-20",
        age: 31,
        gender: "Female",
        blood_type: "O-",
        address: "456 Oak Avenue, Dallas, TX 75201",
        phone: "555-0234",
        email: "sarah.johnson@email.com",
        emergency_contact: {
          name: "Michael Johnson",
          relationship: "Husband",
          phone: "555-0235"
        }
      },
      medical_history: [
        {
          condition: "Asthma",
          diagnosed_date: "2010-03-10",
          status: "Active",
          severity: "Mild"
        }
      ],
      prescriptions: [
        {
          medication: "Albuterol Inhaler",
          dosage: "90mcg",
          frequency: "As needed",
          prescribed_date: "2023-01-15",
          prescribing_doctor: "Dr. Brown",
          status: "Active"
        }
      ],
      lab_reports: [
        {
          test_date: "2023-08-10",
          test_type: "Complete Blood Count",
          results: {
            white_blood_cells: "7.2 K/uL",
            red_blood_cells: "4.8 M/uL",
            hemoglobin: "13.8 g/dL",
            platelets: "320 K/uL"
          },
          ordered_by: "Dr. Brown"
        }
      ],
      visits: [
        {
          visit_date: "2023-08-10",
          visit_type: "Follow-up",
          doctor: "Dr. Brown",
          chief_complaint: "Asthma management",
          diagnosis: "Asthma, well controlled",
          treatment_plan: "Continue current inhaler, avoid triggers"
        }
      ]
    },
    {
      patient_id: "PAT_003",
      demographics: {
        first_name: "Robert",
        last_name: "Davis",
        date_of_birth: "1978-11-05",
        age: 45,
        gender: "Male",
        blood_type: "B+",
        address: "789 Pine Street, Houston, TX 77001",
        phone: "555-0345",
        email: "robert.davis@email.com",
        emergency_contact: {
          name: "Linda Davis",
          relationship: "Wife",
          phone: "555-0346"
        }
      },
      medical_history: [
        {
          condition: "High Cholesterol",
          diagnosed_date: "2021-02-18",
          status: "Active",
          severity: "Moderate"
        },
        {
          condition: "Gastroesophageal Reflux Disease",
          diagnosed_date: "2022-06-12",
          status: "Active",
          severity: "Mild"
        }
      ],
      prescriptions: [
        {
          medication: "Atorvastatin",
          dosage: "20mg",
          frequency: "Once daily",
          prescribed_date: "2021-02-18",
          prescribing_doctor: "Dr. Martinez",
          status: "Active"
        },
        {
          medication: "Omeprazole",
          dosage: "20mg",
          frequency: "Once daily before breakfast",
          prescribed_date: "2022-06-12",
          prescribing_doctor: "Dr. Lee",
          status: "Active"
        }
      ],
      lab_reports: [
        {
          test_date: "2023-07-25",
          test_type: "Lipid Panel",
          results: {
            total_cholesterol: "195 mg/dL",
            ldl_cholesterol: "115 mg/dL",
            hdl_cholesterol: "45 mg/dL",
            triglycerides: "175 mg/dL"
          },
          ordered_by: "Dr. Martinez"
        }
      ],
      visits: [
        {
          visit_date: "2023-07-25",
          visit_type: "Follow-up",
          doctor: "Dr. Martinez",
          chief_complaint: "Cholesterol management follow-up",
          diagnosis: "Hyperlipidemia, improving",
          treatment_plan: "Continue statin therapy, dietary modification"
        }
      ]
    }
  ]
};

// ---------- GLOBALS ---------- //
let currentPatient = null;
let filteredPatients = [];
const charts = {};

// ---------- INITIALISE APP ---------- //
document.addEventListener("DOMContentLoaded", () => {
  try {
    initialiseApp();
  } catch (err) {
    console.error("App initialisation error", err);
  }
});

function initialiseApp() {
  filteredPatients = [...ehrData.patients];

  initNavigation();
  initEventListeners();

  updateDashboardStats();
  createAllCharts();

  populateFilterOptions();
  renderPatientList();

  showSection("dashboard");
}

// ---------- NAVIGATION ---------- //
function initNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.section;
      showSection(target);
      navBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function showSection(id) {
  document.querySelectorAll(".section").forEach((sec) => {
    sec.classList.toggle("active", sec.id === id);
  });
}

// ---------- DASHBOARD ---------- //
function updateDashboardStats() {
  const total = ehrData.patients.length;
  const prescriptions = ehrData.patients.reduce(
    (s, p) => s + p.prescriptions.filter((x) => x.status === "Active").length,
    0
  );
  const labs = ehrData.patients.reduce((s, p) => s + p.lab_reports.length, 0);
  const visits = ehrData.patients.reduce((s, p) => s + p.visits.length, 0);

  setText("total-patients", total);
  setText("active-prescriptions", prescriptions);
  setText("recent-labs", labs);
  setText("recent-visits", visits);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ---------- CHARTS ---------- //
function createAllCharts() {
  createDemographicsChart();
  createConditionsChart();
  createAgeChart();
  createMedicationChart();
}

function createDemographicsChart() {
  const ctx = document.getElementById("demographics-chart");
  if (!ctx) return;
  const genderCounts = ehrData.patients.reduce((acc, p) => {
    acc[p.demographics.gender] = (acc[p.demographics.gender] || 0) + 1;
    return acc;
  }, {});
  charts.gender = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(genderCounts),
      datasets: [
        {
          data: Object.values(genderCounts),
          backgroundColor: ["#1FB8CD", "#FFC185", "#B4413C"]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function createConditionsChart() {
  const ctx = document.getElementById("conditions-chart");
  if (!ctx) return;
  const conditionCounts = {};
  ehrData.patients.forEach((p) => {
    p.medical_history.forEach((c) => {
      if (c.status === "Active") conditionCounts[c.condition] = (conditionCounts[c.condition] || 0) + 1;
    });
  });
  charts.conditions = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(conditionCounts),
      datasets: [
        {
          label: "Active Cases",
          data: Object.values(conditionCounts),
          backgroundColor: ["#1FB8CD", "#FFC185", "#B4413C", "#ECEBD5", "#5D878F"]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

function createAgeChart() {
  const ctx = document.getElementById("age-distribution-chart");
  if (!ctx) return;
  const groups = { "18-30": 0, "31-45": 0, "46-60": 0, "60+": 0 };
  ehrData.patients.forEach((p) => {
    const a = p.demographics.age;
    if (a <= 30) groups["18-30"]++;
    else if (a <= 45) groups["31-45"]++;
    else if (a <= 60) groups["46-60"]++;
    else groups["60+"]++;
  });
  charts.age = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(groups),
      datasets: [
        {
          data: Object.values(groups),
          backgroundColor: ["#1FB8CD", "#FFC185", "#B4413C", "#ECEBD5"]
        }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
  });
}

function createMedicationChart() {
  const ctx = document.getElementById("medication-chart");
  if (!ctx) return;
  const medCounts = {};
  ehrData.patients.forEach((p) => {
    p.prescriptions.forEach((pr) => {
      if (pr.status === "Active") medCounts[pr.medication] = (medCounts[pr.medication] || 0) + 1;
    });
  });
  charts.medication = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(medCounts),
      datasets: [
        {
          label: "Prescriptions",
          data: Object.values(medCounts),
          backgroundColor: ["#1FB8CD", "#FFC185", "#B4413C", "#ECEBD5", "#5D878F"]
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

// ---------- PATIENT LIST ---------- //
function populateFilterOptions() {
  const conditionSelect = document.getElementById("filter-condition");
  const conditions = new Set();
  ehrData.patients.forEach((p) => p.medical_history.forEach((c) => conditions.add(c.condition)));
  conditions.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    conditionSelect.appendChild(opt);
  });
}

function renderPatientList() {
  const container = document.getElementById("patient-list-body");
  if (!container) return;

  if (filteredPatients.length === 0) {
    container.innerHTML = `<div class="empty-state"><h3>No patients found</h3><p>Try adjusting filters or add a new patient.</p></div>`;
    return;
  }

  container.innerHTML = "";
  filteredPatients.forEach((p) => {
    const row = document.createElement("div");
    row.className = "patient-list__row";
    row.innerHTML = `
      <div class="patient-list__cell">${p.patient_id}</div>
      <div class="patient-list__cell">${p.demographics.first_name} ${p.demographics.last_name}</div>
      <div class="patient-list__cell">${p.demographics.age}</div>
      <div class="patient-list__cell">${p.demographics.gender}</div>
      <div class="patient-list__cell">${p.demographics.phone}</div>
      <div class="patient-list__cell">
        <div class="patient-actions">
          <button class="btn btn--xs btn--primary" data-view-id="${p.patient_id}">View</button>
        </div>
      </div>`;
    container.appendChild(row);
  });

  // Attach view listeners
  container.querySelectorAll("[data-view-id]").forEach((btn) => {
    btn.addEventListener("click", () => viewPatient(btn.dataset.viewId));
  });
}

function filterPatients() {
  const gender = document.getElementById("filter-gender").value;
  const condition = document.getElementById("filter-condition").value;
  const keyword = document.getElementById("patient-search").value.trim().toLowerCase();

  filteredPatients = ehrData.patients.filter((p) => {
    const gMatch = !gender || p.demographics.gender === gender;
    const cMatch = !condition || p.medical_history.some((c) => c.condition === condition);
    const kMatch = !keyword || [
      p.patient_id,
      p.demographics.first_name,
      p.demographics.last_name
    ].some((v) => v.toLowerCase().includes(keyword));
    return gMatch && cMatch && kMatch;
  });
  renderPatientList();
}

// ---------- SEARCH ---------- //
function globalSearch() {
  const kw = document.getElementById("global-search").value.trim().toLowerCase();
  if (!kw) return alert("Enter search term");
  filteredPatients = ehrData.patients.filter((p) => {
    return (
      p.patient_id.toLowerCase().includes(kw) ||
      p.demographics.first_name.toLowerCase().includes(kw) ||
      p.demographics.last_name.toLowerCase().includes(kw) ||
      p.medical_history.some((c) => c.condition.toLowerCase().includes(kw))
    );
  });
  showSection("patients");
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector('[data-section="patients"]').classList.add("active");
  renderPatientList();
}

// ---------- PATIENT DETAIL MODAL ---------- //
function viewPatient(id) {
  currentPatient = ehrData.patients.find((p) => p.patient_id === id);
  if (!currentPatient) return;
  fillPatientModal();
  openModal("patient-modal");
}

function fillPatientModal() {
  const p = currentPatient;
  setText("modal-patient-name", `${p.demographics.first_name} ${p.demographics.last_name}`);
  setText("demo-patient-id", p.patient_id);
  setText("demo-dob", p.demographics.date_of_birth);
  setText("demo-blood-type", p.demographics.blood_type);
  setText("demo-phone", p.demographics.phone);
  setText("demo-email", p.demographics.email);
  setText("demo-address", p.demographics.address);
  setText("emergency-name", p.demographics.emergency_contact.name);
  setText("emergency-relationship", p.demographics.emergency_contact.relationship);
  setText("emergency-phone", p.demographics.emergency_contact.phone);

  populateMedicalHistory();
  populatePrescriptions();
  populateLabReports();
  populateVisits();

  // Reset tabs
  switchTab("demographics");
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector('[data-tab="demographics"]').classList.add("active");
}

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
  document.body.style.overflow = "auto";
}

// ---------- POPULATE TABS ---------- //
function populateMedicalHistory() {
  const wrap = document.getElementById("medical-history-list");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (currentPatient.medical_history.length === 0) {
    wrap.innerHTML = `<div class="empty-state">No medical history</div>`;
    return;
  }
  currentPatient.medical_history.forEach((c) => {
    wrap.appendChild(renderMedicalItem({
      title: c.condition,
      status: c.status,
      details: {
        Diagnosed: c.diagnosed_date,
        Severity: c.severity
      }
    }));
  });
}

function populatePrescriptions() {
  const wrap = document.getElementById("prescriptions-list");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (currentPatient.prescriptions.length === 0) {
    wrap.innerHTML = `<div class="empty-state">No prescriptions</div>`;
    return;
  }
  currentPatient.prescriptions.forEach((pr) => {
    wrap.appendChild(
      renderMedicalItem({
        title: pr.medication,
        status: pr.status,
        details: {
          Dosage: pr.dosage,
          Frequency: pr.frequency,
          "Prescribed On": pr.prescribed_date,
          Doctor: pr.prescribing_doctor
        }
      })
    );
  });
}

function populateLabReports() {
  const wrap = document.getElementById("lab-reports-list");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (currentPatient.lab_reports.length === 0) {
    wrap.innerHTML = `<div class="empty-state">No lab reports</div>`;
    return;
  }
  currentPatient.lab_reports.forEach((lr) => {
    wrap.appendChild(
      renderMedicalItem({
        title: lr.test_type,
        status: lr.test_date,
        details: { ...lr.results, "Ordered By": lr.ordered_by }
      })
    );
  });
}

function populateVisits() {
  const wrap = document.getElementById("visits-list");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (currentPatient.visits.length === 0) {
    wrap.innerHTML = `<div class="empty-state">No visit records</div>`;
    return;
  }
  currentPatient.visits.forEach((v) => {
    wrap.appendChild(
      renderMedicalItem({
        title: v.visit_type,
        status: v.visit_date,
        details: {
          Doctor: v.doctor,
          "Chief Complaint": v.chief_complaint,
          Diagnosis: v.diagnosis,
          "Treatment Plan": v.treatment_plan
        }
      })
    );
  });
}

function renderMedicalItem({ title, status, details }) {
  const div = document.createElement("div");
  div.className = "medical-item";
  const detailsHTML = Object.entries(details)
    .map(([k, v]) => `<div class="medical-item__detail"><strong>${k}:</strong><span>${v}</span></div>`)
    .join("");
  div.innerHTML = `
    <div class="medical-item__header">
      <h5 class="medical-item__title">${title}</h5>
      <span class="status status--info">${status}</span>
    </div>
    <div class="medical-item__details">${detailsHTML}</div>`;
  return div;
}

// ---------- ADD PATIENT ---------- //
function calculateAge(dob) {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function addPatient(form) {
  const fd = new FormData(form);
  const id = `PAT_${String(ehrData.patients.length + 1).padStart(3, "0")}`;
  const patient = {
    patient_id: id,
    demographics: {
      first_name: fd.get("first_name"),
      last_name: fd.get("last_name"),
      date_of_birth: fd.get("date_of_birth"),
      age: calculateAge(fd.get("date_of_birth")),
      gender: fd.get("gender"),
      blood_type: fd.get("blood_type") || "Unknown",
      address: fd.get("address"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      emergency_contact: { name: "", relationship: "", phone: "" }
    },
    medical_history: [],
    prescriptions: [],
    lab_reports: [],
    visits: []
  };
  ehrData.patients.push(patient);
  filteredPatients = [...ehrData.patients];
  updateDashboardStats();
  renderPatientList();
  closeModal("add-patient-modal");
  alert("Patient added successfully");
}

// ---------- EVENTS ---------- //
function initEventListeners() {
  // Search
  document.querySelector(".search-btn").addEventListener("click", globalSearch);
  document.getElementById("global-search").addEventListener("keypress", (e) => {
    if (e.key === "Enter") globalSearch();
  });

  // Filters
  ["filter-gender", "filter-condition", "patient-search"].forEach((id) => {
    document.getElementById(id).addEventListener(id === "patient-search" ? "input" : "change", filterPatients);
  });

  // Patient modal close
  document.getElementById("close-modal").addEventListener("click", () => closeModal("patient-modal"));
  document.getElementById("patient-modal").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal__overlay")) closeModal("patient-modal");
  });

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Add patient modal
  document.getElementById("add-patient-btn").addEventListener("click", () => openModal("add-patient-modal"));
  document.getElementById("close-add-patient-modal").addEventListener("click", () => closeModal("add-patient-modal"));
  document.getElementById("cancel-add-patient").addEventListener("click", () => closeModal("add-patient-modal"));
  document.getElementById("add-patient-modal").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal__overlay")) closeModal("add-patient-modal");
  });
  document.getElementById("add-patient-form").addEventListener("submit", (e) => {
    e.preventDefault();
    addPatient(e.target);
  });
}

// ---------- TABS ---------- //
function switchTab(name) {
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.toggle("active", c.id === `${name}-tab`));
}
