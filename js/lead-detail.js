let leads = [];
let followups = [];

const selectedLeadId = localStorage.getItem("selectedLeadId");
const leadDetailBox = document.getElementById("leadDetailBox");
const followupForm = document.getElementById("followupForm");
const followupTableBody = document.getElementById("followupTableBody");
const timelineBox = document.getElementById("leadTimeline");
const leadSummaryStrip = document.getElementById("leadSummaryStrip");
const followupStatusSelect = document.getElementById("followup_status");
const conditionalFollowupFields = document.getElementById("conditionalFollowupFields");

const loggedInUser = localStorage.getItem("loggedInUser");
const userRole = localStorage.getItem("userRole");

if (!loggedInUser || !userRole) {
  window.location.href = "login.html";
}

let lead = null;
let masterDataRows = [];
let conditionalFieldsByStatus = {};
let activeConditionalFields = [];

loadLeadAndFollowups();

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
    .map((option) => option.trim())
    .filter(Boolean);
}

function deriveStatusFromType(typeValue) {
  const rawType = String(typeValue || "").trim();
  if (!rawType) return "";

  const normalizedType = rawType.toLowerCase();

  if (!normalizedType.includes("follow") || !normalizedType.includes("condition")) {
    return "";
  }

  const delimiterMatch = rawType.match(/follow\s*-?\s*up\s*condition\s*[:|-]\s*(.+)$/i);
  if (delimiterMatch && delimiterMatch[1]) {
    return delimiterMatch[1].trim();
  }

  const trailingMatch = rawType.match(/follow\s*-?\s*up\s*condition\s+(.+)$/i);
  if (trailingMatch && trailingMatch[1]) {
    return trailingMatch[1].trim();
  }

  return "";
}

function parseConditionalConfigRow(item) {
  const status = String(
    item["Status"] ||
    item["Follow-up Status"] ||
    item["Followup Status"] ||
    deriveStatusFromType(item["Type"]) ||
    ""
  ).trim();
  const explicitFieldLabel = String(item["Field Label"] || item["Label"] || item["Field"] || "").trim();
  const fieldLabel = explicitFieldLabel;

  if (!status || !fieldLabel) return null;

  const fieldTypeRaw = String(item["Field Type"] || item["Input Type"] || item["Control Type"] || "text").trim().toLowerCase();
  const allowedTypes = ["text", "number", "url", "date", "select", "textarea"];
  const fieldType = allowedTypes.includes(fieldTypeRaw) ? fieldTypeRaw : "text";
  const required = parseBoolean(item["Required"] || item["Is Required"] || "");
  const placeholder = String(item["Placeholder"] || "").trim();
  const options = parseOptionList(item["Options"] || item["Option List"] || "");

  return {
    status,
    name: fieldLabel,
    key: normalizeKey(fieldLabel),
    label: fieldLabel,
    type: fieldType,
    required,
    placeholder,
    options
  };
}

