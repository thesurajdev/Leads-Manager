let leads = [];
let filteredLeads = [];

const leadsTableBody = document.getElementById("leadsTableBody");
const loggedInUser = localStorage.getItem("loggedInUser");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const sourceFilter = document.getElementById("sourceFilter");
const productFilter = document.getElementById("productFilter");

if (!loggedInUser) {
  window.location.href = "login.html";
}

loadLeads();

async function loadLeads() {
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
      order_value: Number(lead["Order Value"] || 0),
      next_followup_date: String(lead["Next Follow-up Date"] || "")
    }));

    // 🔒 Role-based lead visibility
    if (loggedInUser !== "Manager" && loggedInUser !== "Admin") {
      leads = leads.filter(lead => lead.lead_owner === loggedInUser);
    }

    filteredLeads = [...leads];

    populateFilters();
    renderLeads(filteredLeads);
    attachFilterEvents();

  } catch (error) {
    console.error("Error loading leads:", error);
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;">Failed to load leads.</td>
      </tr>
    `;
  }
}

function populateFilters() {
  const statuses = [...new Set(leads.map(l => l.status).filter(Boolean))];
  const sources = [...new Set(leads.map(l => l.lead_source).filter(Boolean))];
  const products = [...new Set(leads.map(l => l.product_category).filter(Boolean))];

  statusFilter.innerHTML = `<option value="">All Status</option>`;
  sourceFilter.innerHTML = `<option value="">All Sources</option>`;
  productFilter.innerHTML = `<option value="">All Products</option>`;

  statuses.forEach(status => {
    statusFilter.innerHTML += `<option value="${status}">${status}</option>`;
  });

  sources.forEach(source => {
    sourceFilter.innerHTML += `<option value="${source}">${source}</option>`;
  });

  products.forEach(product => {
    productFilter.innerHTML += `<option value="${product}">${product}</option>`;
  });
}

function attachFilterEvents() {
  searchInput.addEventListener("input", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  sourceFilter.addEventListener("change", applyFilters);
  productFilter.addEventListener("change", applyFilters);
}

function applyFilters() {
  const searchValue = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value.trim();
  const selectedSource = sourceFilter.value.trim();
  const selectedProduct = productFilter.value.trim();

  filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.customer_name.toLowerCase().includes(searchValue) ||
      lead.contact_no.toLowerCase().includes(searchValue) ||
      lead.email.toLowerCase().includes(searchValue) ||
      lead.lead_id.toLowerCase().includes(searchValue);

    const matchesStatus = !selectedStatus || lead.status === selectedStatus;
    const matchesSource = !selectedSource || lead.lead_source === selectedSource;
    const matchesProduct = !selectedProduct || lead.product_category === selectedProduct;

    return matchesSearch && matchesStatus && matchesSource && matchesProduct;
  });

  renderLeads(filteredLeads);
}

function resetFilters() {
  searchInput.value = "";
  statusFilter.value = "";
  sourceFilter.value = "";
  productFilter.value = "";

  filteredLeads = [...leads];
  renderLeads(filteredLeads);
}

function renderLeads(data) {
  leadsTableBody.innerHTML = "";

  if (data.length === 0) {
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;">No leads found.</td>
      </tr>
    `;
    return;
  }

  data.forEach(lead => {
    leadsTableBody.innerHTML += `
      <tr>
        <td>${lead.lead_id}</td>
        <td>${lead.customer_name}</td>
        <td>${lead.contact_no}</td>
        <td>${lead.email || "-"}</td>
        <td>${lead.lead_source || "-"}</td>
        <td>${lead.product_category || "-"}</td>
        <td>${lead.status || "-"}</td>
        <td>${lead.lead_owner || "-"}</td>
        <td>${lead.next_followup_date || "-"}</td>
        <td>
          <button onclick="viewLead(${lead.id})">View</button>
          <button onclick="editLead('${lead.lead_id}')" style="margin-top:6px;background:#16a34a;">Edit</button>
          ${
            loggedInUser === "Manager" || loggedInUser === "Admin"
              ? `<button onclick="reassignLead('${lead.lead_id}', '${lead.lead_owner}')" style="margin-top:6px;background:#f59e0b;">Reassign</button>`
              : ""
          }
        </td>
      </tr>
    `;
  });
}

function viewLead(id) {
  localStorage.setItem("selectedLeadId", id);
  window.location.href = "lead-detail.html";
}

function editLead(leadId) {
  localStorage.setItem("editLeadId", leadId);
  window.location.href = "add-lead.html";
}

async function reassignLead(leadId, currentOwner) {
  const allowedAgents = [
    "Anjali",
    "Pragati",
    "Payal",
    "Hira",
    "Agent 5",
    "Agent 6",
    "Agent 7",
    "Agent 8",
    "Agent 9",
    "Agent 10"
  ];

  const newOwner = prompt(
    `Current Owner: ${currentOwner}\n\nEnter new agent name exactly as below:\n\n${allowedAgents.join(", ")}`
  );

  if (!newOwner) return;

  if (!allowedAgents.includes(newOwner.trim())) {
    alert("Invalid agent name. Please enter a valid agent exactly.");
    return;
  }

  if (newOwner.trim() === currentOwner.trim()) {
    alert("This lead is already assigned to that agent.");
    return;
  }

  const confirmMove = confirm(
    `Are you sure you want to reassign Lead ${leadId} from ${currentOwner} to ${newOwner}?`
  );

  if (!confirmMove) return;

  try {
    const payload = {
      type: "reassignLead",
      lead_id: leadId,
      new_owner: newOwner.trim(),
      requested_by: loggedInUser
    };

    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success) {
      alert(`Lead reassigned successfully to ${newOwner}!`);
      loadLeads();
    } else if (result.permission_denied) {
      alert("Permission denied. Only Manager/Admin can reassign leads.");
    } else {
      alert("Failed to reassign lead.\n\n" + JSON.stringify(result));
    }

  } catch (error) {
    console.error("Reassign error:", error);
    alert("Error reassigning lead.");
  }
}

function exportLeadsCSV() {
  if (!filteredLeads || filteredLeads.length === 0) {
    alert("No leads available to export.");
    return;
  }

  const headers = [
    "Lead ID",
    "Created Date",
    "Lead Owner",
    "Customer Name",
    "Contact No.",
    "Email ID",
    "Lead Source",
    "Product Category",
    "Status",
    "Remarks",
    "Lead Status",
    "Order Value",
    "Next Follow-up Date"
  ];

  const rows = filteredLeads.map(lead => [
    lead.lead_id,
    lead.date,
    lead.lead_owner,
    lead.customer_name,
    lead.contact_no,
    lead.email,
    lead.lead_source,
    lead.product_category,
    lead.status,
    lead.remarks,
    lead.lead_status,
    lead.order_value,
    lead.next_followup_date
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row =>
      row.map(value => `"${String(value || "").replace(/"/g, '""')}"`).join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `leads_export_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
