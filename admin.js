import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey
);

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const signOutBtn = document.getElementById("signOutBtn");
const appsBody = document.getElementById("appsBody");
const countLabel = document.getElementById("countLabel");
const emptyState = document.getElementById("emptyState");

// --- Auth: decide which view to show -------------------------
async function refresh() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    loadApplications();
  } else {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }
}

// React to sign-in / sign-out anywhere in the app.
supabase.auth.onAuthStateChange(() => refresh());

// --- Login ---------------------------------------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.style.display = "none";
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";

  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value,
  });

  if (error) {
    loginError.textContent = "⚠️ " + error.message;
    loginError.style.display = "block";
    loginError.style.background = "#fef2f2";
    loginError.style.borderColor = "#fecaca";
    loginError.style.color = "#991b1b";
  }
  loginBtn.disabled = false;
  loginBtn.textContent = "Sign In";
});

// --- Logout --------------------------------------------------
signOutBtn.addEventListener("click", () => supabase.auth.signOut());

// --- Load & render applications ------------------------------
async function loadApplications() {
  countLabel.textContent = "Loading…";

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    countLabel.textContent = "Error: " + error.message;
    return;
  }

  appsBody.innerHTML = "";
  emptyState.hidden = data.length > 0;
  countLabel.textContent = `${data.length} application${data.length === 1 ? "" : "s"}`;

  for (const app of data) {
    appsBody.appendChild(renderRow(app));
  }
}

function renderRow(app) {
  const tr = document.createElement("tr");

  const date = new Date(app.created_at).toLocaleString();
  tr.appendChild(cell(date));
  tr.appendChild(cell(app.name));

  const contact = document.createElement("td");
  contact.innerHTML =
    `<div class="contact-email">${escapeHtml(app.email)}</div>` +
    `<div class="contact-phone">${escapeHtml(app.phone)}</div>`;
  tr.appendChild(contact);

  tr.appendChild(cell(app.position));
  tr.appendChild(cell(app.experience));

  const cover = cell(app.cover_letter || "—");
  cover.className = "cover-cell";
  tr.appendChild(cover);

  // Resume: generate a short-lived signed URL on demand.
  const resumeTd = document.createElement("td");
  if (app.resume_path) {
    const btn = document.createElement("button");
    btn.className = "resume-link";
    btn.textContent = "Download";
    btn.addEventListener("click", () => openResume(app.resume_path, btn));
    resumeTd.appendChild(btn);
  } else {
    resumeTd.textContent = "—";
  }
  tr.appendChild(resumeTd);

  return tr;
}

async function openResume(path, btn) {
  btn.disabled = true;
  btn.textContent = "…";

  // Signed URL is valid for 60 seconds — enough to open, then expires.
  const { data, error } = await supabase.storage
    .from("resumes")
    .createSignedUrl(path, 60);

  btn.disabled = false;
  btn.textContent = "Download";

  if (error) {
    alert("Could not open resume: " + error.message);
    return;
  }
  window.open(data.signedUrl, "_blank");
}

// --- Helpers -------------------------------------------------
function cell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

refresh();
