const leads = JSON.parse(localStorage.getItem("leads")) || [];

const totalLeads = leads.length;
const wonLeads = leads.filter(lead => lead.status === "Won").length;
const followUps = leads.filter(lead => lead.status === "Follow-up").length;
const openLeads = leads.filter(lead => lead.lead_status === "Open").length;

const dashboardCards = document.getElementById("dashboardCards");

dashboardCards.innerHTML = `
  <div class="table-wrapper">
    <table>
      <tr>
        <th>Total Leads</th>
        <th>Won Leads</th>
        <th>Follow-ups</th>
        <th>Open Leads</th>
      </tr>
      <tr>
        <td>${totalLeads}</td>
        <td>${wonLeads}</td>
        <td>${followUps}</td>
        <td>${openLeads}</td>
      </tr>
    </table>
  </div>
`;
