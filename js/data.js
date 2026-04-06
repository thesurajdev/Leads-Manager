const defaultLeads = [
  {
    id: 1,
    lead_id: "LD-001",
    date: "2025-01-10",
    type: "New",
    lead_source: "IndiaMART",
    customer_name: "Rahul Sharma",
    contact_no: "9876543210",
    email: "rahul@example.com",
    location: "Jaipur",
    company_name: "Sharma Traders",
    product_category: "Machine",
    product_model_no: "MX-100",
    quantity: 2,
    lead_owner: "Anjali",
    status: "Follow-up",
    important: "Yes",
    remarks: "Interested, asked for quotation",
    lead_status: "Open",
    order_value: 0
  },
  {
    id: 2,
    lead_id: "LD-002",
    date: "2025-01-12",
    type: "New",
    lead_source: "Website",
    customer_name: "Vikas Meena",
    contact_no: "9988776655",
    email: "vikas@example.com",
    location: "Delhi",
    company_name: "Meena Enterprises",
    product_category: "Pump",
    product_model_no: "P-200",
    quantity: 1,
    lead_owner: "Pragati",
    status: "Won",
    important: "No",
    remarks: "Order confirmed",
    lead_status: "Closed",
    order_value: 85000
  }
];

if (!localStorage.getItem("leads")) {
  localStorage.setItem("leads", JSON.stringify(defaultLeads));
}
