const STORAGE_KEY = 'levvate_onboarding_draft_v1';
const TOTAL_STEPS = 4;
const stepLabels = ['Company', 'Goals', 'Setup', 'Review'];

const form = document.getElementById('onboardingForm');
const steps = Array.from(document.querySelectorAll('.step'));
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const stepPills = document.getElementById('stepPills');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const reviewPanel = document.getElementById('reviewPanel');
const eventLog = document.getElementById('eventLog');

let currentStep = 1;
let draft = loadDraft();

function init() {
  renderStepPills();
  populateForm();
  bindAutosave();
  render();
  logEvent('Draft loaded from local storage.');
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { completed: false, formData: {} };
  } catch {
    return { completed: false, formData: {} };
  }
}

function saveDraft() {
  const data = new FormData(form);
  const formData = Object.fromEntries(data.entries());
  draft.formData = { ...draft.formData, ...formData };
  draft.lastSavedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function populateForm() {
  Object.entries(draft.formData || {}).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (!field) return;

    if (field.type === 'checkbox') {
      field.checked = value === true || value === 'on';
    } else {
      field.value = value;
    }
  });
}

function bindAutosave() {
  form.addEventListener('input', () => {
    saveDraft();
    updateReview();
  });
}

function renderStepPills() {
  stepPills.innerHTML = '';
  stepLabels.forEach((label, idx) => {
    const pill = document.createElement('div');
    pill.className = 'step-pill';
    pill.dataset.step = String(idx + 1);
    pill.textContent = `${idx + 1}. ${label}`;
    stepPills.appendChild(pill);
  });
}

function validateStep(stepNumber) {
  const currentSection = steps.find(step => Number(step.dataset.step) === stepNumber);
  const fields = Array.from(currentSection.querySelectorAll('input, select, textarea'));

  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }

  return true;
}

function updateReview() {
  const data = Object.fromEntries(new FormData(form).entries());
  const rows = [
    ['Company name', data.companyName || ''],
    ['Website URL', data.websiteUrl || ''],
    ['Primary contact', data.contactName || ''],
    ['Contact email', data.contactEmail || ''],
    ['Main goal', data.mainGoal || ''],
    ['Monthly site visitors', data.monthlyTraffic || ''],
    ['Website challenge', data.biggestChallenge || ''],
    ['Timeline', data.timeline || ''],
    ['Budget', data.budget || ''],
    ['Kickoff date', data.kickoffDate || ''],
    ['SEO support', data.seoSupport || 'No'],
  ];

  reviewPanel.innerHTML = `<div class="review-grid">${rows.map(([label, value]) => `
    <div class="review-item"><strong>${label}</strong><span>${escapeHtml(value || '-')}</span></div>
  `).join('')}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function render() {
  steps.forEach(step => {
    step.classList.toggle('active', Number(step.dataset.step) === currentStep);
  });

  document.querySelectorAll('.step-pill').forEach(pill => {
    const stepNum = Number(pill.dataset.step);
    pill.classList.toggle('active', stepNum === currentStep);
    pill.classList.toggle('complete', stepNum < currentStep || (draft.completed && stepNum === TOTAL_STEPS));
  });

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;
  progressBar.style.width = `${progressPercent}%`;
  progressText.textContent = `Step ${currentStep} of ${TOTAL_STEPS}`;

  prevBtn.disabled = currentStep === 1;
  nextBtn.classList.toggle('hidden', currentStep === TOTAL_STEPS);
  submitBtn.classList.toggle('hidden', currentStep !== TOTAL_STEPS);

  if (currentStep === TOTAL_STEPS) {
    updateReview();
  }
}

function logEvent(message) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${message}`;
  eventLog.prepend(li);
}

prevBtn.addEventListener('click', () => {
  currentStep = Math.max(1, currentStep - 1);
  render();
});

nextBtn.addEventListener('click', () => {
  if (!validateStep(currentStep)) return;
  saveDraft();
  currentStep = Math.min(TOTAL_STEPS, currentStep + 1);
  render();
});

resetBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  draft = { completed: false, formData: {} };
  form.reset();
  currentStep = 1;
  render();
  reviewPanel.innerHTML = '';
  eventLog.innerHTML = '';
  logEvent('Draft reset.');
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validateStep(currentStep)) return;

  saveDraft();
  draft.completed = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));

  const payload = {
    submittedAt: new Date().toISOString(),
    hubspotContact: {
      email: draft.formData.contactEmail,
      firstname: draft.formData.contactName,
      company: draft.formData.companyName,
      website: draft.formData.websiteUrl,
      lifecycle_stage: 'customer'
    },
    onboarding: draft.formData
  };

  logEvent('Onboarding marked complete.');
  logEvent('Client data packaged for HubSpot API handoff.');
  logEvent(`Payload preview: ${JSON.stringify(payload).slice(0, 140)}...`);
  alert('Prototype submission complete. In production, this would store the data, send it to HubSpot, and notify the team.');
  render();
});

init();
