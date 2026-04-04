let leads = JSON.parse(localStorage.getItem("leads")) || [];
let filteredLeads = [...leads];

const leadsTableBody = document.getElementById("leadsTableBody");
const searchInput = document.getElementById("searchInput");

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
          <button onclick="editLead(${lead.id})" style="margin-top:6px;background:#16a34a;">Edit</button>
          <button onclick="deleteLead(${lead.id})" style="margin-top:6px;background:#dc2626;">Delete</button>
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

function editLead(id) {
  localStorage.setItem("editLeadId", id);
  window.location.href = "add-lead.html";
}

function deleteLead(id) {
  const confirmDelete = confirm("Are you sure you want to delete this lead?");
  if (!confirmDelete) return;

  leads = leads.filter((lead) => lead.id !== id);
  localStorage.setItem("leads", JSON.stringify(leads));
  filteredLeads = [...leads];
  renderLeads(filteredLeads);
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

renderLeads(filteredLeads);
