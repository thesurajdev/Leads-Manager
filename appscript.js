function outputJSON(data) {
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  function normalizeHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  function doGet(e) {
    const action = e.parameter.action || "leads";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "meta") {
      const file = DriveApp.getFileById(ss.getId());

      return outputJSON({
        spreadsheet_id: ss.getId(),
        spreadsheet_last_updated: file.getLastUpdated().toISOString()
      });
    }
  
    // 🔥 MASTER DATA
    if (action === "master") {
      const sheet = ss.getSheetByName("Master_Data");
      const data = sheet.getDataRange().getValues();
  
      const headers = data[0];
      const rows = data.slice(1);
  
      const master = rows.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });
  
      return outputJSON(master);
    }
  
    // 🔥 FOLLOWUPS
    if (action === "followups") {
      const sheet = ss.getSheetByName("Followups");
      const data = sheet.getDataRange().getValues();
  
      const headers = data[0];
      const rows = data.slice(1);
  
      const followups = rows.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });
  
      return outputJSON(followups);
    }
  
    // 🔥 DEFAULT = LEADS
    const sheet = ss.getSheetByName("Leads_Master");
    const data = sheet.getDataRange().getValues();
  
    const headers = data[0];
    const rows = data.slice(1);
  
    const leads = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
  
    return outputJSON(leads);
  }
  
  function doPost(e) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const data = JSON.parse(e.postData.contents);
  
      // 🔐 LOGIN CHECK
      if (data.type === "login") {
        const sheet = ss.getSheetByName("Users");
        const dataRows = sheet.getDataRange().getValues();
  
        for (let i = 1; i < dataRows.length; i++) {
          const username = String(dataRows[i][0] || "");
          const password = String(dataRows[i][1] || "");
          const role = String(dataRows[i][2] || "");
  
          if (
            username === data.username &&
            password === data.password
          ) {
            return outputJSON({
              success: true,
              username,
              role
            });
          }
        }
  
        return outputJSON({
          success: false,
          message: "Invalid username or password"
        });
      }
  
      // 🔥 REASSIGN LEAD (Manager/Admin only)
      if (data.type === "reassignLead") {
        const leadSheet = ss.getSheetByName("Leads_Master");
        const leadData = leadSheet.getDataRange().getValues();
  
        const requestedRole = String(data.requested_role || "");
  
        const isManagerOrAdmin =
          requestedRole === "Manager" || requestedRole === "Admin";
  
        if (!isManagerOrAdmin) {
          return outputJSON({
            success: false,
            permission_denied: true,
            message: "Only Manager/Admin can reassign leads"
          });
        }
  
        for (let i = 1; i < leadData.length; i++) {
          if (String(leadData[i][0]) === String(data.lead_id)) {
            // Column C = Lead Owner
            leadSheet.getRange(i + 1, 3).setValue(data.new_owner || "");
  
            return outputJSON({
              success: true,
              message: "Lead reassigned successfully"
            });
          }
        }
  
        return outputJSON({
          success: false,
          message: "Lead not found for reassignment"
        });
      }
  
      // 🔥 UPDATE EXISTING LEAD
      if (data.type === "updateLead") {
        const leadSheet = ss.getSheetByName("Leads_Master");
        const leadData = leadSheet.getDataRange().getValues();
  
        for (let i = 1; i < leadData.length; i++) {
          if (String(leadData[i][0]) === String(data.lead_id)) {
            const existingOwner = String(leadData[i][2] || "");
            const requestedBy = String(data.requested_by || "");
            const requestedRole = String(data.requested_role || "");
  
            const isManagerOrAdmin =
              requestedRole === "Manager" || requestedRole === "Admin";
  
            const isOwner = existingOwner === requestedBy;
  
            if (!isManagerOrAdmin && !isOwner) {
              return outputJSON({
                success: false,
                permission_denied: true,
                message: "You can only edit your own leads"
              });
            }
  
            // Update row values
            leadSheet.getRange(i + 1, 3).setValue(data.lead_owner || "");         // C
            leadSheet.getRange(i + 1, 4).setValue(data.customer_name || "");      // D
            leadSheet.getRange(i + 1, 5).setValue(data.contact_no || "");         // E
            leadSheet.getRange(i + 1, 6).setValue(data.email_id || "");           // F
            leadSheet.getRange(i + 1, 7).setValue(data.lead_source || "");        // G
            leadSheet.getRange(i + 1, 8).setValue(data.product_category || "");   // H
            leadSheet.getRange(i + 1, 9).setValue(data.status || "");             // I
            leadSheet.getRange(i + 1, 10).setValue(data.remarks || "");           // J
  
            return outputJSON({
              success: true,
              message: "Lead updated successfully"
            });
          }
        }
  
        return outputJSON({
          success: false,
          message: "Lead not found for update"
        });
      }
  
      // 🔥 FOLLOW-UP SAVE + LEAD UPDATE
      if (data.type === "followup") {
        const followSheet = ss.getSheetByName("Followups");

        const followHeaders = followSheet.getRange(1, 1, 1, followSheet.getLastColumn()).getValues()[0];
        const followHeaderIndex = {};
        followHeaders.forEach((header, index) => {
          followHeaderIndex[normalizeHeader(header)] = index;
        });

        const followupBaseValues = {
          "Followup ID": data.followup_id || "",
          "Lead ID": data.lead_id || "",
          "Customer Name": data.customer_name || "",
          "Contact No.": data.contact_no || "",
          "Follow-up Date": data.followup_date || "",
          "Follow-up Type": data.followup_type || "",
          "Follow-up Status": data.followup_status || "",
          "Remarks": data.remarks || "",
          "Next Follow-up Date": data.next_followup_date || "",
          "Created By": data.created_by || "",
          "Created Timestamp": data.created_timestamp || ""
        };

        const newFollowupRow = new Array(followHeaders.length).fill("");
        Object.keys(followupBaseValues).forEach((header) => {
          const columnIndex = followHeaderIndex[normalizeHeader(header)];
          if (columnIndex !== undefined) {
            newFollowupRow[columnIndex] = followupBaseValues[header];
          }
        });

        const conditionalFields =
          data.conditional_fields && typeof data.conditional_fields === "object"
            ? data.conditional_fields
            : {};
        const unresolvedConditionalFields = {};

        Object.keys(conditionalFields).forEach((fieldName) => {
          const value = conditionalFields[fieldName];
          const columnIndex = followHeaderIndex[normalizeHeader(fieldName)];

          if (columnIndex !== undefined) {
            newFollowupRow[columnIndex] = value;
          } else {
            unresolvedConditionalFields[fieldName] = value;
          }
        });

        const extraDataColumnIndex =
          followHeaderIndex["additional data"] !== undefined
            ? followHeaderIndex["additional data"]
            : followHeaderIndex["additional fields"] !== undefined
              ? followHeaderIndex["additional fields"]
              : followHeaderIndex["dynamic fields"] !== undefined
                ? followHeaderIndex["dynamic fields"]
                : followHeaderIndex["conditional fields"];

        if (
          extraDataColumnIndex !== undefined &&
          Object.keys(unresolvedConditionalFields).length > 0
        ) {
          newFollowupRow[extraDataColumnIndex] = JSON.stringify(unresolvedConditionalFields);
        }

        followSheet.appendRow(newFollowupRow);
  
        // ALSO UPDATE LEADS_MASTER
        const leadSheet = ss.getSheetByName("Leads_Master");
        const leadData = leadSheet.getDataRange().getValues();
        const leadHeaders = leadData[0] || [];
        const leadHeaderIndex = {};
        leadHeaders.forEach((header, index) => {
          leadHeaderIndex[normalizeHeader(header)] = index;
        });

        const leadIdColumn =
          leadHeaderIndex["lead id"] !== undefined
            ? leadHeaderIndex["lead id"]
            : 0;
        const statusColumn = leadHeaderIndex["status"];
        const remarksColumn = leadHeaderIndex["remarks"];
        const leadStatusColumn = leadHeaderIndex["lead status"];
        const nextFollowupColumn = leadHeaderIndex["next follow up date"];
        const orderValueColumn =
          leadHeaderIndex["order value"] !== undefined
            ? leadHeaderIndex["order value"]
            : leadHeaderIndex["order value inr"];

        for (let i = 1; i < leadData.length; i++) {
          if (String(leadData[i][leadIdColumn]) !== String(data.lead_id)) {
            continue;
          }

          const updatedRow = leadData[i].slice();

          if (statusColumn !== undefined) {
            updatedRow[statusColumn] = data.followup_status || "";
          }

          if (remarksColumn !== undefined) {
            updatedRow[remarksColumn] = data.remarks || "";
          }

          const finalLeadStatus =
            data.followup_status === "Won" || data.followup_status === "Lost"
              ? "Closed"
              : "Open";

          if (leadStatusColumn !== undefined) {
            updatedRow[leadStatusColumn] = finalLeadStatus;
          }

          if (nextFollowupColumn !== undefined) {
            updatedRow[nextFollowupColumn] = data.next_followup_date || "";
          }

          Object.keys(conditionalFields).forEach((fieldName) => {
            const mappedColumn = leadHeaderIndex[normalizeHeader(fieldName)];
            if (mappedColumn !== undefined) {
              updatedRow[mappedColumn] = conditionalFields[fieldName];
            }
          });

          if (orderValueColumn !== undefined) {
            const conditionalOrderValue =
              conditionalFields["Order Value"] ||
              conditionalFields["Order value"] ||
              conditionalFields["order value"];

            if (conditionalOrderValue !== undefined && conditionalOrderValue !== "") {
              updatedRow[orderValueColumn] = conditionalOrderValue;
            }
          }

          leadSheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
          break;
        }
  
        return outputJSON({
          success: true,
          message: "Follow-up added and lead updated successfully"
        });
      }
  
      // 🔥 NEW LEAD SAVE WITH BACKEND DUPLICATE CHECK
      const leadSheet = ss.getSheetByName("Leads_Master");
      const leadData = leadSheet.getDataRange().getValues();
  
      const newContact = String(data.contact_no || "").trim();
      const newEmail = String(data.email_id || "").trim().toLowerCase();
  
      for (let i = 1; i < leadData.length; i++) {
        const existingLeadId = String(leadData[i][0] || "");
        const existingOwner = String(leadData[i][2] || "");
        const existingCustomer = String(leadData[i][3] || "");
        const existingContact = String(leadData[i][4] || "").trim();
        const existingEmail = String(leadData[i][5] || "").trim().toLowerCase();
        const existingStatus = String(leadData[i][8] || "");
        const existingLeadStatus = String(leadData[i][10] || "");
  
        const samePhone = existingContact && newContact && existingContact === newContact;
        const sameEmail = existingEmail && newEmail && existingEmail === newEmail;
  
        if ((samePhone || sameEmail) && existingLeadStatus === "Open") {
          return outputJSON({
            success: false,
            duplicate: true,
            message: "Duplicate open lead found",
            duplicate_data: {
              lead_id: existingLeadId,
              customer_name: existingCustomer,
              lead_owner: existingOwner,
              status: existingStatus
            }
          });
        }
      }
  
      // 🔥 SAVE NEW LEAD
      leadSheet.appendRow([
        data.lead_id || "",
        data.created_date || "",
        data.lead_owner || "",
        data.customer_name || "",
        data.contact_no || "",
        data.email_id || "",
        data.lead_source || "",
        data.product_category || "",
        data.status || "",
        data.remarks || "",
        data.lead_status || "",
        data.order_value || 0,
        data.next_followup_date || ""
      ]);
  
      return outputJSON({
        success: true,
        message: "Lead added successfully"
      });
  
    } catch (error) {
      return outputJSON({
        success: false,
        error: error.toString()
      });
    }
  }