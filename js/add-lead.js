const form = document.getElementById("leadForm");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const customer_name = document.getElementById("customer_name").value.trim();
  const contact_no = document.getElementById("contact_no").value.trim();
  const email = document.getElementById("email").value.trim();
  const lead_source = document.getElementById("lead_source").value.trim();
  const product_category = document.getElementById("product_category").value.trim();
  const lead_owner = document.getElementById("lead_owner").value.trim();
  const status = document.getElementById("status").value;
  const remarks = document.getElementById("remarks").value.trim();

  const lead_id = "LD-" + Date.now();
  const created_date = new Date().toISOString().split("T")[0];

  const newLead = {
    lead_id,
    created_date,
    lead_owner,
    customer_name,
    contact_no,
    email_id: email,
    lead_source,
    product_category,
    status,
    remarks,
    lead_status: "Open",
    order_value: 0
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(newLead)
    });

    const result = await res.json();

    if (result.success) {
      alert("Lead added successfully!");
      window.location.href = "leads.html";
    } else {
      alert("Failed to save lead.");
    }
  } catch (error) {
    console.error("Error saving lead:", error);
    alert("Error saving lead.");
  }
});
