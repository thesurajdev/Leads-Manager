let leads = [];
let filteredLeads = [];

const leadsTableBody = document.getElementById("leadsTableBody");

const session = window.AuthSession ? window.AuthSession.requireValid() : null;
const loggedInUser = session ? session.username : "";
const userRole = session ? session.role : "";

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const sourceFilter = document.getElementById("sourceFilter");
const productFilter = document.getElementById("productFilter");
const leadInsights = document.getElementById("leadInsights");
let filtersBound = false;
let sidebarSearchPrefill = "";

if (!loggedInUser || !userRole) {
  window.location.href = "login.html";
}

try {
  sidebarSearchPrefill = String(sessionStorage.getItem("lm_sidebar_search_query") || "").trim();
  if (sidebarSearchPrefill) {
    sessionStorage.removeItem("lm_sidebar_search_query");
  }
} catch (error) {
  sidebarSearchPrefill = "";
}

loadLeads();

function showLeadsLoadingState() {
  leadsTableBody.innerHTML = `
    <tr>
      <td colspan="11" class="empty-state">Loading leads... Please wait.</td>
    </tr>
  `;

  if (leadInsights) {
    leadInsights.innerHTML = `
      <div class="insight-card"><strong>Visible leads</strong><span class="insight-value">...</span><p>Fetching latest data.</p></div>
      <div class="insight-card"><strong>Open pipeline</strong><span class="insight-value">...</span><p>Fetching latest data.</p></div>
      <div class="insight-card"><strong>Today and overdue</strong><span class="insight-value">...</span><p>Fetching latest data.</p></div>
      <div class="insight-card"><strong>Won leads</strong><span class="insight-value">...</span><p>Fetching latest data.</p></div>
    `;
  }
}

async function loadLeads() {
  showLeadsLoadingState();

  try {
    const rawLeads = await window.AppDataCache.getResource("leads", {
      onUpdate: applyLeadsData
    });

    applyLeadsData(rawLeads);
  } catch (error) {
    console.error("Error loading leads:", error);
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="11" class="empty-state">Failed to load leads.</td>
      </tr>
    `;
  }
}

function applyLeadsData(rawLeads) {
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

  if (userRole !== "Manager" && userRole !== "Admin") {
    leads = leads.filter((lead) => lead.lead_owner === loggedInUser);
  }

  const previousSearch = searchInput.value || sidebarSearchPrefill;
  const previousStatus = statusFilter.value;
  const previousSource = sourceFilter.value;
  const previousProduct = productFilter.value;

  filteredLeads = [...leads];

  populateFilters();
  statusFilter.value = previousStatus;
  sourceFilter.value = previousSource;
  productFilter.value = previousProduct;
  searchInput.value = previousSearch;
  sidebarSearchPrefill = "";
  applyFilters();
  attachFilterEvents();
}

function getLeadPriority(lead) {
  const today = window.AppTime.todayISO();

  if (lead.lead_status !== "Open") {
    return { label: "Closed" };
  }

  if (lead.next_followup_date && lead.next_followup_date < today) {
    return { label: "Overdue" };
  }

  if (lead.next_followup_date === today) {
    return { label: "Today" };
  }

  const createdDate = lead.date;
  if (!createdDate) return { label: "Cold" };

  const diffDays = Math.floor(
    (new Date(today) - new Date(createdDate)) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 2) {
    return { label: "Hot" };
  }

  if (diffDays <= 7) {
    return { label: "Warm" };
  }

  return { label: "Cold" };
}

function renderLeadInsights(data) {
  if (!leadInsights) return;

  const openLeads = data.filter((lead) => lead.lead_status === "Open").length;
  const wonLeads = data.filter((lead) => lead.status === "Won").length;
  const priorities = data.map((lead) => getLeadPriority(lead).label);
  const overdueLeads = priorities.filter((priority) => priority === "Overdue").length;
  const todayLeads = priorities.filter((priority) => priority === "Today").length;

  leadInsights.innerHTML = `
    <div class="insight-card">
      <strong>Visible leads</strong>
      <span class="insight-value">${data.length}</span>
      <p>Records available under your current access scope.</p>
    </div>
    <div class="insight-card">
      <strong>Open pipeline</strong>
      <span class="insight-value">${openLeads}</span>
      <p>Active leads still in progress.</p>
    </div>
    <div class="insight-card">
      <strong>Today and overdue</strong>
      <span class="insight-value">${todayLeads + overdueLeads}</span>
      <p>${todayLeads} due today and ${overdueLeads} overdue.</p>
    </div>
    <div class="insight-card">
      <strong>Won leads</strong>
      <span class="insight-value">${wonLeads}</span>
      <p>Closed-won records in your visible set.</p>
    </div>
  `;
}

function getPriorityClass(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function populateFilters() {
  const statuses = [...new Set(leads.map((lead) => lead.status).filter(Boolean))];
  const sources = [...new Set(leads.map((lead) => lead.lead_source).filter(Boolean))];
  const products = [...new Set(leads.map((lead) => lead.product_category).filter(Boolean))];

  statusFilter.innerHTML = `<option value="">All Status</option>`;
  sourceFilter.innerHTML = `<option value="">All Sources</option>`;
  productFilter.innerHTML = `<option value="">All Products</option>`;

  statuses.forEach((status) => {
    statusFilter.innerHTML += `<option value="${status}">${status}</option>`;
  });

  sources.forEach((source) => {
    sourceFilter.innerHTML += `<option value="${source}">${source}</option>`;
  });

  products.forEach((product) => {
    productFilter.innerHTML += `<option value="${product}">${product}</option>`;
  });
}

function attachFilterEvents() {
  if (filtersBound) return;

  searchInput.addEventListener("input", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  sourceFilter.addEventListener("change", applyFilters);
  productFilter.addEventListener("change", applyFilters);
  filtersBound = true;
}

function applyFilters() {
  const searchValue = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value.trim();
  const selectedSource = sourceFilter.value.trim();
  const selectedProduct = productFilter.value.trim();

  filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.customer_name.toLowerCase().includes(searchValue) ||
      lead.contact_no.toLowerCase().includes(searchValue) ||
      lead.email.toLowerCase().includes(searchValue) ||
      lead.lead_id.toLowerCase().includes(searchValue) ||
      lead.lead_owner.toLowerCase().includes(searchValue) ||
      lead.status.toLowerCase().includes(searchValue) ||
      lead.lead_source.toLowerCase().includes(searchValue) ||
      lead.product_category.toLowerCase().includes(searchValue) ||
      lead.remarks.toLowerCase().includes(searchValue);

    const matchesStatus = !selectedStatus || lead.status === selectedStatus;
    const matchesSource = !selectedSource || lead.lead_source === selectedSource;
    const matchesProduct = !selectedProduct || lead.product_category === selectedProduct;

    return matchesSearch && matchesStatus && matchesSource && matchesProduct;
  });

  renderLeadInsights(filteredLeads);
  renderLeads(filteredLeads);
}

function resetFilters() {
  searchInput.value = "";
  statusFilter.value = "";
  sourceFilter.value = "";
  productFilter.value = "";

  filteredLeads = [...leads];
  renderLeadInsights(filteredLeads);
  renderLeads(filteredLeads);
}

function renderLeads(data) {
  if (data.length === 0) {
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="11" class="empty-state">No leads found.</td>
      </tr>
    `;
    return;
  }

  const isManagerOrAdmin = userRole === "Manager" || userRole === "Admin";

  const rows = data.map((lead) => {
    const priority = getLeadPriority(lead);
    const reassignBtn = isManagerOrAdmin
      ? `<button class="btn-warning" onclick="reassignLead('${lead.lead_id}', '${String(lead.lead_owner || "").replace(/'/g, "\\'")}')">Reassign</button>`
      : "";

    return `
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
        <td><span class="priority-badge ${getPriorityClass(priority.label)}">${priority.label}</span></td>
        <td>
          <div class="table-actions">
            <button onclick="viewLead(${lead.id})">View</button>
            <button class="btn-success" onclick="editLead('${String(lead.lead_id || "").replace(/'/g, "\\'")}')">Edit</button>
            ${reassignBtn}
          </div>
        </td>
      </tr>
    `;
  });

  leadsTableBody.innerHTML = rows.join("");
}

