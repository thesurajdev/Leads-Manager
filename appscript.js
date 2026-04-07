function outputJSON(data) {
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
  const LOGIN_WINDOW_SECONDS = 15 * 60;
  const LOGIN_MAX_ATTEMPTS = 8;

  function base64UrlEncode(input) {
    const bytes = input instanceof Uint8Array ? input : Utilities.newBlob(String(input)).getBytes();
    return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, "");
  }

  function sha256Hex(value) {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value));
    return digest
      .map((byte) => {
        const normalized = byte < 0 ? byte + 256 : byte;
        return ("0" + normalized.toString(16)).slice(-2);
      })
      .join("");
  }

  function getSigningSecret() {
    const props = PropertiesService.getScriptProperties();
    let secret = props.getProperty("LM_SIGNING_SECRET");
    if (!secret) {
      secret = Utilities.getUuid() + Utilities.getUuid();
      props.setProperty("LM_SIGNING_SECRET", secret);
    }
    return secret;
  }

  function signTokenPayload(payloadEncoded) {
    const signatureBytes = Utilities.computeHmacSha256Signature(payloadEncoded, getSigningSecret());
    return base64UrlEncode(new Uint8Array(signatureBytes));
  }

  function createSessionToken(username, role) {
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    const payload = {
      sub: String(username || ""),
      role: String(role || ""),
      exp: expiresAt
    };
    const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
    const signature = signTokenPayload(payloadEncoded);
    return {
      token: payloadEncoded + "." + signature,
      expiresAt
    };
  }

  function timingSafeEqual(a, b) {
    const left = String(a || "");
    const right = String(b || "");
    const maxLen = Math.max(left.length, right.length);
    let diff = left.length === right.length ? 0 : 1;

    for (let i = 0; i < maxLen; i++) {
      const leftCode = i < left.length ? left.charCodeAt(i) : 0;
      const rightCode = i < right.length ? right.charCodeAt(i) : 0;
      diff |= leftCode ^ rightCode;
    }

    return diff === 0;
  }

  function verifySessionToken(token) {
    const raw = String(token || "").trim();
    if (!raw || raw.indexOf(".") === -1) return null;

    const parts = raw.split(".");
    if (parts.length !== 2) return null;

    const payloadEncoded = parts[0];
    const providedSignature = parts[1];
    const expectedSignature = signTokenPayload(payloadEncoded);

    if (!timingSafeEqual(expectedSignature, providedSignature)) {
      return null;
    }

    let payload;
    try {
      payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadEncoded)).getDataAsString());
    } catch (_error) {
      return null;
    }

    if (!payload || !payload.sub || !payload.role || !payload.exp) {
      return null;
    }

    if (Number(payload.exp) <= Date.now()) {
      return null;
    }

    return {
      username: String(payload.sub),
      role: String(payload.role),
      expiresAt: Number(payload.exp)
    };
  }

  function parseRequestData(e) {
    try {
      if (!e || !e.postData || !e.postData.contents) return {};
      const parsed = JSON.parse(e.postData.contents);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function requireSession(data, e) {
    const tokenFromBody = data && data.auth_token ? String(data.auth_token) : "";
    const tokenFromQuery = e && e.parameter && e.parameter.auth_token ? String(e.parameter.auth_token) : "";
    const session = verifySessionToken(tokenFromBody || tokenFromQuery);
    if (!session) {
      return {
        ok: false,
        response: outputJSON({
          success: false,
          unauthorized: true,
          message: "Unauthorized or expired session"
        })
      };
    }
    return { ok: true, session };
  }

  function isManagerOrAdmin(role) {
    const normalized = String(role || "");
    return normalized === "Manager" || normalized === "Admin";
  }

  function sanitizeCellValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "number" || typeof value === "boolean") return value;

    const str = String(value).trim();
    if (!str) return "";

    // Prevent formula execution when values are opened in spreadsheet cells.
    if (/^[=+\-@]/.test(str)) {
      return "'" + str;
    }

    return str;
  }

  function verifyPassword(inputPassword, storedPassword) {
    const input = String(inputPassword || "");
    const stored = String(storedPassword || "");

    if (stored.indexOf("sha256$") === 0) {
      const parts = stored.split("$");
      if (parts.length !== 3) return false;
      const salt = parts[1];
      const expectedHex = parts[2];
      const computedHex = sha256Hex(salt + ":" + input);
      return timingSafeEqual(computedHex, expectedHex);
    }

    // Legacy fallback. Existing plain-text rows should be migrated to hashed format.
    return timingSafeEqual(input, stored);
  }

  function rateLimitKey(username) {
    return "login_attempts:" + String(username || "").trim().toLowerCase();
  }

  function getLoginAttemptCount(username) {
    const cache = CacheService.getScriptCache();
    const raw = cache.get(rateLimitKey(username));
    return Number(raw || 0);
  }

  function increaseLoginAttemptCount(username) {
    const cache = CacheService.getScriptCache();
    const next = getLoginAttemptCount(username) + 1;
    cache.put(rateLimitKey(username), String(next), LOGIN_WINDOW_SECONDS);
    return next;
  }

  function clearLoginAttemptCount(username) {
    CacheService.getScriptCache().remove(rateLimitKey(username));
  }

  function mapSheetRows(sheet) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0] || [];
    const rows = data.slice(1);
    return rows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
  }

  function normalizeHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildHeaderIndex(headers) {
    const index = {};
    headers.forEach((header, position) => {
      index[normalizeHeader(header)] = position;
    });
    return index;
  }

  function getAdditionalDataColumnIndex(headerIndex) {
    return headerIndex["additional data"] !== undefined
      ? headerIndex["additional data"]
      : headerIndex["additional fields"] !== undefined
        ? headerIndex["additional fields"]
        : headerIndex["dynamic fields"] !== undefined
          ? headerIndex["dynamic fields"]
          : headerIndex["conditional fields"];
  }

  function applyConditionalFieldsToRow(row, headerIndex, conditionalFields) {
    const unresolvedConditionalFields = {};

    Object.keys(conditionalFields).forEach((fieldName) => {
      const mappedColumn = headerIndex[normalizeHeader(fieldName)];
      if (mappedColumn !== undefined) {
        row[mappedColumn] = sanitizeCellValue(conditionalFields[fieldName]);
      } else {
        unresolvedConditionalFields[fieldName] = sanitizeCellValue(conditionalFields[fieldName]);
      }
    });

    const extraDataColumnIndex = getAdditionalDataColumnIndex(headerIndex);
    if (
      extraDataColumnIndex !== undefined &&
      Object.keys(unresolvedConditionalFields).length > 0
    ) {
      row[extraDataColumnIndex] = JSON.stringify(unresolvedConditionalFields);
    }
  }
  
  function doGet(e) {
    const action = e.parameter.action || "leads";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const auth = requireSession({}, e);
    if (!auth.ok) return auth.response;
    const session = auth.session;

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
      return outputJSON(mapSheetRows(sheet));
    }
  
    // 🔥 FOLLOWUPS
    if (action === "followups") {
      const sheet = ss.getSheetByName("Followups");
      let followups = mapSheetRows(sheet);
      if (!isManagerOrAdmin(session.role)) {
        followups = followups.filter((item) => String(item["Created By"] || "") === session.username);
      }
      return outputJSON(followups);
    }

    if (action === "global_search") {
      const query = String((e.parameter && e.parameter.q) || "").trim().toLowerCase();
      if (!query) {
        return outputJSON({ query: "", total: 0, results: [] });
      }

      const isPrivileged = isManagerOrAdmin(session.role);
      const results = [];
      const MAX_RESULTS = 40;

      const leadsSheet = ss.getSheetByName("Leads_Master");
      const allLeads = mapSheetRows(leadsSheet);
      allLeads.forEach((lead) => {
        if (results.length >= MAX_RESULTS) return;

        const owner = String(lead["Lead Owner"] || "");
        const isOwnedByUser = owner === session.username;
        const leadId = String(lead["Lead ID"] || "");
        const customer = String(lead["Customer Name"] || "");
        const contact = String(lead["Contact No."] || "");
        const email = String(lead["Email ID"] || "");
        const source = String(lead["Lead Source"] || "");
        const status = String(lead["Status"] || "");

        const searchable = [leadId, customer, contact, email, source, status, owner].join(" ").toLowerCase();
        if (searchable.indexOf(query) === -1) return;

        if (!isPrivileged && !isOwnedByUser) {
          results.push({
            kind: "lead",
            title: leadId || "Lead",
            subtitle: customer || "Assigned lead",
            owner: owner || "Unassigned",
            assigned_to_me: false,
            access: "restricted",
            target_page: "leads.html"
          });
          return;
        }

        results.push({
          kind: "lead",
          title: leadId || "Lead",
          subtitle: customer || "Lead",
          owner: owner || "Unassigned",
          assigned_to_me: isOwnedByUser,
          status: status,
          contact: contact,
          target_page: "leads.html"
        });
      });

      if (results.length < MAX_RESULTS) {
        const followupSheet = ss.getSheetByName("Followups");
        const allFollowups = mapSheetRows(followupSheet);
        allFollowups.forEach((item) => {
          if (results.length >= MAX_RESULTS) return;

          const createdBy = String(item["Created By"] || "");
          const isOwnedByUser = createdBy === session.username;
          const leadId = String(item["Lead ID"] || "");
          const notes = String(item["Remarks"] || item["Notes"] || "");
          const nextDate = String(item["Next Follow-up Date"] || "");
          const status = String(item["Status"] || "");

          const searchable = [leadId, notes, nextDate, status, createdBy].join(" ").toLowerCase();
          if (searchable.indexOf(query) === -1) return;

          if (!isPrivileged && !isOwnedByUser) {
            results.push({
              kind: "followup",
              title: leadId || "Follow-up",
              subtitle: "Not assigned to you",
              owner: createdBy || "Unknown",
              assigned_to_me: false,
              access: "restricted",
              target_page: "followups.html"
            });
            return;
          }

          results.push({
            kind: "followup",
            title: leadId || "Follow-up",
            subtitle: status || "Follow-up",
            owner: createdBy || "Unknown",
            assigned_to_me: isOwnedByUser,
            target_page: "followups.html"
          });
        });
      }

      if (results.length < MAX_RESULTS) {
        const masterSheet = ss.getSheetByName("Master_Data");
        const masterRows = mapSheetRows(masterSheet);
        masterRows.forEach((row) => {
          if (results.length >= MAX_RESULTS) return;

          const source = String(row["Lead Source"] || "");
          const category = String(row["Product Category"] || "");
          const model = String(row["Product Model"] || row["Product Model No"] || "");
          const searchable = [source, category, model].join(" ").toLowerCase();
          if (searchable.indexOf(query) === -1) return;

          results.push({
            kind: "master",
            title: category || source || "Master Data",
            subtitle: [source, model].filter(Boolean).join(" - ") || "Reference data",
            owner: "Shared",
            assigned_to_me: true,
            target_page: "reports.html"
          });
        });
      }

      return outputJSON({
        query: query,
        total: results.length,
        results: results
      });
    }
  
    // 🔥 DEFAULT = LEADS
    const sheet = ss.getSheetByName("Leads_Master");
    let leads = mapSheetRows(sheet);
    if (!isManagerOrAdmin(session.role)) {
      leads = leads.filter((item) => String(item["Lead Owner"] || "") === session.username);
    }
    return outputJSON(leads);
  }
  
  function doPost(e) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const data = parseRequestData(e);

      if (!data || typeof data !== "object") {
        return outputJSON({
          success: false,
          message: "Invalid request payload"
        });
      }
  
      // 🔐 LOGIN CHECK
      if (data.type === "login") {
        const usernameInput = String(data.username || "").trim();
        const passwordInput = String(data.password || "");

        if (!usernameInput || !passwordInput) {
          return outputJSON({
            success: false,
            message: "Username and password are required"
          });
        }

        if (getLoginAttemptCount(usernameInput) >= LOGIN_MAX_ATTEMPTS) {
          return outputJSON({
            success: false,
            throttled: true,
            message: "Too many failed attempts. Try again later."
          });
        }

        const sheet = ss.getSheetByName("Users");
        const dataRows = sheet.getDataRange().getValues();
  
        for (let i = 1; i < dataRows.length; i++) {
          const username = String(dataRows[i][0] || "");
          const password = String(dataRows[i][1] || "");
          const role = String(dataRows[i][2] || "");
  
          if (timingSafeEqual(username, usernameInput) && verifyPassword(passwordInput, password)) {
            clearLoginAttemptCount(usernameInput);
            const sessionToken = createSessionToken(username, role);
            return outputJSON({
              success: true,
              username,
              role,
              auth_token: sessionToken.token,
              expires_at: sessionToken.expiresAt
            });
          }
        }

        increaseLoginAttemptCount(usernameInput);
  
        return outputJSON({
          success: false,
          message: "Invalid username or password"
        });
      }

      const auth = requireSession(data, e);
      if (!auth.ok) return auth.response;
      const session = auth.session;
  
      // 🔥 REASSIGN LEAD (Manager/Admin only)
      if (data.type === "reassignLead") {
        const leadSheet = ss.getSheetByName("Leads_Master");
        const leadData = leadSheet.getDataRange().getValues();

        if (!isManagerOrAdmin(session.role)) {
          return outputJSON({
            success: false,
            permission_denied: true,
            message: "Only Manager/Admin can reassign leads"
          });
        }
  
        for (let i = 1; i < leadData.length; i++) {
          if (String(leadData[i][0]) === String(data.lead_id)) {
            // Column C = Lead Owner
            leadSheet.getRange(i + 1, 3).setValue(sanitizeCellValue(data.new_owner || ""));
  
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
        const leadHeaders = leadData[0] || [];
        const leadHeaderIndex = buildHeaderIndex(leadHeaders);
        const leadIdColumn =
          leadHeaderIndex["lead id"] !== undefined
            ? leadHeaderIndex["lead id"]
            : 0;
        const conditionalFields =
          data.conditional_fields && typeof data.conditional_fields === "object"
            ? data.conditional_fields
            : {};
  
        for (let i = 1; i < leadData.length; i++) {
          if (String(leadData[i][leadIdColumn]) === String(data.lead_id)) {
            const existingOwner = String(leadData[i][2] || "");

            const isOwner = existingOwner === session.username;

            if (!isManagerOrAdmin(session.role) && !isOwner) {
              return outputJSON({
                success: false,
                permission_denied: true,
                message: "You can only edit your own leads"
              });
            }

            const updatedRow = leadData[i].slice();

            if (leadHeaderIndex["lead owner"] !== undefined) {
              updatedRow[leadHeaderIndex["lead owner"]] = sanitizeCellValue(data.lead_owner || "");
            }
            if (leadHeaderIndex["customer name"] !== undefined) {
              updatedRow[leadHeaderIndex["customer name"]] = sanitizeCellValue(data.customer_name || "");
            }
            if (leadHeaderIndex["contact no"] !== undefined) {
              updatedRow[leadHeaderIndex["contact no"]] = sanitizeCellValue(data.contact_no || "");
            }
            if (leadHeaderIndex["contact no."] !== undefined) {
              updatedRow[leadHeaderIndex["contact no."]] = sanitizeCellValue(data.contact_no || "");
            }
            if (leadHeaderIndex["email id"] !== undefined) {
              updatedRow[leadHeaderIndex["email id"]] = sanitizeCellValue(data.email_id || "");
            }
            if (leadHeaderIndex["lead source"] !== undefined) {
              updatedRow[leadHeaderIndex["lead source"]] = sanitizeCellValue(data.lead_source || "");
            }
            if (leadHeaderIndex["product category"] !== undefined) {
              updatedRow[leadHeaderIndex["product category"]] = sanitizeCellValue(data.product_category || "");
            }
            if (leadHeaderIndex["status"] !== undefined) {
              updatedRow[leadHeaderIndex["status"]] = sanitizeCellValue(data.status || "");
            }
            if (leadHeaderIndex["remarks"] !== undefined) {
              updatedRow[leadHeaderIndex["remarks"]] = sanitizeCellValue(data.remarks || "");
            }

            applyConditionalFieldsToRow(updatedRow, leadHeaderIndex, conditionalFields);

            leadSheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
  
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
        const followHeaderIndex = buildHeaderIndex(followHeaders);

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
          "Created By": session.username,
          "Created Timestamp": data.created_timestamp || ""
        };

        const newFollowupRow = new Array(followHeaders.length).fill("");
        Object.keys(followupBaseValues).forEach((header) => {
          const columnIndex = followHeaderIndex[normalizeHeader(header)];
          if (columnIndex !== undefined) {
            newFollowupRow[columnIndex] = sanitizeCellValue(followupBaseValues[header]);
          }
        });

        const conditionalFields =
          data.conditional_fields && typeof data.conditional_fields === "object"
            ? data.conditional_fields
            : {};
        applyConditionalFieldsToRow(newFollowupRow, followHeaderIndex, conditionalFields);

        followSheet.appendRow(newFollowupRow);
  
        // ALSO UPDATE LEADS_MASTER
        const leadSheet = ss.getSheetByName("Leads_Master");
        const leadData = leadSheet.getDataRange().getValues();
        const leadHeaders = leadData[0] || [];
        const leadHeaderIndex = buildHeaderIndex(leadHeaders);

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
            updatedRow[statusColumn] = sanitizeCellValue(data.followup_status || "");
          }

          if (remarksColumn !== undefined) {
            updatedRow[remarksColumn] = sanitizeCellValue(data.remarks || "");
          }

          const finalLeadStatus =
            data.followup_status === "Won" || data.followup_status === "Lost"
              ? "Closed"
              : "Open";

          if (leadStatusColumn !== undefined) {
            updatedRow[leadStatusColumn] = finalLeadStatus;
          }

          if (nextFollowupColumn !== undefined) {
            updatedRow[nextFollowupColumn] = sanitizeCellValue(data.next_followup_date || "");
          }

          applyConditionalFieldsToRow(updatedRow, leadHeaderIndex, conditionalFields);

          if (orderValueColumn !== undefined) {
            const conditionalOrderValue =
              conditionalFields["Order Value"] ||
              conditionalFields["Order value"] ||
              conditionalFields["order value"];

            if (conditionalOrderValue !== undefined && conditionalOrderValue !== "") {
              updatedRow[orderValueColumn] = sanitizeCellValue(conditionalOrderValue);
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
      const leadHeaders = leadData[0] || [];
      const leadHeaderIndex = buildHeaderIndex(leadHeaders);
      const conditionalFields =
        data.conditional_fields && typeof data.conditional_fields === "object"
          ? data.conditional_fields
          : {};
  
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
      const newLeadRow = new Array(leadHeaders.length).fill("");
      const leadBaseValues = {
        "Lead ID": data.lead_id || "",
        "Created Date": data.created_date || "",
        "Lead Owner": isManagerOrAdmin(session.role) ? data.lead_owner || "" : session.username,
        "Customer Name": data.customer_name || "",
        "Contact No.": data.contact_no || "",
        "Email ID": data.email_id || "",
        "Lead Source": data.lead_source || "",
        "Product Category": data.product_category || "",
        "Status": data.status || "",
        "Remarks": data.remarks || "",
        "Lead Status": data.lead_status || "",
        "Order Value": data.order_value || 0,
        "Next Follow-up Date": data.next_followup_date || ""
      };

      Object.keys(leadBaseValues).forEach((header) => {
        const columnIndex = leadHeaderIndex[normalizeHeader(header)];
        if (columnIndex !== undefined) {
          newLeadRow[columnIndex] = sanitizeCellValue(leadBaseValues[header]);
        }
      });

      applyConditionalFieldsToRow(newLeadRow, leadHeaderIndex, conditionalFields);

      if (leadHeaderIndex["order value"] !== undefined) {
        const conditionalOrderValue =
          conditionalFields["Order Value"] ||
          conditionalFields["Order value"] ||
          conditionalFields["order value"];

        if (conditionalOrderValue !== undefined && conditionalOrderValue !== "") {
          newLeadRow[leadHeaderIndex["order value"]] = sanitizeCellValue(conditionalOrderValue);
        }
      }

      leadSheet.appendRow(newLeadRow);
  
      return outputJSON({
        success: true,
        message: "Lead added successfully"
      });
  
    } catch (error) {
      return outputJSON({
        success: false,
        message: "Request failed"
      });
    }
  }