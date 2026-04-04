const leads = JSON.parse(localStorage.getItem("leads")) || [];

const totalLeads = leads.length;
const wonLeads = leads.filter(l => l.status === "Won").length;
const followUps = leads.filter(l => l.status === "Follow-up").length;
const openLeads = leads.filter(l => l.lead_status === "Open").length;

const totalRevenue = leads
  .filter(l => l.status === "Won")
  .reduce((sum, l) => sum + (l.order_value || 0), 0);

const dashboardCards = document.getElementById("dashboardCards");

dashboardCards.innerHTML = `
  <div class="table-wrapper">
    <table>
      <tr>
        <th>Total Leads</th>
        <th>Open Leads</th>
        <th>Follow-ups</th>
        <th>Won Leads</th>
        <th>Total Revenue</th>
      </tr>
      <tr>
        <td>${totalLeads}</td>
        <td>${openLeads}</td>
        <td>${followUps}</td>
        <td>${wonLeads}</td>
        <td>₹ ${totalRevenue}</td>
      </tr>
    </table>
  </div>
`;
