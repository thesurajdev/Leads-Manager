let leads = JSON.parse(localStorage.getItem("leads")) || [];
let followups = JSON.parse(localStorage.getItem("followups")) || [];

const selectedLeadId = parseInt(localStorage.getItem("selectedLeadId"));
const lead = leads.find((l) => l.id === selectedLeadId);

const leadDetailBox = document.getElementById("leadDetailBox");
const followupForm = document.getElementById("followupForm");
const followupTableBody = document.getElementById("followupTableBody");

if (!lead) {
  leadDetailBox.innerHTML = "<p>Lead not found.</p>";
} else {
  renderLeadDetail();
  renderFollowups();
}

function renderLeadDetail() {
  leadDetailBox.innerHTML = `
    <div class="table-wrapper">
      <table>
        <tr><th>Lead ID</th><td>${lead.lead_id}</td></tr>
        <tr><th>Customer Name</th><td>${lead.customer_name}</td></tr>
        <tr><th>Contact No.</th><td>${lead.contact_no}</td></tr>
        <tr><th>Email</th><td>${lead.email || "-"}</td></tr>
        <tr><th>Lead Source</th><td>${lead.lead_source || "-"}</td></tr>
        <tr><th>Product Category</th><td>${lead.product_category || "-"}</td></tr>
        <tr><th>Lead Owner</th><td>${lead.lead_owner || "-"}</td></tr>
        <tr><th>Status</th><td>${lead.status || "-"}</td></tr>
        <tr><th>Lead Status</th><td>${lead.lead_status || "-"}</td></tr>
        <tr><th>Remarks</th><td>${lead.remarks || "-"}</td></tr>
      </table>
    </div>
  `;
}

function renderFollowups() {
  const leadFollowups = followups.filter(f => f.lead_id === lead.lead_id);

  followupTableBody.innerHTML = "";

  if (leadFollowups.length === 0) {
    followupTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;">No follow-ups added yet.</td>
      </tr>
    `;
    return;
  }

  leadFollowups.forEach(f => {
    followupTableBody.innerHTML += `
      <tr>
        <td>${f.followup_date}</td>
        <td>${f.followup_type}</td>
        <td>${f.followup_status}</td>
        <td>${f.remarks}</td>
        <td>${f.next_followup_date || "-"}</td>
      </tr>
    `;
  });
}

followupForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const followup_date = document.getElementById("followup_date").value;
  const followup_type = document.getElementById("followup_type").value;
  const followup_status = document.getElementById("followup_status").value;
  const remarks = document.getElementById("followup_remarks").value.trim();
  const next_followup_date = document.getElementById("next_followup_date").value;

  const newFollowup = {
    id: Date.now(),
    lead_id: lead.lead_id,
    customer_name: lead.customer_name,
    contact_no: lead.contact_no,
    followup_date,
    followup_type,
    followup_status,
    remarks,
    next_followup_date,
    created_by: lead.lead_owner,
    created_at: new Date().toLocaleString()
  };

  followups.push(newFollowup);
  localStorage.setItem("followups", JSON.stringify(followups));

  // Update lead main status and remarks
  lead.status = followup_status;
  lead.remarks = remarks;

  if (followup_status === "Won" || followup_status === "Lost") {
    lead.lead_status = "Closed";
  } else {
    lead.lead_status = "Open";
  }

  const leadIndex = leads.findIndex((l) => l.id === lead.id);
  leads[leadIndex] = lead;
  localStorage.setItem("leads", JSON.stringify(leads));

  followupForm.reset();
  renderLeadDetail();
  renderFollowups();

  alert("Follow-up added successfully!");
});
