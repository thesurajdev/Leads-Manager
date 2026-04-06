let leads = [];
let reportRows = [];

const loggedInUser = localStorage.getItem("loggedInUser");

const reportAccessMessage = document.getElementById("reportAccessMessage");
const reportBuilder = document.getElementById("reportBuilder");
const reportOutput = document.getElementById("reportOutput");

const rowField = document.getElementById("rowField");
const columnField = document.getElementById("columnField");
const valueField = document.getElementById("valueField");
const filterField = document.getElementById("filterField");
const filterValue = document.getElementById("filterValue");
const generateReportBtn = document.getElementById("generateReportBtn");

if (!loggedInUser) {
  window.location.href = "login.html";
}

if (loggedInUser !== "Manager" && loggedInUser !== "Admin") {
  reportAccessMessage.innerHTML = `
    <p style="color:red; font-weight:bold;">
      Access denied. Only Manager/Admin can view reports.
    </p>
  `;
} else {
  reportBuilder.style.display = "block";
  loadLeads();
}

generateReportBtn.addEventListener("click", generateReport);

async function loadLeads() {
  try {
    const res = await fetch(API_URL);
    const rawLeads = await res.json();

    leads = rawLeads.map((lead) => ({
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

  } catch (error) {
    console.error("Error loading leads for report:", error);
    reportOutput.innerHTML = `<p style="color:red;">Failed to load report data.</p>`;
  }
}

function generateReport() {
  const rowKey = rowField.value;
  const colKey = columnField.value;
  const valueType = valueField.value;
  const filterKey = filterField.value;
  const filterVal = filterValue.value.trim().toLowerCase();

  let filtered = [...leads];

  // Apply filter
  if (filterKey && filterVal) {
    filtered = filtered.filter(item =>
      String(item[filterKey] || "").toLowerCase() === filterVal
    );
  }

  if (filtered.length === 0) {
    reportOutput.innerHTML = `<p>No matching data found.</p>`;
    reportRows = [];
    return;
  }

  if (!colKey) {
    generateSimpleReport(filtered, rowKey, valueType);
  } else {
    generatePivotReport(filtered, rowKey, colKey, valueType);
  }
}

function generateSimpleReport(data, rowKey, valueType) {
  const grouped = {};

  data.forEach(item => {
    const rowVal = item[rowKey] || "(Blank)";

    if (!grouped[rowVal]) {
      grouped[rowVal] = 0;
    }

    if (valueType === "count") {
      grouped[rowVal] += 1;
    } else if (valueType === "sum_order_value") {
      grouped[rowVal] += Number(item.order_value || 0);
    }
  });

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>${formatLabel(rowKey)}</th>
            <th>${valueType === "count" ? "Count of Leads" : "Sum of Order Value"}</th>
          </tr>
        </thead>
        <tbody>
  `;

  reportRows = [];

  Object.keys(grouped).sort().forEach(key => {
    const value = grouped[key];
    reportRows.push([key, value]);

    html += `
      <tr>
        <td>${key}</td>
        <td>${valueType === "sum_order_value" ? "₹ " + value : value}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  reportOutput.innerHTML = html;
}

function generatePivotReport(data, rowKey, colKey, valueType) {
  const rowValues = [...new Set(data.map(item => item[rowKey] || "(Blank)"))].sort();
  const colValues = [...new Set(data.map(item => item[colKey] || "(Blank)"))].sort();

  const pivot = {};

  rowValues.forEach(r => {
    pivot[r] = {};
    colValues.forEach(c => {
      pivot[r][c] = 0;
    });
  });

  data.forEach(item => {
    const r = item[rowKey] || "(Blank)";
    const c = item[colKey] || "(Blank)";

    if (valueType === "count") {
      pivot[r][c] += 1;
    } else if (valueType === "sum_order_value") {
      pivot[r][c] += Number(item.order_value || 0);
    }
  });

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>${formatLabel(rowKey)}</th>
            ${colValues.map(c => `<th>${c}</th>`).join("")}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
  `;

  reportRows = [];
  reportRows.push([formatLabel(rowKey), ...colValues, "Total"]);

  rowValues.forEach(r => {
    let total = 0;
    const rowData = [r];

    html += `<tr><td>${r}</td>`;

    colValues.forEach(c => {
      const val = pivot[r][c];
      total += val;
      rowData.push(val);

      html += `<td>${valueType === "sum_order_value" ? "₹ " + val : val}</td>`;
    });

    rowData.push(total);
    reportRows.push(rowData);

    html += `<td>${valueType === "sum_order_value" ? "₹ " + total : total}</td></tr>`;
  });

  // Grand total row
  html += `<tr><th>Total</th>`;
  const totalRow = ["Total"];
  let grandTotal = 0;

  colValues.forEach(c => {
    let colTotal = 0;
    rowValues.forEach(r => {
      colTotal += pivot[r][c];
    });
    totalRow.push(colTotal);
    grandTotal += colTotal;
    html += `<th>${valueType === "sum_order_value" ? "₹ " + colTotal : colTotal}</th>`;
  });

  totalRow.push(grandTotal);
  reportRows.push(totalRow);

  html += `<th>${valueType === "sum_order_value" ? "₹ " + grandTotal : grandTotal}</th></tr>`;

  html += `
        </tbody>
      </table>
    </div>
  `;

  reportOutput.innerHTML = html;
}

function formatLabel(key) {
  const labels = {
    lead_owner: "Lead Owner",
    lead_source: "Lead Source",
    product_category: "Product Category",
    status: "Status",
    lead_status: "Lead Status"
  };

  return labels[key] || key;
}

function exportReportCSV() {
  if (!reportRows || reportRows.length === 0) {
    alert("No report data to export.");
    return;
  }

  const csvContent = reportRows
    .map(row =>
      row.map(value => `"${String(value || "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `pivot_report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
