const leads = JSON.parse(localStorage.getItem("leads")) || [];
const followups = JSON.parse(localStorage.getItem("followups")) || [];

const todayFollowupsBody = document.getElementById("todayFollowups");
const overdueFollowupsBody = document.getElementById("overdueFollowups");
const upcomingFollowupsBody = document.getElementById("upcomingFollowups");

const today = new Date().toISOString().split("T")[0];

// Get latest follow-up per lead
const latestFollowupsMap = {};

followups.forEach((f) => {
  if (!latestFollowupsMap[f.lead_id] || f.created_at > latestFollowupsMap[f.lead_id].created_at) {
    latestFollowupsMap[f.lead_id] = f;
  }
});

const latestFollowups = Object.values(latestFollowupsMap);

function createRow(lead, latestFollowup) {
  return `
    <tr>
      <td>${lead.lead_id}</td>
      <td>${lead.customer_name}</td>
      <td>${lead.contact_no}</td>
      <td>${lead.lead_owner || "-"}</td>
      <td>${latestFollowup?.next_followup_date || "-"}</td>
      <td>${lead.status || "-"}</td>
      <td><button onclick="openLead(${lead.id})">Open</button></td>
    </tr>
  `;
}

function renderFollowups() {
  todayFollowupsBody.innerHTML = "";
  overdueFollowupsBody.innerHTML = "";
  upcomingFollowupsBody.innerHTML = "";

  leads.forEach((lead) => {
    if (lead.lead_status !== "Open") return;

    const latestFollowup = latestFollowupsMap[lead.lead_id];
    if (!latestFollowup || !latestFollowup.next_followup_date) return;

    const nextDate = latestFollowup.next_followup_date;

    if (nextDate === today) {
      todayFollowupsBody.innerHTML += createRow(lead, latestFollowup);
    } else if (nextDate < today) {
      overdueFollowupsBody.innerHTML += createRow(lead, latestFollowup);
    } else if (nextDate > today) {
      upcomingFollowupsBody.innerHTML += createRow(lead, latestFollowup);
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

renderFollowups();
