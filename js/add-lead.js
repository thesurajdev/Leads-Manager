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

  try {
    // 🔍 Step 1: Fetch existing leads from Google Sheet
    const existingRes = await fetch(API_URL);
    let existingLeads = await existingRes.json();

    // Normalize Google Sheet fields
    existingLeads = existingLeads.map((lead) => ({
      lead_id: lead["Lead ID"],
      customer_name: lead["Customer Name"],
      contact_no: lead["Contact No."],
      email: lead["Email ID"],
      lead_owner: lead["Lead Owner"],
      status: lead["Status"],
      lead_status: lead["Lead Status"]
    }));

    // 🔴 Step 2: Duplicate Check (ONLY OPEN LEADS)
    const duplicate = existingLeads.find((lead) => {
      const samePhone = (lead.contact_no || "").trim() === contact_no;
      const sameEmail =
        email &&
        (lead.email || "").trim().toLowerCase() === email.toLowerCase();

      return (samePhone || sameEmail) && lead.lead_status === "Open";
    });

    if (duplicate) {
      alert(
        `Duplicate Lead Found!\n\n` +
        `Customer: ${duplicate.customer_name}\n` +
        `Lead ID: ${duplicate.lead_id}\n` +
        `Owner: ${duplicate.lead_owner}\n` +
        `Current Status: ${duplicate.status}\n\n` +
        `This lead is already OPEN and cannot be added again.`
      );
      return;
    }

    // ✅ Step 3: If no duplicate, create new lead
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

    // 💾 Step 4: Save to Google Sheet
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
    console.error("Error:", error);
    alert("Error checking or saving lead.");
  }
});
