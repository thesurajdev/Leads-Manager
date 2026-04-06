let leads = [];
let followups = [];

const todayFollowupsBody = document.getElementById("todayFollowups");
const overdueFollowupsBody = document.getElementById("overdueFollowups");
const upcomingFollowupsBody = document.getElementById("upcomingFollowups");
const followupInsights = document.getElementById("followupInsights");

const loggedInUser = localStorage.getItem("loggedInUser");
const userRole = localStorage.getItem("userRole");

if (!loggedInUser || !userRole) {
  window.location.href = "login.html";
}

const today = new Date().toISOString().split("T")[0];

async function loadData() {
  try {
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

  } catch (error) {
    console.error("Error loading follow-up data:", error);

    todayFollowupsBody.innerHTML = `<tr><td colspan="7" class="empty-state">Failed to load follow-ups.</td></tr>`;
    overdueFollowupsBody.innerHTML = `<tr><td colspan="7" class="empty-state">Failed to load follow-ups.</td></tr>`;
    upcomingFollowupsBody.innerHTML = `<tr><td colspan="7" class="empty-state">Failed to load follow-ups.</td></tr>`;
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

function renderFollowupInsights(todayCount, overdueCount, upcomingCount) {
  if (!followupInsights) return;

  followupInsights.innerHTML = `
    <div class="insight-card">
      <strong>Due today</strong>
      <span class="insight-value">${todayCount}</span>
      <p>Follow-ups expected to be completed today.</p>
    </div>
    <div class="insight-card">
      <strong>Overdue</strong>
      <span class="insight-value">${overdueCount}</span>
      <p>Past-due follow-ups that should be prioritized.</p>
    </div>
    <div class="insight-card">
      <strong>Upcoming</strong>
      <span class="insight-value">${upcomingCount}</span>
      <p>Future follow-ups already scheduled.</p>
    </div>
  `;
}

function renderFollowups() {
  const todayRows = [];
  const overdueRows = [];
  const upcomingRows = [];

  let visibleLeads = [...leads];

  if (userRole !== "Manager" && userRole !== "Admin") {
    visibleLeads = visibleLeads.filter((lead) => lead.lead_owner === loggedInUser);
  }

  visibleLeads.forEach((lead) => {
    if (lead.lead_status !== "Open") return;
    if (!lead.next_followup_date) return;

    const nextDate = lead.next_followup_date;

    if (nextDate === today) {
      todayRows.push(createRow(lead));
    } else if (nextDate < today) {
      overdueRows.push(createRow(lead));
    } else {
      upcomingRows.push(createRow(lead));
    }
  });

  renderFollowupInsights(todayRows.length, overdueRows.length, upcomingRows.length);

  todayFollowupsBody.innerHTML =
    todayRows.length > 0
      ? todayRows.join("")
      : `<tr><td colspan="7" class="empty-state">No follow-ups for today.</td></tr>`;

  overdueFollowupsBody.innerHTML =
    overdueRows.length > 0
      ? overdueRows.join("")
      : `<tr><td colspan="7" class="empty-state">No overdue follow-ups.</td></tr>`;

  upcomingFollowupsBody.innerHTML =
    upcomingRows.length > 0
      ? upcomingRows.join("")
      : `<tr><td colspan="7" class="empty-state">No upcoming follow-ups.</td></tr>`;
}

function openLead(id) {
  localStorage.setItem("selectedLeadId", id);
  window.location.href = "lead-detail.html";
}

loadData();
