import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey
);

const form = document.getElementById("applicationForm");
const success = document.getElementById("success");
const submitBtn = document.getElementById("submitBtn");

function showMessage(text, ok = true) {
  success.textContent = text;
  success.style.display = "block";
  success.style.background = ok ? "#ecfdf5" : "#fef2f2";
  success.style.borderColor = ok ? "#a7f3d0" : "#fecaca";
  success.style.color = ok ? "#065f46" : "#991b1b";
  success.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    // 1. Upload the resume to the "resumes" storage bucket.
    const file = form.resume.files[0];
    if (!file) {
      throw new Error("Please attach a resume file before submitting.");
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(path, file);

    if (uploadError) {
      throw new Error("Resume upload (storage) blocked: " + uploadError.message);
    }

    // 2. Insert the application row, referencing the uploaded file's path.
    const { error: insertError } = await supabase
      .from("applications")
      .insert({
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
        position: form.position.value,
        experience: form.experience.value,
        cover_letter: form.cover.value || null,
        resume_path: path,
      });

    if (insertError) {
      throw new Error("Saving application (database) blocked: " + insertError.message);
    }

    showMessage("✅ Thanks! Your application has been submitted.");
    form.reset();
  } catch (err) {
    console.error(err);
    showMessage("⚠️ Something went wrong: " + err.message, false);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Application";
  }
});
