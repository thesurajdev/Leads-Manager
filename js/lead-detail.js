let leads = [];
let followups = [];

const selectedLeadId = localStorage.getItem("selectedLeadId");
const leadDetailBox = document.getElementById("leadDetailBox");
const followupForm = document.getElementById("followupForm");
const followupTableBody = document.getElementById("followupTableBody");

let lead = null;

async function loadLeadAndFollowups() {
  try {
    // Load leads
    const leadsRes = await fetch(API_URL);
    const leadsRaw = await leadsRes.json();

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
      order_value: Number(item["Order Value"] || 0)
    }));

    lead = leads.find((l) => String(l.id) === String(selectedLeadId));

    if (!lead) {
      leadDetailBox.innerHTML = "<p>Lead not found.</p>";
      return;
    }

    renderLeadDetail();

    // Load followups
    const followRes = await fetch(API_URL + "?action=followups");
    const followRaw = await followRes.json();

    followups = followRaw.map((f) => ({
      followup_id: String(f["Followup ID"] || ""),
      lead_id: String(f["Lead ID"] || ""),
      customer_name: String(f["Customer Name"] || ""),
      contact_no: String(f["Contact No."] || ""),
      followup_date: String(f["Follow-up Date"] || ""),
      followup_type: String(f["Follow-up Type"] || ""),
      followup_status: String(f["Follow-up Status"] || ""),
      remarks: String(f["Remarks"] || ""),
      next_followup_date: String(f["Next Follow-up Date"] || ""),
      created_by: String(f["Created By"] || ""),
      created_timestamp: String(f["Created Timestamp"] || "")
    }));

    renderFollowups();

  } catch (error) {
    console.error("Error loading lead/followups:", error);
    leadDetailBox.innerHTML = "<p>Failed to load lead details.</p>";
  }
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

followupForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!lead) return;

  const followup_date = document.getElementById("followup_date").value;
  const followup_type = document.getElementById("followup_type").value;
  const followup_status = document.getElementById("followup_status").value;
  const remarks = document.getElementById("followup_remarks").value.trim();
  const next_followup_date = document.getElementById("next_followup_date").value;

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
    created_by: lead.lead_owner,
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
    }

  } catch (error) {
    console.error("Error saving follow-up:", error);
    alert("Error saving follow-up.");
  }
});

loadLeadAndFollowups();
