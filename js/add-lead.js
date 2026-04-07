const form = document.getElementById("leadForm");
const saveLeadBtn = document.getElementById("saveLeadBtn");
const submitNotice = document.getElementById("submitNotice");
const pageTitle = document.getElementById("pageTitle");
const statusSelect = document.getElementById("status");
const conditionalLeadFields = document.getElementById("conditionalLeadFields");

let conditionalFieldsByStatus = {};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseBoolean(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "yes", "1", "required", "y"].includes(normalized);
}

function parseOptionList(value) {
  return String(value || "")
    .split(/[|,]/)
    .map((o) => o.trim())
    .filter(Boolean);
}

function clearSubmitNotice() {
  if (!submitNotice) return;
  submitNotice.style.display = "none";
  submitNotice.className = "notice";
  submitNotice.innerHTML = "";
}

function showSubmitNotice(title, message, type = "success") {
  if (!submitNotice) return;
  submitNotice.className = type === "error" ? "notice notice-danger" : "notice";
  submitNotice.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  submitNotice.style.display = "block";
}

function deriveStatusFromType(typeValue) {
  const rawType = String(typeValue || "").trim();
  if (!rawType) return "";
  const normalizedType = rawType.toLowerCase();
  if (!normalizedType.includes("follow") || !normalizedType.includes("condition")) return "";
  const delimiterMatch = rawType.match(/follow\s*-?\s*up\s*condition\s*[:|-]\s*(.+)$/i);
  if (delimiterMatch && delimiterMatch[1]) return delimiterMatch[1].trim();
  const trailingMatch = rawType.match(/follow\s*-?\s*up\s*condition\s+(.+)$/i);
  if (trailingMatch && trailingMatch[1]) return trailingMatch[1].trim();
  return "";
}

function extractConditionalConfigFromMaster(rows) {
  const byStatus = {};

  rows.forEach((item) => {
    const type = String(item["Type"] || "").trim().toLowerCase();
    if (!type.includes("follow") || !type.includes("condition")) return;

    const status = String(
      item["Status"] ||
      item["Follow-up Status"] ||
      item["Followup Status"] ||
      deriveStatusFromType(item["Type"]) ||
      ""
    ).trim();
    const value = String(item["Value"] || "").trim();
    const explicitFieldLabel = String(item["Field Label"] || item["Label"] || item["Field"] || "").trim();

    if (explicitFieldLabel && status) {
      if (!byStatus[status]) byStatus[status] = [];
      const fieldTypeRaw = String(item["Field Type"] || "text").trim().toLowerCase();
      const allowedTypes = ["text", "number", "url", "date", "select", "textarea"];
      byStatus[status].push({
        name: explicitFieldLabel,
        key: normalizeKey(explicitFieldLabel),
        label: explicitFieldLabel,
        type: allowedTypes.includes(fieldTypeRaw) ? fieldTypeRaw : "text",
        required: parseBoolean(item["Required"] || item["Is Required"] || ""),
        placeholder: String(item["Placeholder"] || "").trim(),
        options: parseOptionList(item["Options"] || item["Option List"] || "")
      });
      return;
    }

    if (!status || !value) return;
    byStatus[status] = value.split(/[|,]/).map((s) => s.trim()).filter(Boolean).map((fieldLabel) => ({
      name: fieldLabel,
      key: normalizeKey(fieldLabel),
      label: fieldLabel,
      type: "text",
      required: true,
      placeholder: "",
      options: []
    }));
  });

  const normalized = {};
  Object.keys(byStatus).forEach((status) => {
    const dedupe = new Map();
    byStatus[status].forEach((field) => {
      if (field && field.key && !dedupe.has(field.key)) dedupe.set(field.key, field);
    });
    normalized[status] = Array.from(dedupe.values());
  });
  return normalized;
}

function createConditionalFieldMarkup(field) {
  const requiredAttr = field.required ? "required" : "";
  const requiredMark = field.required ? " *" : "";
  const placeholderAttr = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : "";
  const id = `cf_${field.key}`;

  if (field.type === "textarea") {
    return `<div><label for="${id}">${escapeHtml(field.label)}${requiredMark}</label><textarea id="${id}" data-cf-key="${field.key}" data-cf-name="${escapeHtml(field.name)}" ${requiredAttr} ${placeholderAttr}></textarea></div>`;
  }
  if (field.type === "select") {
    const opts = field.options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
    return `<div><label for="${id}">${escapeHtml(field.label)}${requiredMark}</label><select id="${id}" data-cf-key="${field.key}" data-cf-name="${escapeHtml(field.name)}" ${requiredAttr}><option value="">Select ${escapeHtml(field.label)}</option>${opts}</select></div>`;
  }
  return `<div><label for="${id}">${escapeHtml(field.label)}${requiredMark}</label><input type="${field.type}" id="${id}" data-cf-key="${field.key}" data-cf-name="${escapeHtml(field.name)}" ${requiredAttr} ${placeholderAttr} /></div>`;
}

