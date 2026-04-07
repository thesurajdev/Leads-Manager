let leads = [];
let reportRows = [];

const loggedInUser = localStorage.getItem("loggedInUser");
const userRole = localStorage.getItem("userRole");

const reportAccessMessage = document.getElementById("reportAccessMessage");
const reportBuilder = document.getElementById("reportBuilder");
const reportOutput = document.getElementById("reportOutput");

const rowField = document.getElementById("rowField");
const columnField = document.getElementById("columnField");
const valueField = document.getElementById("valueField");
const filterField = document.getElementById("filterField");
const filterValue = document.getElementById("filterValue");
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");
const generateReportBtn = document.getElementById("generateReportBtn");
const generateBtnDefaultText = generateReportBtn ? generateReportBtn.textContent : "Generate Report";
let reportDataReady = false;

if (!loggedInUser || !userRole) {
  window.location.href = "login.html";
}

if (userRole !== "Manager" && userRole !== "Admin") {
  reportAccessMessage.innerHTML = `
    <div class="access-denied">
      <strong>Access denied</strong>
      <p>Only Manager and Admin users can view reports.</p>
    </div>
  `;
} else {
  reportBuilder.style.display = "block";
  if (generateReportBtn) {
    generateReportBtn.disabled = true;
    generateReportBtn.textContent = "Loading data...";
  }
  reportOutput.innerHTML = `<div class="empty-state">Loading report data... Please wait.</div>`;
  loadLeads();
}

generateReportBtn.addEventListener("click", generateReport);
dateFrom.addEventListener("change", generateReport);
dateTo.addEventListener("change", generateReport);

async function loadLeads() {
  try {
    const rawLeads = await window.AppDataCache.getResource("leads", {
      onUpdate: applyReportLeads
    });

    applyReportLeads(rawLeads);
  } catch (error) {
    console.error("Error loading leads for report:", error);
    reportDataReady = false;
    if (generateReportBtn) {
      generateReportBtn.disabled = true;
      generateReportBtn.textContent = "Generate Report";
    }
    reportOutput.innerHTML = `<div class="access-denied"><strong>Report error</strong><p>Failed to load report data.</p></div>`;
  }
}

function applyReportLeads(rawLeads) {
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

  reportDataReady = true;
  if (generateReportBtn) {
    generateReportBtn.disabled = false;
    generateReportBtn.textContent = generateBtnDefaultText;
  }
  generateReport();
}

function generateReport() {
  if (!reportDataReady) {
    reportOutput.innerHTML = `<div class="empty-state">Loading report data... Please wait.</div>`;
    return;
  }

  const rowKey = rowField.value;
  const colKey = columnField.value;
  const valueType = valueField.value;
  const filterKey = filterField.value;
  const filterVal = filterValue.value.trim().toLowerCase();
  const fromDate = dateFrom.value;
  const toDate = dateTo.value;

  let filtered = [...leads];

  if (filterKey && filterVal) {
    filtered = filtered.filter((item) =>
      String(item[filterKey] || "").toLowerCase() === filterVal
    );
  }

  if (fromDate) {
    filtered = filtered.filter((item) => {
      const itemDate = String(item.date || "");
      return itemDate >= fromDate;
    });
  }

  if (toDate) {
    filtered = filtered.filter((item) => {
      const itemDate = String(item.date || "");
      return itemDate <= toDate;
    });
  }

  if (filtered.length === 0) {
    reportOutput.innerHTML = `<div class="empty-state">No matching data found for the selected filters.</div>`;
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

  data.forEach((item) => {
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

  const valueLabel = valueType === "count" ? "Count of Leads" : "Sum of Order Value";

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>${formatLabel(rowKey)}</th>
            <th>${valueLabel}</th>
          </tr>
        </thead>
        <tbody>
  `;

  reportRows = [[formatLabel(rowKey), valueLabel]];

  Object.keys(grouped).sort().forEach((key) => {
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
  const rowValues = [...new Set(data.map((item) => item[rowKey] || "(Blank)"))].sort();
  const colValues = [...new Set(data.map((item) => item[colKey] || "(Blank)"))].sort();

  const pivot = {};

  rowValues.forEach((row) => {
    pivot[row] = {};
    colValues.forEach((column) => {
      pivot[row][column] = 0;
    });
  });

  data.forEach((item) => {
    const row = item[rowKey] || "(Blank)";
    const column = item[colKey] || "(Blank)";

    if (valueType === "count") {
      pivot[row][column] += 1;
    } else if (valueType === "sum_order_value") {
      pivot[row][column] += Number(item.order_value || 0);
    }
  });

  let html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>${formatLabel(rowKey)}</th>
            ${colValues.map((column) => `<th>${column}</th>`).join("")}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
  `;

  reportRows = [];
  reportRows.push([formatLabel(rowKey), ...colValues, "Total"]);

  rowValues.forEach((row) => {
    let total = 0;
    const rowData = [row];

    html += `<tr><td>${row}</td>`;

    colValues.forEach((column) => {
      const value = pivot[row][column];
      total += value;
      rowData.push(value);

      html += `<td>${valueType === "sum_order_value" ? "₹ " + value : value}</td>`;
    });

    rowData.push(total);
    reportRows.push(rowData);

    html += `<td>${valueType === "sum_order_value" ? "₹ " + total : total}</td></tr>`;
  });

  html += `<tr><th>Total</th>`;
  const totalRow = ["Total"];
  let grandTotal = 0;

  colValues.forEach((column) => {
    let colTotal = 0;
    rowValues.forEach((row) => {
      colTotal += pivot[row][column];
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
    .map((row) =>
      row.map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(",")
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

function setDatePreset(type) {
  const now = new Date();

  let from = "";
  let to = "";

  if (type === "today") {
    const todayValue = now.toISOString().split("T")[0];
    from = todayValue;
    to = todayValue;
  }

  if (type === "week") {
    const temp = new Date();
    const day = temp.getDay();
    const diff = temp.getDate() - day;
    const firstDay = new Date(temp.setDate(diff));
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);

    from = firstDay.toISOString().split("T")[0];
    to = lastDay.toISOString().split("T")[0];
  }

  if (type === "month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    from = firstDay.toISOString().split("T")[0];
    to = lastDay.toISOString().split("T")[0];
  }

  if (type === "lastMonth") {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);

    from = firstDay.toISOString().split("T")[0];
    to = lastDay.toISOString().split("T")[0];
  }

  if (type === "clear") {
    from = "";
    to = "";
  }

  dateFrom.value = from;
  dateTo.value = to;

  generateReport();
}
