let leads = [];

const dashboardCards = document.getElementById("dashboardCards");
const session = window.AuthSession ? window.AuthSession.requireValid() : null;
const loggedInUser = session ? session.username : "";
const userRole = session ? session.role : "";

if (!loggedInUser || !userRole) {
  window.location.href = "login.html";
}

const today = new Date().toISOString().split("T")[0];

function showDashboardFatal(message) {
  try {
    const target =
      document.getElementById("dashboardCards") ||
      document.querySelector(".page-content") ||
      document.body;

    target.innerHTML = `
      <div class="dashboard-card">
        <span class="stat-label">Dashboard Error</span>
        <p>${String(message || "Something went wrong.")}</p>
        <div class="stat-note">Check your API connection and browser console.</div>
      </div>
    `;
  } catch (e) {
    // Last resort: do nothing
  }
}

window.addEventListener("error", (event) => {
  const msg = event && event.message ? event.message : "Script error";
  showDashboardFatal(msg);
});
window.addEventListener("unhandledrejection", (event) => {
  const msg =
    event && event.reason
      ? event.reason.message || String(event.reason)
      : "Unhandled promise rejection";
  showDashboardFatal(msg);
});

if (dashboardCards) {
  dashboardCards.innerHTML = `
    <div class="dashboard-card">
      <span class="stat-label">Loading dashboard</span>
      <p>Please wait</p>
      <div class="stat-note">We are pulling your latest pipeline metrics.</div>
    </div>
  `;
} else {
  showDashboardFatal("Dashboard container not found (dashboardCards).");
}

async function loadDashboardData() {
  try {
    const leadsRaw = await window.AppDataCache.getResource("leads", {
      onUpdate: applyDashboardLeads
    });

    applyDashboardLeads(leadsRaw);
  } catch (error) {
    console.error("Dashboard load error:", error);

    showDashboardFatal(
      `Failed to load dashboard data. ${error && error.message ? error.message : ""}`.trim()
    );
  }
}

function applyDashboardLeads(leadsRaw) {
  if (!Array.isArray(leadsRaw)) {
    throw new Error("API did not return an array");
  }

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

  renderDashboard();
}

function renderDashboard() {
  let visibleLeads = [...leads];

  if (userRole !== "Manager" && userRole !== "Admin") {
    visibleLeads = visibleLeads.filter((lead) => lead.lead_owner === loggedInUser);
  }

  const totalLeads = visibleLeads.length;
  const openLeads = visibleLeads.filter((lead) => lead.lead_status === "Open").length;
  const wonLeads = visibleLeads.filter((lead) => lead.status === "Won").length;
  const lostLeads = visibleLeads.filter((lead) => lead.status === "Lost").length;

  const todayFollowups = visibleLeads.filter(
    (lead) => lead.lead_status === "Open" && lead.next_followup_date === today
  ).length;

  const overdueFollowups = visibleLeads.filter(
    (lead) => lead.lead_status === "Open" && lead.next_followup_date && lead.next_followup_date < today
  ).length;

  const upcomingFollowups = visibleLeads.filter(
    (lead) => lead.lead_status === "Open" && lead.next_followup_date && lead.next_followup_date > today
  ).length;

  const totalRevenue = visibleLeads
    .filter((lead) => lead.status === "Won")
    .reduce((sum, lead) => sum + (lead.order_value || 0), 0);

  const titlePrefix = userRole === "Manager" || userRole === "Admin" ? "Team" : "My";

  const cards = [
    {
      title: `${titlePrefix} Total Leads`,
      value: totalLeads,
      note: "All visible records in the active pipeline."
    },
    {
      title: `${titlePrefix} Open Leads`,
      value: openLeads,
      note: "Active opportunities still being worked."
    },
    {
      title: `${titlePrefix} Won Leads`,
      value: wonLeads,
      note: "Successful conversions closed as won."
    },
    {
      title: `${titlePrefix} Lost Leads`,
      value: lostLeads,
      note: "Closed opportunities that did not convert."
    },
    {
      title: `${titlePrefix} Today Follow-ups`,
      value: todayFollowups,
      note: "Follow-ups that require attention today."
    },
    {
      title: `${titlePrefix} Overdue Follow-ups`,
      value: overdueFollowups,
      note: "Open follow-ups that slipped past schedule."
    },
    {
      title: `${titlePrefix} Upcoming Follow-ups`,
      value: upcomingFollowups,
      note: "Future commitments already scheduled."
    },
    {
      title: `${titlePrefix} Revenue`,
      value: formatCurrency(totalRevenue),
      note: "Won order value based on visible data."
    }
  ];

  dashboardCards.innerHTML = cards
    .map(
      (card) => `
        <div class="dashboard-card stat-card">
          <span class="stat-label">${card.title}</span>
          <p>${card.value}</p>
          <div class="stat-note">${card.note}</div>
        </div>
      `
    )
    .join("");
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount || 0);
}

loadDashboardData();
