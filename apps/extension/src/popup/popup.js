const form = document.getElementById("job-form");
const authForm = document.getElementById("auth-form");
const extractBtn = document.getElementById("extract-btn");
const analyzeBtn = document.getElementById("analyze-btn");
const statusEl = document.getElementById("status");
const authSectionEl = document.getElementById("auth-section");
const jobSectionEl = document.getElementById("job-section");
const authTitleEl = document.getElementById("auth-title");
const authModeToggleEl = document.getElementById("auth-mode-toggle");
const authSubmitBtnEl = document.getElementById("auth-submit-btn");
const nameInputEl = document.getElementById("name");
const logoutBtnEl = document.getElementById("logout-btn");
const technologyListEl = document.getElementById("technology-list");
const skillListEl = document.getElementById("skill-list");
const resumeSelectEl = document.getElementById("resumeId");
const fitScoreEl = document.getElementById("fit-score");
const fitReasonsEl = document.getElementById("fit-reasons");

let extractedInsights = {
  technologies: [],
  skills: []
};
let authMode = "login";

document.getElementById("applicationDate").value = new Date().toISOString().slice(0, 10);

void initializePopup();

authModeToggleEl.addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  setAuthMode(authMode);
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const apiBaseUrl = document.getElementById("apiBaseUrl").value;
  const type = authMode === "signup" ? "SIGNUP_WITH_CREDENTIALS" : "LOGIN_WITH_CREDENTIALS";

  chrome.runtime.sendMessage(
    {
      type,
      payload: { name, email, password, apiBaseUrl }
    },
    (response) => {
      if (response?.success) {
        showJobSection();
        void loadResumes();
        setStatus(authMode === "signup" ? "Account created and connected" : "Account connected");
      } else {
        setStatus(response?.error || "Auth failed");
      }
    }
  );
});

logoutBtnEl.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    showAuthSection();
    setStatus("Logged out");
  });
});

extractBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_JOB" }, (response) => {
    if (!response?.success) {
      setStatus("Extraction unavailable on this page");
      return;
    }

    fillField("companyName", response.payload.companyName || "");
    fillField("jobTitle", response.payload.jobTitle || "");
    fillField("location", response.payload.location || "");
    fillField("workplaceType", normalizeWorkMode(response.payload.workplaceType || ""));
    fillField("sourcePlatform", response.payload.sourcePlatform || "");
    fillField("notes", response.payload.jobDescription || "");
    extractedInsights = {
      technologies: response.payload.technologies || [],
      skills: response.payload.skills || []
    };
    renderInsights();
    setStatus(`Auto-filled from ${response.payload.extractorUsed || "parser"}`);
    void analyzeFit();
  });
});

analyzeBtn.addEventListener("click", () => {
  void analyzeFit();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = {
    companyName: value("companyName"),
    jobTitle: value("jobTitle"),
    location: value("location"),
    workplaceType: value("workplaceType"),
    sourcePlatform: value("sourcePlatform"),
    applicationDate: new Date(value("applicationDate")).toISOString(),
    status: value("jobStatus"),
    notes: value("notes"),
    tags: uniqueTags([...extractedInsights.technologies, ...extractedInsights.skills])
  };

  chrome.runtime.sendMessage({ type: "SAVE_APPLICATION", payload }, (response) => {
    if (response?.success) {
      setStatus("Saved successfully");
    } else {
      setStatus(response?.error || "Failed to save");
    }
  });
});

function fillField(id, val) {
  document.getElementById(id).value = val;
}

function value(id) {
  return document.getElementById(id).value;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function renderInsights() {
  technologyListEl.textContent = extractedInsights.technologies.length
    ? extractedInsights.technologies.join(", ")
    : "No technologies extracted yet.";

  skillListEl.textContent = extractedInsights.skills.length
    ? extractedInsights.skills.join(", ")
    : "No skills extracted yet.";
}

function uniqueTags(tags) {
  return [...new Set(tags.filter(Boolean))];
}

function normalizeWorkMode(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("remote")) return "remote";
  if (normalized.includes("hybrid")) return "hybrid";
  if (normalized.includes("onsite") || normalized.includes("on-site") || normalized.includes("on site")) {
    return "onsite";
  }
  return "";
}

async function initializePopup() {
  setAuthMode("login");

  const response = await chrome.runtime.sendMessage({ type: "CHECK_AUTH" });
  if (response?.authenticated) {
    showJobSection();
    await loadResumes();
  } else {
    showAuthSection();
  }
}

function showAuthSection() {
  authSectionEl.classList.remove("hidden");
  jobSectionEl.classList.add("hidden");
}

function showJobSection() {
  authSectionEl.classList.add("hidden");
  jobSectionEl.classList.remove("hidden");
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";

  nameInputEl.classList.toggle("hidden", !isSignup);
  nameInputEl.required = isSignup;
  authTitleEl.textContent = isSignup ? "Create your account" : "Login to continue";
  authSubmitBtnEl.textContent = isSignup ? "Sign up & Connect" : "Login & Connect";
  authModeToggleEl.textContent = isSignup ? "Have an account? Login" : "No account? Sign up";
}

async function loadResumes() {
  const response = await chrome.runtime.sendMessage({ type: "GET_RESUMES" });
  if (!response?.success) {
    setStatus(response?.error || "Unable to load resumes");
    return;
  }

  const resumes = response.result || [];
  const previousValue = resumeSelectEl.value;

  resumeSelectEl.innerHTML = '<option value="">Select resume for fit analysis</option>';
  for (const resume of resumes) {
    const option = document.createElement("option");
    option.value = resume._id;
    option.textContent = `${resume.fileName}${resume.isActive ? " (Active)" : ""}`;
    option.selected = resume.isActive;
    resumeSelectEl.appendChild(option);
  }

  if (previousValue && resumes.some((resume) => resume._id === previousValue)) {
    resumeSelectEl.value = previousValue;
  }
}

async function analyzeFit() {
  const resumeId = value("resumeId");
  if (!resumeId) {
    fitScoreEl.className = "fit-score";
    fitScoreEl.textContent = "Select a resume to analyze fit.";
    fitReasonsEl.innerHTML = "";
    return;
  }

  const payload = {
    resumeId,
    jobTitle: value("jobTitle"),
    jobDescription: value("notes"),
    location: value("location"),
    workplaceType: value("workplaceType")
  };

  const response = await chrome.runtime.sendMessage({ type: "SCORE_JOB", payload });
  if (!response?.success) {
    setStatus(response?.error || "Fit analysis failed");
    return;
  }

  const result = response.result;
  setScoreAppearance(result.rating);
  fitScoreEl.textContent = `${result.rating} - ${result.score}/100`;
  fitReasonsEl.innerHTML = "";
  const reasons = result.reasons && result.reasons.length ? result.reasons : ["No explicit reasons were generated."];
  for (const reason of reasons) {
    const item = document.createElement("li");
    item.textContent = reason;
    fitReasonsEl.appendChild(item);
  }
}

function setScoreAppearance(rating) {
  fitScoreEl.className = "fit-score";

  if (rating === "Strong Match") {
    fitScoreEl.classList.add("strong");
    return;
  }

  if (rating === "Good Match") {
    fitScoreEl.classList.add("good");
    return;
  }

  if (rating === "Weak Match") {
    fitScoreEl.classList.add("weak");
    return;
  }

  fitScoreEl.classList.add("not-recommended");
}
