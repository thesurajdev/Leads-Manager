let leads = [];

const dashboardCards = document.getElementById("dashboardCards");
const loggedInUser = localStorage.getItem("loggedInUser");

if (!loggedInUser) {
  window.location.href = "login.html";
}

const today = new Date().toISOString().split("T")[0];

async function loadDashboardData() {
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

    renderDashboard();
  } catch (error) {
    console.error("Dashboard load error:", error);
    dashboardCards.innerHTML = `<p style="color:red;">Failed to load dashboard data.</p>`;
  }
}

function renderDashboard() {
  let visibleLeads = [...leads];

  // Role-based filtering
  if (loggedInUser !== "Manager" && loggedInUser !== "Admin") {
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
    loggedInUser === "Manager" || loggedInUser === "Admin"
      ? "Team"
      : "My";

  dashboardCards.innerHTML = `
    <div class="dashboard-grid">
      <div class="card">
        <h3>${titlePrefix} Total Leads</h3>
        <p>${totalLeads}</p>
      </div>

      <div class="card">
        <h3>${titlePrefix} Open Leads</h3>
        <p>${openLeads}</p>
      </div>

      <div class="card">
        <h3>${titlePrefix} Won Leads</h3>
        <p>${wonLeads}</p>
      </div>

      <div class="card">
        <h3>${titlePrefix} Lost Leads</h3>
        <p>${lostLeads}</p>
      </div>

      <div class="card">
        <h3>${titlePrefix} Today Follow-ups</h3>
        <p>${todayFollowups}</p>
      </div>

      <div class="card">
        <h3>${titlePrefix} Overdue Follow-ups</h3>
        <p>${overdueFollowups}</p>
      </div>

      <div class="card">
        <h3>${titlePrefix} Upcoming Follow-ups</h3>
        <p>${upcomingFollowups}</p>
      </div>

      <div class="card">
        <h3>${titlePrefix} Revenue</h3>
        <p>₹ ${totalRevenue}</p>
      </div>
    </div>
  `;
}

loadDashboardData();
