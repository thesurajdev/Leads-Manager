# Leads Manager

Leads Manager is a modern, desktop-first lead tracking workspace built with HTML, CSS, and vanilla JavaScript. It connects to a Google Apps Script backend and gives teams a focused interface for lead intake, follow-ups, pipeline visibility, and reporting.

Created by Surajdev: https://www.surajdev.com

## Highlights

- Modern product-style UI across login, dashboard, leads, follow-ups, reports, and lead detail pages.
- Role-aware experience for Agent, Manager, and Admin users.
- Lead capture and editing flow with duplicate checking for open leads.
- Follow-up timeline and activity history per lead.
- Dashboard and list views with loading states and clearer visual hierarchy.
- Report builder for Manager and Admin users.
- Client-side form validation for login, lead capture, and follow-up forms.
- Desktop-only layout for consistent operational use across devices.

## Pages

- `login.html`: Sign-in entry point.
- `index.html`: Home screen and quick actions.
- `dashboard.html`: High-level lead and activity overview.
- `leads.html`: Search, filter, review, and manage leads.
- `add-lead.html`: Add a new lead or edit an existing one.
- `lead-detail.html`: View lead profile, add follow-ups, and review timeline.
- `followups.html`: Follow-up focused workspace.
- `reports.html`: Reporting interface for Manager and Admin roles.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Google Apps Script API backend
- `localStorage` for lightweight session state in the browser

## Project Structure

```text
.
├── add-lead.html
├── appscript.js
├── dashboard.html
├── followups.html
├── index.html
├── lead-detail.html
├── leads.html
├── login.html
├── reports.html
├── css/
│   └── style.css
└── js/
		├── add-lead.js
		├── config.js
		├── dashboard.js
		├── data.js
		├── followups.js
		├── layout.js
		├── lead-detail.js
		├── leads.js
		├── login.js
		└── reports.js
```

## Setup

1. Clone this repository.
2. Confirm the backend endpoint in `js/config.js` points to your deployed Google Apps Script web app.
3. Start a local server from the project root.

```bash
python -m http.server 8000
```

4. Open the app in your browser:

```text
http://localhost:8000/login.html
```

Do not open the app with `file://`. Browsers restrict fetch and storage behavior in that mode, and the app is designed to run from `localhost` or a hosted web server.

## Configuration

The frontend API endpoint is defined in `js/config.js`:

```js
const API_URL = "https://script.google.com/macros/s/AKfycbw5u_3A9tLdz11teIBNJp8c-ESNRTKR2Z3mO_DkQUcRHdH9KBkthN52mc8lQZ0T_wh-/exec";
```

Update this value if you deploy a different Apps Script backend.

## Current UX and Validation Behavior

### Login

- Requires username and password.
- Username and password are validated before sending the login request.
- Inline error feedback is shown for invalid login input or failed authentication.

### Lead Form

- Customer name must be a sensible length.
- Contact number must contain 10 to 15 digits.
- Email is optional, but validated if entered.
- Lead source, product category, and status are required.
- Remarks are length-limited.
- Open duplicate leads are blocked by contact number or email match.

### Follow-up Form

- Follow-up date is required and cannot be in the future.
- Remarks are required and length-validated.
- Next follow-up date is required unless the status is `Won` or `Lost`.
- Next follow-up date cannot be earlier than the follow-up date.
- Additional follow-up fields are rendered dynamically from `Master_Data` based on selected follow-up status.

#### Master_Data Conditional Follow-up Configuration

Add rows in `Master_Data` where `Type` contains both words `Follow` and `Condition`.

If your sheet currently has only `Type` and `Value` (already used by the app), you can keep that structure. Use one row per status like:

- `Type`: `Followup Condition: Won`
- `Value`: `Order Value | Partner Name | State | Invoice Link`

- `Type`: `Followup Condition: Lost`
- `Value`: `Lost Reason`

Supported row formats:

1. Detailed row format (recommended):
	- `Type`: `Followup Condition`
	- `Status`: target follow-up status (example: `Won`, `Lost`)
	- `Field Label`: field name to render (example: `Order Value`, `Partner Name`)
	- Optional: `Field Type` (`text`, `number`, `url`, `date`, `select`, `textarea`)
	- Optional: `Required` (`Yes`/`No`)
	- Optional: `Options` (for `select`, separated by `|` or `,`)
	- Optional: `Placeholder`

2. Compact row format:
	- `Type`: `Followup Condition`
	- `Status`: target follow-up status
	- `Value`: pipe/comma separated list of field labels

If a conditional field name matches a header in `Followups` or `Leads_Master`, values are saved into that column automatically. If no matching `Followups` header exists, values are stored as JSON when a column like `Additional Data`, `Additional Fields`, `Dynamic Fields`, or `Conditional Fields` is present.

## Role Behavior

- `Agent`
	- Can work with their own leads.
	- Cannot access reports.
- `Manager`
	- Can view wider team data.
	- Can access reports.
- `Admin`
	- Can access reports and administrative-level views.

The active user and role are stored in browser `localStorage` after login and used by the shared layout and page scripts.

## Notes

- The app uses a fixed, always-visible sidebar and a desktop-only layout by design.
- Shared UI/session behavior lives in `js/layout.js`.
- The creator credit is shown in the interface and links to https://www.surajdev.com.

## Development

For quick validation after script changes:

```bash
node --check js/add-lead.js
node --check js/lead-detail.js
node --check js/login.js
```

You can extend the same approach to other page scripts as needed.