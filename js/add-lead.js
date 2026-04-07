const form = document.getElementById("leadForm");
const saveLeadBtn = document.getElementById("saveLeadBtn");
const pageTitle = document.getElementById("pageTitle");

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

const loggedInUser = localStorage.getItem("loggedInUser");
const userRole = localStorage.getItem("userRole");
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
    const res = await fetch(API_URL + "?action=master");
    const data = await res.json();

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

  } catch (error) {
    console.error("Master data load error:", error);
    alert("Failed to load dropdown master data.");
  }
}

// 🔥 Load existing lead for editing
async function loadLeadForEdit(leadId) {
  try {
    const res = await fetch(API_URL);
    const rawLeads = await res.json();

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

  const customer_name = document.getElementById("customer_name").value.trim();
  const contact_no = document.getElementById("contact_no").value.trim();
  const email = document.getElementById("email").value.trim();
  const lead_source = document.getElementById("lead_source").value.trim();
  const product_category = document.getElementById("product_category").value.trim();
  const lead_owner = document.getElementById("lead_owner").value.trim();
  const status = document.getElementById("status").value.trim();
  const remarks = document.getElementById("remarks").value.trim();

  const validation = validateLeadForm();
  if (!validation.valid) {
    alert(`Please fix the following before submitting:\n\n- ${validation.errors.join("\n- ")}`);
    saveLeadBtn.disabled = false;
    saveLeadBtn.innerText = isEditMode ? "Update Lead" : "Save Lead";
    isSubmitting = false;
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
        requested_by: loggedInUser,
        requested_role: userRole
      };

      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(updatePayload)
      });

      const result = await res.json();

      if (result.success) {
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

      saveLeadBtn.disabled = false;
      saveLeadBtn.innerText = "Update Lead";
      isSubmitting = false;
      return;
    }

    // 🔥 ADD NEW MODE
    const existingRes = await fetch(API_URL);
    const existingLeadsRaw = await existingRes.json();

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

      saveLeadBtn.disabled = false;
      saveLeadBtn.innerText = "Save Lead";
      isSubmitting = false;
      return;
    }

    const lead_id = "LD-" + Date.now();
    const created_date = new Date().toISOString().split("T")[0];

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
      lead_status: "Open",
      order_value: 0,
      next_followup_date: ""
    };

    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(newLead)
    });

    const result = await res.json();

    if (result.success) {
      alert("Lead added successfully!");
      window.location.href = "leads.html";
    } else if (result.duplicate) {
      alert(
        `Duplicate Lead Found!\n\n` +
        `Customer: ${result.duplicate_data.customer_name}\n` +
        `Lead ID: ${result.duplicate_data.lead_id}\n` +
        `Owner: ${result.duplicate_data.lead_owner}\n` +
        `Current Status: ${result.duplicate_data.status}\n\n` +
        `This lead is already OPEN and cannot be added again.`
      );

      saveLeadBtn.disabled = false;
      saveLeadBtn.innerText = "Save Lead";
      isSubmitting = false;
    } else {
      alert("Failed to save lead.\n\n" + JSON.stringify(result));

      saveLeadBtn.disabled = false;
      saveLeadBtn.innerText = "Save Lead";
      isSubmitting = false;
    }

  } catch (error) {
    console.error("REAL ERROR:", error);
    alert("Real Error:\n\n" + error.message);

    saveLeadBtn.disabled = false;
    saveLeadBtn.innerText = isEditMode ? "Update Lead" : "Save Lead";
    isSubmitting = false;
  }
});