function renderConditionalLeadFields(status) {
  if (!conditionalLeadFields) return;
  const fields = conditionalFieldsByStatus[status] || [];
  if (!fields.length) {
    conditionalLeadFields.innerHTML = "";
    return;
  }
  const fieldsMarkup = fields.map((field) => createConditionalFieldMarkup(field)).join("");
  conditionalLeadFields.innerHTML = `<div class="profile-section"><h3 class="profile-section-title">Additional details for ${escapeHtml(status)}</h3><div class="form-grid">${fieldsMarkup}</div></div>`;
}

function collectConditionalLeadFieldValues() {
  const values = {};
  if (!conditionalLeadFields) return values;
  conditionalLeadFields.querySelectorAll("[data-cf-key]").forEach((el) => {
    const name = el.getAttribute("data-cf-name") || el.getAttribute("data-cf-key");
    const value = String(el.value || "").trim();
    if (name && value) values[name] = value;
  });
  return values;
}

function validateConditionalLeadFields() {
  const errors = [];
  if (!conditionalLeadFields) return errors;
  conditionalLeadFields.querySelectorAll("[data-cf-key]").forEach((el) => {
    const label = el.getAttribute("data-cf-name") || "Field";
    const value = String(el.value || "").trim();
    const required = el.hasAttribute("required");
    const type = el.getAttribute("type") || el.tagName.toLowerCase();
    let invalid = false;
    if (required && !value) { errors.push(`${label} is required.`); invalid = true; }
    if (!invalid && value && type === "number" && isNaN(Number(value))) { errors.push(`${label} must be a valid number.`); invalid = true; }
    if (!invalid && value && type === "url") {
      try { new URL(value); } catch (_e) { errors.push(`${label} must be a valid URL.`); invalid = true; }
    }
    el.classList.toggle("is-invalid", invalid);
  });
  return errors;
}

if (statusSelect) {
  statusSelect.addEventListener("change", () => renderConditionalLeadFields(statusSelect.value));
}

function deriveLeadStatus(statusValue) {
  const normalizedStatus = String(statusValue || "").trim().toLowerCase();
  return normalizedStatus === "won" || normalizedStatus === "lost" ? "Closed" : "Open";
}

function validateLeadForm() {
  const customerNameInput = document.getElementById("customer_name");
  const contactInput = document.getElementById("contact_no");
  const emailInput = document.getElementById("email");
  const sourceInput = document.getElementById("lead_source");
  const productInput = document.getElementById("product_category");
  const ownerInput = document.getElementById("lead_owner");
  const statusInput = document.getElementById("status");
  const remarksInput = document.getElementById("remarks");

  const customerName = customerNameInput.value.trim();
  const contactNo = contactInput.value.trim();
  const email = emailInput.value.trim();
  const leadSource = sourceInput.value.trim();
  const productCategory = productInput.value.trim();
  const leadOwner = ownerInput.value.trim();
  const status = statusInput.value.trim();
  const remarks = remarksInput.value.trim();

  const errors = [];

  if (customerName.length < 3) {
    errors.push("Customer Name must be at least 3 characters.");
  }

  if (customerName.length > 80) {
    errors.push("Customer Name cannot exceed 80 characters.");
  }

  const contactDigits = contactNo.replace(/\D/g, "");
  if (contactDigits.length < 10 || contactDigits.length > 15) {
    errors.push("Contact No. must contain 10 to 15 digits.");
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      errors.push("Email ID is not valid.");
    }
  }

  if (!leadSource) {
    errors.push("Please select a Lead Source.");
  }

  if (!productCategory) {
    errors.push("Please select a Product Category.");
  }

  if (!status) {
    errors.push("Please select a Status.");
  }

  if (!leadOwner) {
    errors.push("Lead Owner is missing. Please login again.");
  }

  if (remarks.length > 600) {
    errors.push("Remarks cannot exceed 600 characters.");
  }

  customerNameInput.classList.toggle("is-invalid", customerName.length < 3 || customerName.length > 80);
  contactInput.classList.toggle("is-invalid", contactDigits.length < 10 || contactDigits.length > 15);
  emailInput.classList.toggle(
    "is-invalid",
    Boolean(email) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  );
  sourceInput.classList.toggle("is-invalid", !leadSource);
  productInput.classList.toggle("is-invalid", !productCategory);
  statusInput.classList.toggle("is-invalid", !status);
  remarksInput.classList.toggle("is-invalid", remarks.length > 600);

  return {
    valid: errors.length === 0,
    errors
  };
}

