let leads = [];

const dashboardCards = document.getElementById("dashboardCards");
const loggedInUser = localStorage.getItem("loggedInUser");
const userRole = localStorage.getItem("userRole");

if (!loggedInUser || !userRole) {
  window.location.href = "login.html";
}

const today = new Date().toISOString().split("T")[0];

// Show loading immediately
if (dashboardCards) {
  dashboardCards.innerHTML = `
    <div class="dashboard-card">
      <h3>Loading dashboard...</h3>
      <p>Please wait</p>
    </div>
  `;
}

async function loadDashboardData() {
  try {
    console.log("API_URL:", API_URL);

    const leadsRes = await fetch(API_URL);
    const leadsRaw = await leadsRes.json();

    console.log("Dashboard API Response:", leadsRaw);

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
  } catch (error) {
    console.error("Dashboard load error:", error);

    dashboardCards.innerHTML = `
      <div class="dashboard-card">
        <h3 style="color:#dc2626;">Dashboard Error</h3>
        <p style="color:#6b7280; margin-top:8px;">
          Failed to load dashboard data.
        </p>
        <p style="margin-top:10px; font-size:13px; color:#dc2626;">
          ${error.message}
        </p>
      </div>
    `;
  }
}

function renderDashboard() {
  let visibleLeads = [...leads];

  // Role-based filtering
  if (userRole !== "Manager" && userRole !== "Admin") {
    visibleLeads = visibleLeads.filter((lead) => lead.lead_owner === loggedInUser);
  }

  const totalLeads = visibleLeads.length;
  const openLeads = visibleLeads.filter(l => l.lead_status === "Open").length;
  const wonLeads = visibleLeads.filter(l => l.status === "Won").length;
  const lostLeads = visibleLeads.filter(l => l.status === "Lost").length;

  const todayFollowups = visibleLeads.filter(
    l => l.lead_status === "Open" && l.next_followup_date === today
  ).length;

  const overdueFollowups = visibleLeads.filter(
    l => l.lead_status === "Open" && l.next_followup_date && l.next_followup_date < today
  ).length;

  const upcomingFollowups = visibleLeads.filter(
    l => l.lead_status === "Open" && l.next_followup_date && l.next_followup_date > today
  ).length;

  const totalRevenue = visibleLeads
    .filter(l => l.status === "Won")
    .reduce((sum, l) => sum + (l.order_value || 0), 0);

  const titlePrefix =
    userRole === "Manager" || userRole === "Admin"
      ? "Team"
      : "My";

  dashboardCards.innerHTML = `
    <div class="dashboard-card stat-card">
      <h3>${titlePrefix} Total Leads</h3>
      <p>${totalLeads}</p>
    </div>

    <div class="dashboard-card stat-card">
      <h3>${titlePrefix} Open Leads</h3>
      <p>${openLeads}</p>
    </div>

    <div class="dashboard-card stat-card">
      <h3>${titlePrefix} Won Leads</h3>
      <p>${wonLeads}</p>
    </div>

    <div class="dashboard-card stat-card">
      <h3>${titlePrefix} Lost Leads</h3>
      <p>${lostLeads}</p>
    </div>

    <div class="dashboard-card stat-card">
      <h3>${titlePrefix} Today Follow-ups</h3>
      <p>${todayFollowups}</p>
    </div>

    <div class="dashboard-card stat-card">
      <h3>${titlePrefix} Overdue Follow-ups</h3>
      <p>${overdueFollowups}</p>
    </div>

    <div class="dashboard-card stat-card">
      <h3>${titlePrefix} Upcoming Follow-ups</h3>
      <p>${upcomingFollowups}</p>
    </div>

    <div class="dashboard-card stat-card">
      <h3>${titlePrefix} Revenue</h3>
      <p>${formatCurrency(totalRevenue)}</p>
    </div>
  `;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount || 0);
}

loadDashboardData();
