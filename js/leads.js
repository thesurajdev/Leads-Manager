let leads = [];
let filteredLeads = [];

const leadsTableBody = document.getElementById("leadsTableBody");
const searchInput = document.getElementById("searchInput");
const loggedInUser = localStorage.getItem("loggedInUser");

if (!loggedInUser) {
  window.location.href = "login.html";
}

async function fetchLeads() {
  try {
    const res = await fetch(API_URL);
    const rawLeads = await res.json();

    leads = rawLeads.map((lead, index) => ({
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
      order_value: Number(lead["Order Value"] || 0)
    }));

    // 🔥 Filter based on role
    if (loggedInUser !== "Manager" && loggedInUser !== "Admin") {
      leads = leads.filter((lead) => lead.lead_owner === loggedInUser);
    }

    filteredLeads = [...leads];
    renderLeads(filteredLeads);
  } catch (error) {
    console.error("Error loading leads:", error);
    leadsTableBody.innerHTML = `
      <tr><td colspan="11" style="text-align:center;">Failed to load leads.</td></tr>
    `;
  }
}

function getStatusBadge(status) {
  if (status === "New") return `<span class="badge new">New</span>`;
  if (status === "Follow-up") return `<span class="badge followup">Follow-up</span>`;
  if (status === "Won") return `<span class="badge won">Won</span>`;
  if (status === "Lost") return `<span class="badge lost">Lost</span>`;
  return status;
}

function renderLeads(data) {
  leadsTableBody.innerHTML = "";

  if (data.length === 0) {
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center;">No leads found.</td>
      </tr>
    `;
    return;
  }

  data.forEach((lead) => {
    const row = `
      <tr>
        <td>${lead.lead_id || "-"}</td>
        <td>${lead.date || "-"}</td>
        <td>${lead.customer_name || "-"}</td>
        <td>${lead.contact_no || "-"}</td>
        <td>${lead.lead_source || "-"}</td>
        <td>${lead.product_category || "-"}</td>
        <td>${lead.lead_owner || "-"}</td>
        <td>${getStatusBadge(lead.status || "-")}</td>
        <td>${lead.lead_status || "-"}</td>
        <td>₹ ${lead.order_value || 0}</td>
        <td>
          <button onclick="viewLead(${lead.id})">View</button>
        </td>
      </tr>
    `;
    leadsTableBody.innerHTML += row;
  });
}

function viewLead(id) {
  localStorage.setItem("selectedLeadId", id);
  window.location.href = "lead-detail.html";
}

searchInput.addEventListener("input", function () {
  const value = this.value.toLowerCase().trim();

  filteredLeads = leads.filter((lead) =>
    (lead.customer_name || "").toLowerCase().includes(value) ||
    (lead.contact_no || "").toLowerCase().includes(value) ||
    (lead.lead_source || "").toLowerCase().includes(value) ||
    (lead.lead_owner || "").toLowerCase().includes(value)
  );

  renderLeads(filteredLeads);
});

fetchLeads();
