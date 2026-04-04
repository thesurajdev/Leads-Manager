const form = document.getElementById("leadForm");
const saveLeadBtn = document.getElementById("saveLeadBtn");

const loggedInUser = localStorage.getItem("loggedInUser");
const editLeadId = localStorage.getItem("editLeadId");

if (!loggedInUser) {
  window.location.href = "login.html";
}

document.getElementById("lead_owner").value = loggedInUser;

let isSubmitting = false;
let isEditMode = false;

if (editLeadId) {
  isEditMode = true;
  loadLeadForEdit(editLeadId);
}

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
      loggedInUser !== "Manager" &&
      loggedInUser !== "Admin" &&
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
  const status = document.getElementById("status").value;
  const remarks = document.getElementById("remarks").value.trim();

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
        requested_by: loggedInUser
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
