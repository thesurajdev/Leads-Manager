const form = document.getElementById("leadForm");
const saveLeadBtn = document.getElementById("saveLeadBtn");

const loggedInUser = localStorage.getItem("loggedInUser");

if (!loggedInUser) {
  window.location.href = "login.html";
}

document.getElementById("lead_owner").value = loggedInUser;

// Prevent multiple clicks
let isSubmitting = false;

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (isSubmitting) return; // 🚫 stop repeated submit
  isSubmitting = true;

  saveLeadBtn.disabled = true;
  saveLeadBtn.innerText = "Saving...";

  const customer_name = document.getElementById("customer_name").value.trim();
  const contact_no = document.getElementById("contact_no").value.trim();
  const email = document.getElementById("email").value.trim();
  const lead_source = document.getElementById("lead_source").value.trim();
  const product_category = document.getElementById("product_category").value.trim();
  const lead_owner = document.getElementById("lead_owner").value.trim();
  const status = document.getElementById("status").value;
  const remarks = document.getElementById("remarks").value.trim();

  try {
    console.log("Fetching existing leads...");
    const existingRes = await fetch(API_URL);
    const existingLeadsRaw = await existingRes.json();

    const existingLeads = existingLeadsRaw.map((lead) => ({
      lead_id: String(lead["Lead ID"] || ""),
      customer_name: String(lead["Customer Name"] || ""),
      contact_no: String(lead["Contact No."] || ""),
      email: String(lead["Email ID"] || ""),
      lead_owner: String(lead["Lead Owner"] || ""),
      status: String(lead["Status"] || ""),
      lead_status: String(lead["Lead Status"] || "")
    }));

    // 🔴 Duplicate check (only OPEN leads)
    const duplicate = existingLeads.find((lead) => {
      const samePhone =
        String(lead.contact_no || "").trim() === String(contact_no || "").trim();

      const sameEmail =
        email &&
        String(lead.email || "").trim().toLowerCase() ===
          String(email || "").trim().toLowerCase();

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

      saveLeadBtn.disabled = false;
      saveLeadBtn.innerText = "Save Lead";
      isSubmitting = false;
      return;
    }

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
      order_value: 0,
      next_followup_date: ""
    };

    console.log("Saving lead:", newLead);

    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(newLead)
    });

    const result = await res.json();
    console.log("Save result:", result);

    if (result.success) {
        alert("Lead added successfully!");
        window.location.href = "leads.html";
      } else if (result.duplicate) {
        alert(
          `Duplicate Lead Found!\n\n` +
          `Customer: ${result.duplicate_data.customer_name}\n` +
          `Lead ID: ${result.duplicate_data.lead_id}\n` +
          `Owner: ${result.duplicate_data.lead_owner}\n` +
          `Current Status: ${result.duplicate_data.status}\n\n` +
          `This lead is already OPEN and cannot be added again.`
        );
      
        saveLeadBtn.disabled = false;
        saveLeadBtn.innerText = "Save Lead";
        isSubmitting = false;
      } else {
        alert("Failed to save lead.\n\n" + JSON.stringify(result));
      
        saveLeadBtn.disabled = false;
        saveLeadBtn.innerText = "Save Lead";
        isSubmitting = false;
      }

  } catch (error) {
    console.error("REAL ERROR:", error);
    alert("Real Error:\n\n" + error.message);

    saveLeadBtn.disabled = false;
    saveLeadBtn.innerText = "Save Lead";
    isSubmitting = false;
  }
});