const session = window.AuthSession ? window.AuthSession.requireValid() : null;
const loggedInUser = session ? session.username : "";
const userRole = session ? session.role : "";
const urlParams = new URLSearchParams(window.location.search);
const editModeRequested = urlParams.get("mode") === "edit";

let editLeadId = null;

if (editModeRequested) {
  editLeadId = localStorage.getItem("editLeadId");
} else {
  // Prevent stale edit state when user opens Add Lead normally.
  localStorage.removeItem("editLeadId");
}

if (!loggedInUser || !userRole) {
  window.location.href = "login.html";
}

document.getElementById("lead_owner").value = loggedInUser;

let isSubmitting = false;
let isEditMode = false;

saveLeadBtn.disabled = true;
saveLeadBtn.innerText = "Loading...";

// 🚀 Start page
initPage();

async function initPage() {
  try {
    await loadMasterData();

    if (editLeadId) {
      isEditMode = true;
      pageTitle.innerText = "Edit Lead";
      await loadLeadForEdit(editLeadId);
      saveLeadBtn.innerText = "Update Lead";
    } else {
      // If edit mode is requested without an id, fail safe to add mode.
      localStorage.removeItem("editLeadId");
      pageTitle.innerText = "Add New Lead";
      saveLeadBtn.innerText = "Save Lead";
    }
  } finally {
    saveLeadBtn.disabled = false;
  }
}

// 🔥 Load dropdowns from Master_Data sheet
async function loadMasterData() {
  try {
    const data = await window.AppDataCache.getResource("master", {
      onUpdate: populateMasterData
    });

    populateMasterData(data);
  } catch (error) {
    console.error("Master data load error:", error);
    alert("Failed to load dropdown master data.");
  }
}

function populateMasterData(data) {
  const leadSourceSelect = document.getElementById("lead_source");
  const productSelect = document.getElementById("product_category");
  const statusSelect = document.getElementById("status");

  leadSourceSelect.innerHTML = `<option value="">Select Lead Source</option>`;
  productSelect.innerHTML = `<option value="">Select Product Category</option>`;
  statusSelect.innerHTML = `<option value="">Select Status</option>`;

  data.forEach(item => {
    const type = String(item["Type"] || "").trim();
    const value = String(item["Value"] || "").trim();

    if (!value) return;

    if (type === "Lead Source") {
      leadSourceSelect.innerHTML += `<option value="${value}">${value}</option>`;
    }

    if (type === "Product Category") {
      productSelect.innerHTML += `<option value="${value}">${value}</option>`;
    }

    if (type === "Status") {
      statusSelect.innerHTML += `<option value="${value}">${value}</option>`;
    }
  });

  conditionalFieldsByStatus = extractConditionalConfigFromMaster(data);
  renderConditionalLeadFields(statusSelect.value);
}

