let leads = [];
let followups = [];

const selectedLeadId = localStorage.getItem("selectedLeadId");
const leadDetailBox = document.getElementById("leadDetailBox");
const followupForm = document.getElementById("followupForm");
const followupTableBody = document.getElementById("followupTableBody");
const timelineBox = document.getElementById("leadTimeline");
const leadSummaryStrip = document.getElementById("leadSummaryStrip");

const loggedInUser = localStorage.getItem("loggedInUser");
const userRole = localStorage.getItem("userRole");

if (!loggedInUser || !userRole) {
  window.location.href = "login.html";
}

let lead = null;

loadLeadAndFollowups();

async function loadLeadAndFollowups() {
  try {
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
        <span class="insight-value">${lead.status || "-"}</span>
        <p>Current commercial status of the lead.</p>
      </div>
      <div class="insight-card">
        <strong>Owner</strong>
        <span class="insight-value">${lead.lead_owner || "-"}</span>
        <p>User currently responsible for the lead.</p>
      </div>
      <div class="insight-card">
        <strong>Next follow-up</strong>
        <span class="insight-value">${lead.next_followup_date || "-"}</span>
        <p>The next scheduled action date on this record.</p>
      </div>
    `;
  }

  leadDetailBox.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">Customer Name</span><span class="detail-value">${lead.customer_name || "-"}</span></div>
      <div class="detail-item"><span class="detail-label">Contact No.</span><span class="detail-value">${lead.contact_no || "-"}</span></div>
      <div class="detail-item"><span class="detail-label">Email</span><span class="detail-value">${lead.email || "-"}</span></div>
      <div class="detail-item"><span class="detail-label">Lead Source</span><span class="detail-value">${lead.lead_source || "-"}</span></div>
      <div class="detail-item"><span class="detail-label">Product Category</span><span class="detail-value">${lead.product_category || "-"}</span></div>
      <div class="detail-item"><span class="detail-label">Lead Status</span><span class="detail-value">${lead.lead_status || "-"}</span></div>
      <div class="detail-item"><span class="detail-label">Created Date</span><span class="detail-value">${lead.date || "-"}</span></div>
      <div class="detail-item"><span class="detail-label">Remarks</span><span class="detail-value">${lead.remarks || "-"}</span></div>
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

  if (!lead) return;

  if (lead.lead_status !== "Open") {
    alert("This lead is closed. No more follow-ups can be added.");
    return;
  }

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
    }

  } catch (error) {
    console.error("Error saving follow-up:", error);
    alert("Error saving follow-up.");
  }
});
