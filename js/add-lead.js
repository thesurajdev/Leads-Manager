let leads = JSON.parse(localStorage.getItem("leads")) || [];

const form = document.getElementById("leadForm");

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const customer_name = document.getElementById("customer_name").value.trim();
  const contact_no = document.getElementById("contact_no").value.trim();
  const email = document.getElementById("email").value.trim();
  const lead_source = document.getElementById("lead_source").value.trim();
  const product_category = document.getElementById("product_category").value.trim();
  const lead_owner = document.getElementById("lead_owner").value.trim();
  const status = document.getElementById("status").value;
  const remarks = document.getElementById("remarks").value.trim();

  // 🔴 DUPLICATE CHECK (ONLY OPEN LEADS)
  const duplicate = leads.find(
    (lead) =>
      (lead.contact_no === contact_no || (email && lead.email === email)) &&
      lead.lead_status === "Open"
  );

  if (duplicate) {
    alert(
      `Lead already exists!\n\nCustomer: ${duplicate.customer_name}\nOwner: ${duplicate.lead_owner}\nStatus: ${duplicate.status}`
    );
    return;
  }

  // Generate Lead ID
  const newId = leads.length ? leads[leads.length - 1].id + 1 : 1;
  const leadId = "LD-" + String(newId).padStart(3, "0");

  const newLead = {
    id: newId,
    lead_id: leadId,
    date: new Date().toISOString().split("T")[0],
    customer_name,
    contact_no,
    email,
    lead_source,
    product_category,
    lead_owner,
    status,
    remarks,
    lead_status: "Open",
    order_value: 0
  };

  leads.push(newLead);
  localStorage.setItem("leads", JSON.stringify(leads));

  alert("Lead added successfully!");

  window.location.href = "leads.html";
});