// 🔥 Load existing lead for editing
async function loadLeadForEdit(leadId) {
  try {
    const rawLeads = await window.AppDataCache.getResource("leads");

    const lead = rawLeads.find((item) => String(item["Lead ID"]) === String(leadId));

    if (!lead) {
      alert("Lead not found for editing.");
      localStorage.removeItem("editLeadId");
      window.location.href = "leads.html";
      return;
    }

    const leadOwner = String(lead["Lead Owner"] || "");

    // 🔒 FRONTEND PERMISSION LOCK
    if (
      userRole !== "Manager" &&
      userRole !== "Admin" &&
      leadOwner !== loggedInUser
    ) {
      alert("Permission denied. You can only edit your own leads.");
      localStorage.removeItem("editLeadId");
      window.location.href = "leads.html";
      return;
    }

    document.getElementById("customer_name").value = lead["Customer Name"] || "";
    document.getElementById("contact_no").value = lead["Contact No."] || "";
    document.getElementById("email").value = lead["Email ID"] || "";
    document.getElementById("lead_source").value = lead["Lead Source"] || "";
    document.getElementById("product_category").value = lead["Product Category"] || "";
    document.getElementById("lead_owner").value = lead["Lead Owner"] || "";
    document.getElementById("status").value = lead["Status"] || "New";
    document.getElementById("remarks").value = lead["Remarks"] || "";

    // 🔒 Agent cannot change owner manually while editing
    if (userRole === "Agent") {
      document.getElementById("lead_owner").setAttribute("readonly", true);
    }

    saveLeadBtn.innerText = "Update Lead";
  } catch (error) {
    console.error("Error loading lead for edit:", error);
    alert("Failed to load lead data.");
  }
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (isSubmitting) return;
  isSubmitting = true;

  saveLeadBtn.disabled = true;
  saveLeadBtn.innerText = isEditMode ? "Updating..." : "Saving...";
  clearSubmitNotice();

  // Yield to browser so the button state paints before validation + fetch work begins.
  await new Promise((resolve) => setTimeout(resolve, 0));

  const customer_name = document.getElementById("customer_name").value.trim();
  const contact_no = document.getElementById("contact_no").value.trim();
  const email = document.getElementById("email").value.trim();
  const lead_source = document.getElementById("lead_source").value.trim();
  const product_category = document.getElementById("product_category").value.trim();
  const lead_owner = document.getElementById("lead_owner").value.trim();
  const status = document.getElementById("status").value.trim();
  const remarks = document.getElementById("remarks").value.trim();

  const validation = validateLeadForm();
  const conditionalErrors = validateConditionalLeadFields();
  const conditionalValues = collectConditionalLeadFieldValues();

  if (!validation.valid || conditionalErrors.length) {
    const allErrors = [...validation.errors, ...conditionalErrors];
    alert(`Please fix the following before submitting:\n\n- ${allErrors.join("\n- ")}`);
    return;
  }

  try {
    // 🔥 EDIT MODE
    if (isEditMode) {
      const updatePayload = {
        type: "updateLead",
        lead_id: editLeadId,
        lead_owner,
        customer_name,
        contact_no,
        email_id: email,
        lead_source,
        product_category,
        status,
        remarks,
        conditional_fields: conditionalValues
      };

      const result = await window.apiPost(updatePayload);

      if (result.success) {
        window.AppDataCache.invalidate(["leads", "followups"]);
        window.AppDataCache.prefetch(["leads", "followups", "master"]);
        alert("Lead updated successfully!");
        localStorage.removeItem("editLeadId");
        window.location.href = "leads.html";
        return;
      } else if (result.permission_denied) {
        alert("Permission denied. You can only edit your own leads.");
        localStorage.removeItem("editLeadId");
        window.location.href = "leads.html";
        return;
      } else {
        alert("Failed to update lead.\n\n" + JSON.stringify(result));
      }
      return;
    }

    // 🔥 ADD NEW MODE
    const existingLeadsRaw = await window.AppDataCache.getResource("leads");

    const existingLeads = existingLeadsRaw.map((lead) => ({
      lead_id: String(lead["Lead ID"] || ""),
      customer_name: String(lead["Customer Name"] || ""),
      contact_no: String(lead["Contact No."] || ""),
      email: String(lead["Email ID"] || ""),
      lead_owner: String(lead["Lead Owner"] || ""),
      status: String(lead["Status"] || ""),
      lead_status: String(lead["Lead Status"] || "")
    }));

    const duplicate = existingLeads.find((lead) => {
      const samePhone =
        String(lead.contact_no || "").trim() === String(contact_no || "").trim();

      const sameEmail =
        email &&
        String(lead.email || "").trim().toLowerCase() ===
          String(email || "").trim().toLowerCase();

      return (samePhone || sameEmail) && lead.lead_status === "Open";
    });

    if (duplicate) {
      alert(
        `Duplicate Lead Found!\n\n` +
        `Customer: ${duplicate.customer_name}\n` +
        `Lead ID: ${duplicate.lead_id}\n` +
        `Owner: ${duplicate.lead_owner}\n` +
        `Current Status: ${duplicate.status}\n\n` +
        `This lead is already OPEN and cannot be added again.`
      );
      return;
    }

    const lead_id = "LD-" + Date.now();
    const created_date = window.AppTime.todayISO();

    const newLead = {
      lead_id,
      created_date,
      lead_owner,
      customer_name,
      contact_no,
      email_id: email,
      lead_source,
      product_category,
      status,
      remarks,
      lead_status: deriveLeadStatus(status),
      order_value: 0,
      next_followup_date: "",
      conditional_fields: conditionalValues
    };

    const result = await window.apiPost(newLead);

    if (result.success) {
      window.AppDataCache.invalidate(["leads", "followups"]);
      window.AppDataCache.prefetch(["leads", "followups", "master"]);
      form.reset();
      document.getElementById("lead_owner").value = loggedInUser;
      renderConditionalLeadFields("");
      showSubmitNotice("Lead submitted successfully.", "You can add the next lead now.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (result.duplicate) {
      alert(
        `Duplicate Lead Found!\n\n` +
        `Customer: ${result.duplicate_data.customer_name}\n` +
        `Lead ID: ${result.duplicate_data.lead_id}\n` +
        `Owner: ${result.duplicate_data.lead_owner}\n` +
        `Current Status: ${result.duplicate_data.status}\n\n` +
        `This lead is already OPEN and cannot be added again.`
      );
    } else {
      alert("Failed to save lead.\n\n" + JSON.stringify(result));
    }

  } catch (error) {
    console.error("REAL ERROR:", error);
    alert("Real Error:\n\n" + error.message);

    showSubmitNotice("Submission failed.", error.message || "Please try again.", "error");
  } finally {
    saveLeadBtn.disabled = false;
    saveLeadBtn.innerText = isEditMode ? "Update Lead" : "Save Lead";
    isSubmitting = false;
  }
});
