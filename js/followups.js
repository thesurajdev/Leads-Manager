let leads = [];
let followups = [];

const todayFollowupsBody = document.getElementById("todayFollowups");
const overdueFollowupsBody = document.getElementById("overdueFollowups");
const upcomingFollowupsBody = document.getElementById("upcomingFollowups");

const loggedInUser = localStorage.getItem("loggedInUser");
const userRole = localStorage.getItem("userRole");

if (!loggedInUser || !userRole) {
  window.location.href = "login.html";
}

const today = new Date().toISOString().split("T")[0];

async function loadData() {
  try {
    // Load Leads
    const leadsRes = await fetch(API_URL);
    const leadsRaw = await leadsRes.json();

    leads = leadsRaw.map((lead, index) => ({
      id: index + 1,
      lead_id: String(lead["Lead ID"] || ""),
      date: String(lead["Created Date"] || ""),
      lead_owner: String(lead["Lead Owner"] || ""),
      customer_name: String(lead["Customer Name"] || ""),
      contact_no: String(lead["Contact No."] || ""),
      email: String(lead["Email ID"] || ""),
      lead_source: String(lead["Lead Source"] || ""),
      product_category: String(lead["Product Category"] || ""),
      status: String(lead["Status"] || ""),
      remarks: String(lead["Remarks"] || ""),
      lead_status: String(lead["Lead Status"] || ""),
      order_value: Number(lead["Order Value"] || 0),
      next_followup_date: String(lead["Next Follow-up Date"] || "")
    }));

    // Load Followups (optional for future use)
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
    console.error("Error loading follow-up data:", error);

    todayFollowupsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Failed to load follow-ups.</td></tr>`;
    overdueFollowupsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Failed to load follow-ups.</td></tr>`;
    upcomingFollowupsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Failed to load follow-ups.</td></tr>`;
  }
}

function createRow(lead) {
  return `
    <tr>
      <td>${lead.lead_id}</td>
      <td>${lead.customer_name}</td>
      <td>${lead.contact_no}</td>
      <td>${lead.lead_owner || "-"}</td>
      <td>${lead.next_followup_date || "-"}</td>
      <td>${lead.status || "-"}</td>
      <td><button onclick="openLead(${lead.id})">Open</button></td>
    </tr>
  `;
}

function renderFollowups() {
  todayFollowupsBody.innerHTML = "";
  overdueFollowupsBody.innerHTML = "";
  upcomingFollowupsBody.innerHTML = "";

  let visibleLeads = [...leads];

  // 🔒 Role-based filtering
  if (userRole !== "Manager" && userRole !== "Admin") {
    visibleLeads = visibleLeads.filter((lead) => lead.lead_owner === loggedInUser);
  }

  visibleLeads.forEach((lead) => {
    if (lead.lead_status !== "Open") return;
    if (!lead.next_followup_date) return;

    const nextDate = lead.next_followup_date;

    if (nextDate === today) {
      todayFollowupsBody.innerHTML += createRow(lead);
    } else if (nextDate < today) {
      overdueFollowupsBody.innerHTML += createRow(lead);
    } else {
      upcomingFollowupsBody.innerHTML += createRow(lead);
    }
  });

  if (!todayFollowupsBody.innerHTML) {
    todayFollowupsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No follow-ups for today.</td></tr>`;
  }

  if (!overdueFollowupsBody.innerHTML) {
    overdueFollowupsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No overdue follow-ups.</td></tr>`;
  }

  if (!upcomingFollowupsBody.innerHTML) {
    upcomingFollowupsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No upcoming follow-ups.</td></tr>`;
  }
}

function openLead(id) {
  localStorage.setItem("selectedLeadId", id);
  window.location.href = "lead-detail.html";
}

loadData();
