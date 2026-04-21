const DEFAULT_API_BASE_URL = "http://localhost:4000";

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request?.type === "SAVE_APPLICATION") {
    void saveApplication(request.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request?.type === "SET_AUTH") {
    chrome.storage.local.set({
      authToken: request.payload.token,
      apiBaseUrl: request.payload.apiBaseUrl || DEFAULT_API_BASE_URL
    });
    sendResponse({ success: true });
    return true;
  }

  if (request?.type === "LOGIN_WITH_CREDENTIALS") {
    void loginWithCredentials(request.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request?.type === "SIGNUP_WITH_CREDENTIALS") {
    void signupWithCredentials(request.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request?.type === "CHECK_AUTH") {
    void checkAuth()
      .then((result) => sendResponse(result))
      .catch(() => sendResponse({ authenticated: false }));
    return true;
  }

  if (request?.type === "LOGOUT") {
    void chrome.storage.local.remove(["authToken"]);
    sendResponse({ success: true });
    return true;
  }

  if (request?.type === "GET_RESUMES") {
    void getResumes()
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request?.type === "SCORE_JOB") {
    void scoreJob(request.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  return false;
});

async function loginWithCredentials(payload) {
  return authenticateWithCredentials("/auth/login", payload, "Unable to login from extension");
}

async function signupWithCredentials(payload) {
  return authenticateWithCredentials("/auth/signup", payload, "Unable to sign up from extension");
}

async function authenticateWithCredentials(path, payload, fallbackMessage) {
  const apiBaseUrl = payload.apiBaseUrl || DEFAULT_API_BASE_URL;
  const requestBody = {
    email: payload.email,
    password: payload.password
  };

  if (path === "/auth/signup" && payload.name) {
    requestBody.name = payload.name;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.accessToken) {
    throw new Error(data.message || fallbackMessage);
  }

  await chrome.storage.local.set({
    authToken: data.accessToken,
    apiBaseUrl
  });

  return { connected: true };
}

async function checkAuth() {
  const { authToken, apiBaseUrl } = await chrome.storage.local.get(["authToken", "apiBaseUrl"]);
  if (!authToken) {
    return { authenticated: false };
  }

  const response = await fetch(`${apiBaseUrl || DEFAULT_API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    await chrome.storage.local.remove(["authToken"]);
    return { authenticated: false };
  }

  return { authenticated: true };
}

async function saveApplication(payload) {
  const response = await authenticatedRequest("/applications", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) {
      await chrome.storage.local.remove(["authToken"]);
    }
    throw new Error(error.message || "Failed to save application");
  }

  return response.json();
}

async function getResumes() {
  const response = await authenticatedRequest("/resumes", {
    method: "GET"
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to load resumes");
  }

  return response.json();
}

async function scoreJob(payload) {
  const response = await authenticatedRequest("/match/score", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to score job");
  }

  return response.json();
}

async function authenticatedRequest(path, init) {
  const { authToken, apiBaseUrl } = await chrome.storage.local.get(["authToken", "apiBaseUrl"]);
  if (!authToken) {
    throw new Error("Missing auth token. Open popup and connect account first.");
  }

  const response = await fetch(`${apiBaseUrl || DEFAULT_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      ...(init.headers || {})
    }
  });

  if (response.status === 401) {
    await chrome.storage.local.remove(["authToken"]);
  }

  return response;
}
