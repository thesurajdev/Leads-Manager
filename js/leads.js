let leads = [];
let filteredLeads = [];

const leadsTableBody = document.getElementById("leadsTableBody");

const loggedInUser = localStorage.getItem("loggedInUser");
const userRole = localStorage.getItem("userRole");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const sourceFilter = document.getElementById("sourceFilter");
const productFilter = document.getElementById("productFilter");

if (!loggedInUser || !userRole) {
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

    // 🔒 Role-based visibility
    if (userRole !== "Manager" && userRole !== "Admin") {
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

function getLeadPriority(lead) {
  const today = new Date().toISOString().split("T")[0];

  // ⚫ Closed leads
  if (lead.lead_status !== "Open") {
    return { label: "Closed", color: "#6b7280" };
  }

  // 🔴 Overdue
  if (lead.next_followup_date && lead.next_followup_date < today) {
    return { label: "Overdue", color: "#ef4444" };
  }

  // 🔥 Today
  if (lead.next_followup_date === today) {
    return { label: "Today", color: "#f97316" };
  }

  const createdDate = lead.date;
  if (!createdDate) return { label: "-", color: "#9ca3af" };

  const diffDays = Math.floor(
    (new Date(today) - new Date(createdDate)) / (1000 * 60 * 60 * 24)
  );

  // 🟢 Hot
  if (diffDays <= 2) {
    return { label: "Hot", color: "#22c55e" };
  }

  // 🟠 Warm
  if (diffDays <= 7) {
    return { label: "Warm", color: "#f59e0b" };
  }

  // 🔵 Cold
  return { label: "Cold", color: "#3b82f6" };
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
  if (data.length === 0) {
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center;">No leads found.</td>
      </tr>
    `;
    return;
  }

  const isManagerOrAdmin = userRole === "Manager" || userRole === "Admin";

  const rows = data.map((lead) => {
    const priority = getLeadPriority(lead);
    const reassignBtn = isManagerOrAdmin
      ? `<button onclick="reassignLead('${lead.lead_id}', '${String(lead.lead_owner || "").replace(/'/g, "\\'")}')" style="margin-top:6px;background:#f59e0b;">Reassign</button>`
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
        <td>
          <span style="
            padding: 4px 8px;
            border-radius: 10px;
            color: white;
            background: ${priority.color};
            font-size: 12px;
            font-weight: 700;
            display: inline-block;
          ">
            ${priority.label}
          </span>
        </td>
        <td>
          <button onclick="viewLead(${lead.id})">View</button>
          <button onclick="editLead('${String(lead.lead_id || "").replace(/'/g, "\\'")}')" style="margin-top:6px;background:#16a34a;">Edit</button>
          ${reassignBtn}
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
  window.location.href = "add-lead.html";
}

async function reassignLead(leadId, currentOwner) {
  const allowedAgents = [
    "Anjali","Pragati","Payal","Hira",
    "Agent 5","Agent 6","Agent 7","Agent 8","Agent 9","Agent 10"
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

  const confirmMove = confirm(
    `Reassign Lead ${leadId} to ${newOwner}?`
  );

  if (!confirmMove) return;

  try {
    const payload = {
      type: "reassignLead",
      lead_id: leadId,
      new_owner: newOwner.trim(),
      requested_by: loggedInUser,
      requested_role: userRole
    };

    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success) {
      alert("Reassigned successfully!");
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
    "Lead ID","Created Date","Lead Owner","Customer Name","Contact No.",
    "Email","Lead Source","Product Category","Status","Remarks",
    "Lead Status","Order Value","Next Follow-up Date"
  ];

  const rows = filteredLeads.map(l => [
    l.lead_id,l.date,l.lead_owner,l.customer_name,l.contact_no,
    l.email,l.lead_source,l.product_category,l.status,l.remarks,
    l.lead_status,l.order_value,l.next_followup_date
  ]);

  const csv = [headers.join(","), ...rows.map(r =>
    r.map(v => `"${String(v||"").replace(/"/g,'""')}"`).join(",")
  )].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
}