function viewLead(id) {
  localStorage.setItem("selectedLeadId", id);
  window.location.href = "lead-detail.html";
}

function editLead(leadId) {
  localStorage.setItem("editLeadId", leadId);
  window.location.href = "add-lead.html?mode=edit";
}

async function reassignLead(leadId, currentOwner) {
  const allowedAgents = [
    "Anjali", "Pragati", "Payal", "Hira",
    "Agent 5", "Agent 6", "Agent 7", "Agent 8", "Agent 9", "Agent 10"
  ];

  const newOwner = prompt(
    `Current Owner: ${currentOwner}\n\nEnter new agent name:\n\n${allowedAgents.join(", ")}`
  );

  if (!newOwner) return;

  if (!allowedAgents.includes(newOwner.trim())) {
    alert("Invalid agent name.");
    return;
  }

  if (newOwner.trim() === currentOwner.trim()) {
    alert("Already assigned.");
    return;
  }

  const confirmMove = confirm(`Reassign Lead ${leadId} to ${newOwner}?`);

  if (!confirmMove) return;

  try {
    const payload = {
      type: "reassignLead",
      lead_id: leadId,
      new_owner: newOwner.trim()
    };

    const result = await window.apiPost(payload);

    if (result.success) {
      alert("Reassigned successfully!");
      window.AppDataCache.invalidate(["leads", "followups"]);
      loadLeads();
    } else if (result.permission_denied) {
      alert("Permission denied.");
    } else {
      alert("Failed.\n" + JSON.stringify(result));
    }

  } catch (error) {
    console.error(error);
    alert("Error reassigning.");
  }
}

function exportLeadsCSV() {
  if (!filteredLeads.length) {
    alert("No data to export.");
    return;
  }

  const headers = [
    "Lead ID", "Created Date", "Lead Owner", "Customer Name", "Contact No.",
    "Email", "Lead Source", "Product Category", "Status", "Remarks",
    "Lead Status", "Order Value", "Next Follow-up Date"
  ];

  const rows = filteredLeads.map((lead) => [
    lead.lead_id, lead.date, lead.lead_owner, lead.customer_name, lead.contact_no,
    lead.email, lead.lead_source, lead.product_category, lead.status, lead.remarks,
    lead.lead_status, lead.order_value, lead.next_followup_date
  ]);

  const csv = [headers.join(","), ...rows.map((row) =>
    row.map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(",")
  )].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `leads_${window.AppTime.todayISO()}.csv`;
  a.click();
}