function extractConditionalConfigFromMaster(rows) {
  const byStatus = {};

  rows.forEach((item) => {
    const type = String(item["Type"] || "").trim().toLowerCase();

    if (!type.includes("follow") || !type.includes("condition")) {
      return;
    }

    const parsedRow = parseConditionalConfigRow(item);
    if (parsedRow) {
      if (!byStatus[parsedRow.status]) {
        byStatus[parsedRow.status] = [];
      }
      byStatus[parsedRow.status].push(parsedRow);
      return;
    }

    const status = String(
      item["Status"] ||
      item["Follow-up Status"] ||
      item["Followup Status"] ||
      deriveStatusFromType(item["Type"]) ||
      ""
    ).trim();
    const value = String(item["Value"] || "").trim();

    if (!status || !value) return;

    const compactList = value
      .split(/[|,]/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (!compactList.length) return;

    byStatus[status] = compactList.map((fieldLabel) => ({
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
      if (!field || !field.key) return;
      if (!dedupe.has(field.key)) {
        dedupe.set(field.key, field);
      }
    });
    normalized[status] = Array.from(dedupe.values());
  });

  return normalized;
}

function loadFollowupStatusOptions(rows) {
  if (!followupStatusSelect) return;

  const statuses = rows
    .filter((item) => String(item["Type"] || "").trim() === "Status")
    .map((item) => String(item["Value"] || "").trim())
    .filter(Boolean);

  if (!statuses.length) return;

  followupStatusSelect.innerHTML = statuses
    .map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`)
    .join("");
}

function createConditionalFieldMarkup(field) {
  const requiredAttr = field.required ? "required" : "";
  const requiredMark = field.required ? " *" : "";
  const placeholderAttr = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : "";
  const id = `cf_${field.key}`;

  if (field.type === "textarea") {
    return `
      <div>
        <label for="${id}">${escapeHtml(field.label)}${requiredMark}</label>
        <textarea id="${id}" data-cf-key="${field.key}" data-cf-name="${escapeHtml(field.name)}" ${requiredAttr} ${placeholderAttr}></textarea>
      </div>
    `;
  }

  if (field.type === "select") {
    const optionsMarkup = field.options
      .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
      .join("");

    return `
      <div>
        <label for="${id}">${escapeHtml(field.label)}${requiredMark}</label>
        <select id="${id}" data-cf-key="${field.key}" data-cf-name="${escapeHtml(field.name)}" ${requiredAttr}>
          <option value="">Select ${escapeHtml(field.label)}</option>
          ${optionsMarkup}
        </select>
      </div>
    `;
  }

  return `
    <div>
      <label for="${id}">${escapeHtml(field.label)}${requiredMark}</label>
      <input type="${field.type}" id="${id}" data-cf-key="${field.key}" data-cf-name="${escapeHtml(field.name)}" ${requiredAttr} ${placeholderAttr} />
    </div>
  `;
}

function renderConditionalFields(status) {
  if (!conditionalFollowupFields) return;

  activeConditionalFields = conditionalFieldsByStatus[status] || [];

  if (!activeConditionalFields.length) {
    conditionalFollowupFields.innerHTML = "";
    return;
  }

  const fieldsMarkup = activeConditionalFields
    .map((field) => createConditionalFieldMarkup(field))
    .join("");

  conditionalFollowupFields.innerHTML = `
    <div class="profile-section">
      <h3 class="profile-section-title">Additional details for ${escapeHtml(status)}</h3>
      <div class="form-grid">
        ${fieldsMarkup}
      </div>
    </div>
  `;
}

function collectConditionalFieldValues() {
  const values = {};
  const fields = conditionalFollowupFields
    ? conditionalFollowupFields.querySelectorAll("[data-cf-key]")
    : [];

  fields.forEach((element) => {
    const key = element.getAttribute("data-cf-key");
    const originalName = element.getAttribute("data-cf-name") || key;
    const value = String(element.value || "").trim();

    if (!key) return;
    if (!value) return;

    values[originalName] = value;
  });

  return values;
}

function validateConditionalFieldValues() {
  const errors = [];
  const fields = conditionalFollowupFields
    ? conditionalFollowupFields.querySelectorAll("[data-cf-key]")
    : [];

  fields.forEach((element) => {
    const label = element.getAttribute("data-cf-name") || "Field";
    const value = String(element.value || "").trim();
    const required = element.hasAttribute("required");
    const type = element.getAttribute("type") || element.tagName.toLowerCase();

    let invalid = false;

    if (required && !value) {
      errors.push(`${label} is required.`);
      invalid = true;
    }

    if (!invalid && value && type === "number" && isNaN(Number(value))) {
      errors.push(`${label} must be a valid number.`);
      invalid = true;
    }

    if (!invalid && value && type === "url") {
      try {
        new URL(value);
      } catch (_error) {
        errors.push(`${label} must be a valid URL.`);
        invalid = true;
      }
    }

    element.classList.toggle("is-invalid", invalid);
  });

  return errors;
}

if (followupStatusSelect) {
  followupStatusSelect.addEventListener("change", () => {
    renderConditionalFields(followupStatusSelect.value);
  });
}

function showLeadDetailLoadingState() {
  if (leadSummaryStrip) {
    leadSummaryStrip.innerHTML = `
      <div class="insight-card"><strong>Lead ID</strong><span class="insight-value">...</span><p>Loading lead data.</p></div>
      <div class="insight-card"><strong>Status</strong><span class="insight-value">...</span><p>Loading lead data.</p></div>
      <div class="insight-card"><strong>Owner</strong><span class="insight-value">...</span><p>Loading lead data.</p></div>
      <div class="insight-card"><strong>Next follow-up</strong><span class="insight-value">...</span><p>Loading lead data.</p></div>
    `;
  }

  if (leadDetailBox) {
    leadDetailBox.innerHTML = `<div class="empty-state">Loading lead details... Please wait.</div>`;
  }

  if (followupTableBody) {
    followupTableBody.innerHTML = `<tr><td colspan="5" class="empty-state">Loading follow-up history...</td></tr>`;
  }

  if (timelineBox) {
    timelineBox.innerHTML = `<div class="empty-state">Loading timeline...</div>`;
  }
}

async function loadLeadAndFollowups() {
  showLeadDetailLoadingState();

  try {
    const [leadsRes, masterRes] = await Promise.all([
      fetch(API_URL),
      fetch(API_URL + "?action=master")
    ]);
    const leadsRaw = await leadsRes.json();
    const masterRaw = await masterRes.json();

    masterDataRows = Array.isArray(masterRaw) ? masterRaw : [];
    conditionalFieldsByStatus = extractConditionalConfigFromMaster(masterDataRows);
    loadFollowupStatusOptions(masterDataRows);

    leads = leadsRaw.map((item, index) => ({
      id: index + 1,
      lead_id: String(item["Lead ID"] || ""),
      date: String(item["Created Date"] || ""),
      lead_owner: String(item["Lead Owner"] || ""),
      customer_name: String(item["Customer Name"] || ""),
      contact_no: String(item["Contact No."] || ""),
      email: String(item["Email ID"] || ""),
      lead_source: String(item["Lead Source"] || ""),
      product_category: String(item["Product Category"] || ""),
      status: String(item["Status"] || ""),
      remarks: String(item["Remarks"] || ""),
      lead_status: String(item["Lead Status"] || ""),
      order_value: Number(item["Order Value"] || 0),
      next_followup_date: String(item["Next Follow-up Date"] || "")
    }));

    lead = leads.find((currentLead) => String(currentLead.id) === String(selectedLeadId));

    if (!lead) {
      leadDetailBox.innerHTML = "<div class=\"empty-state\">Lead not found.</div>";
      return;
    }

    if (
      userRole !== "Manager" &&
      userRole !== "Admin" &&
      lead.lead_owner !== loggedInUser
    ) {
      alert("Permission denied. You can only view your own leads.");
      window.location.href = "leads.html";
      return;
    }

    renderLeadDetail();

    if (followupStatusSelect) {
      renderConditionalFields(followupStatusSelect.value);
    }

    if (lead.lead_status !== "Open") {
      followupForm.style.display = "none";
    }

    const followRes = await fetch(API_URL + "?action=followups");
    const followRaw = await followRes.json();

    followups = followRaw.map((followup) => ({
      followup_id: String(followup["Followup ID"] || ""),
      lead_id: String(followup["Lead ID"] || ""),
      customer_name: String(followup["Customer Name"] || ""),
      contact_no: String(followup["Contact No."] || ""),
      followup_date: String(followup["Follow-up Date"] || ""),
      followup_type: String(followup["Follow-up Type"] || ""),
      followup_status: String(followup["Follow-up Status"] || ""),
      remarks: String(followup["Remarks"] || ""),
      next_followup_date: String(followup["Next Follow-up Date"] || ""),
      created_by: String(followup["Created By"] || ""),
      created_timestamp: String(followup["Created Timestamp"] || "")
    }));

    renderFollowups();
    renderTimeline();

  } catch (error) {
    console.error("Error loading lead/followups:", error);
    leadDetailBox.innerHTML = "<div class=\"empty-state\">Failed to load lead details.</div>";
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatusColor(status) {
  const statusMap = {
    'Won': 'won',
    'Lost': 'lost',
    'Negotiation': 'warm',
    'Interested': 'hot',
    'No Response': 'cold',
    'New': 'new'
  };
  return statusMap[status] || 'info';
}

function renderLeadDetail() {
  if (leadSummaryStrip) {
    leadSummaryStrip.innerHTML = `
      <div class="insight-card">
        <strong>Lead ID</strong>
        <span class="insight-value">${lead.lead_id || "-"}</span>
        <p>Primary record identifier.</p>
      </div>
      <div class="insight-card">
        <strong>Status</strong>
        <span class="insight-value"><span class="status-pill ${getStatusColor(lead.status)}">${lead.status || "-"}</span></span>
        <p>Current commercial status.</p>
      </div>
      <div class="insight-card">
        <strong>Owner</strong>
        <span class="insight-value">${lead.lead_owner || "-"}</span>
        <p>Lead responsibility.</p>
      </div>
      <div class="insight-card">
        <strong>Next follow-up</strong>
        <span class="insight-value">${formatDate(lead.next_followup_date)}</span>
        <p>Scheduled action date.</p>
      </div>
    `;
  }

  leadDetailBox.innerHTML = `
    <div class="lead-profile-sections">
      <div class="profile-section">
        <h3 class="profile-section-title">Customer Information</h3>
        <div class="profile-grid">
          <div class="profile-field">
            <span class="profile-label">Name</span>
            <span class="profile-value">${lead.customer_name || "-"}</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Contact No.</span>
            <span class="profile-value">${lead.contact_no || "-"}</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Email</span>
            <span class="profile-value">${lead.email || "-"}</span>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <h3 class="profile-section-title">Lead Information</h3>
        <div class="profile-grid">
          <div class="profile-field">
            <span class="profile-label">Source</span>
            <span class="profile-value">${lead.lead_source || "-"}</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Product Category</span>
            <span class="profile-value">${lead.product_category || "-"}</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Lead Status</span>
            <span class="profile-value"><span class="status-pill ${getStatusColor(lead.lead_status)}">${lead.lead_status || "-"}</span></span>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <h3 class="profile-section-title">Timeline & Details</h3>
        <div class="profile-grid">
          <div class="profile-field">
            <span class="profile-label">Created Date</span>
            <span class="profile-value">${formatDate(lead.date)}</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Next Follow-up</span>
            <span class="profile-value">${formatDate(lead.next_followup_date)}</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Order Value</span>
            <span class="profile-value">₹ ${lead.order_value || "0"}</span>
          </div>
        </div>
        <div class="profile-field profile-field-full">
          <span class="profile-label">Remarks</span>
          <span class="profile-value-text">${lead.remarks || "-"}</span>
        </div>
      </div>
    </div>
  `;
}

function renderFollowups() {
  const leadFollowups = followups.filter((followup) => followup.lead_id === lead.lead_id);

  if (leadFollowups.length === 0) {
    followupTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No follow-ups added yet.</td>
      </tr>
    `;
    return;
  }

  const rows = leadFollowups.map((followup) => `
      <tr>
        <td>${followup.followup_date}</td>
        <td>${followup.followup_type}</td>
        <td>${followup.followup_status}</td>
        <td>${followup.remarks}</td>
        <td>${followup.next_followup_date || "-"}</td>
      </tr>
    `);

  followupTableBody.innerHTML = rows.join("");
}

function renderTimeline() {
  const leadFollowups = followups
    .filter((followup) => followup.lead_id === lead.lead_id)
    .sort((a, b) => new Date(a.followup_date) - new Date(b.followup_date));

  const items = [];
  items.push(`
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <h4>Lead Created</h4>
        <p><strong>Date:</strong> ${lead.date || "-"}</p>
        <p><strong>Owner:</strong> ${lead.lead_owner || "-"}</p>
        <p><strong>Status:</strong> ${lead.status || "-"}</p>
        <p><strong>Remarks:</strong> ${lead.remarks || "-"}</p>
      </div>
    </div>
  `);

  leadFollowups.forEach((followup) => {
    items.push(`
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h4>${followup.followup_type || "Follow-up"} - ${followup.followup_status || "-"}</h4>
          <p><strong>Follow-up Date:</strong> ${followup.followup_date || "-"}</p>
          <p><strong>Remarks:</strong> ${followup.remarks || "-"}</p>
          <p><strong>Next Follow-up:</strong> ${followup.next_followup_date || "-"}</p>
          <p><strong>Updated By:</strong> ${followup.created_by || "-"}</p>
          <p><strong>Timestamp:</strong> ${followup.created_timestamp || "-"}</p>
        </div>
      </div>
    `);
  });

  timelineBox.innerHTML = items.join("");
}

followupForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const submitBtn = followupForm.querySelector("button[type='submit']");
  const resetSubmitState = () => {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add Follow-up";
    }
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";
  }

  if (!lead) {
    resetSubmitState();
    return;
  }

  if (lead.lead_status !== "Open") {
    alert("This lead is closed. No more follow-ups can be added.");
    resetSubmitState();
    return;
  }

  const followup_date = document.getElementById("followup_date").value;
  const followup_type = document.getElementById("followup_type").value;
  const followup_status = document.getElementById("followup_status").value;
  const remarks = document.getElementById("followup_remarks").value.trim();
  const next_followup_date = document.getElementById("next_followup_date").value;
  const conditionalFieldErrors = validateConditionalFieldValues();
  const conditionalFieldValues = collectConditionalFieldValues();

  const validationErrors = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!followup_date) {
    validationErrors.push("Follow-up Date is required.");
  }

  if (followup_date) {
    const followupDateObj = new Date(followup_date);
    if (followupDateObj > today) {
      validationErrors.push("Follow-up Date cannot be in the future.");
    }
  }

  if (remarks.length < 5) {
    validationErrors.push("Remarks must be at least 5 characters.");
  }

  if (remarks.length > 600) {
    validationErrors.push("Remarks cannot exceed 600 characters.");
  }

  const statusNeedsNextFollowup = followup_status !== "Won" && followup_status !== "Lost";
  if (statusNeedsNextFollowup && !next_followup_date) {
    validationErrors.push("Next Follow-up Date is required unless status is Won or Lost.");
  }

  if (next_followup_date && followup_date && next_followup_date < followup_date) {
    validationErrors.push("Next Follow-up Date cannot be earlier than Follow-up Date.");
  }

  validationErrors.push(...conditionalFieldErrors);

  document.getElementById("followup_date").classList.toggle(
    "is-invalid",
    !followup_date || new Date(followup_date) > today
  );
  document.getElementById("followup_remarks").classList.toggle(
    "is-invalid",
    remarks.length < 5 || remarks.length > 600
  );
  document.getElementById("next_followup_date").classList.toggle(
    "is-invalid",
    (statusNeedsNextFollowup && !next_followup_date) || (next_followup_date && followup_date && next_followup_date < followup_date)
  );

  if (validationErrors.length) {
    alert(`Please fix the following before submitting:\n\n- ${validationErrors.join("\n- ")}`);
    resetSubmitState();
    return;
  }

  const newFollowup = {
    type: "followup",
    followup_id: "FU-" + Date.now(),
    lead_id: lead.lead_id,
    customer_name: lead.customer_name,
    contact_no: lead.contact_no,
    followup_date,
    followup_type,
    followup_status,
    remarks,
    next_followup_date,
    conditional_fields: conditionalFieldValues,
    created_by: loggedInUser,
    created_role: userRole,
    created_timestamp: new Date().toLocaleString()
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(newFollowup)
    });

    const result = await res.json();

    if (result.success) {
      alert("Follow-up added successfully!");
      followupForm.reset();
      loadLeadAndFollowups();
    } else {
      alert("Failed to save follow-up.");
      resetSubmitState();
    }

  } catch (error) {
    console.error("Error saving follow-up:", error);
    alert("Error saving follow-up.");
    resetSubmitState();
  }
});
