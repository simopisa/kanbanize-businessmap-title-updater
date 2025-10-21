# 🎯 Kanbanize Title Updater - Chrome Extension

A Chrome extension for managing hierarchical card titles in Kanbanize. It updates version numbers across parent-child card relationships and supports both a popup-based workflow and inline buttons injected directly into the Kanbanize card modal.

This README was updated to include the newly added inline buttons feature (Rename & Transpose) that appear directly on a card modal when you open a card. The popup still provides the board browser, card list, search and the same edit/transpose actions — choose whichever workflow fits you.

---

## ✨ Features

- Recursive Title Updates: update a card's title and automatically propagate changes to all child cards.
- Version Number Management: intelligently detect and update version numbers (e.g., `1`, `1.2`, `1.2.3`).
- Card Transposition: increment version numbers for cards that come after a specific position.
- Board Browser (popup): browse boards and cards, search, and run edits/transposes from the extension popup.
- Inline Buttons (content script): two buttons injected directly into a card modal on the Kanbanize page:
  - Rename (inline editor with Save / Cancel / Transpose)
  - Transpose (confirm and run)
- Persistent Configuration: save your API URL and API key securely in Chrome storage.
- Multi-Instance Support: works with any Kanbanize instance by configuring a custom API URL.
- Auto-Load: automatically loads boards when you open the extension popup.

---

## 🚀 Installation

### From Source

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the extension directory.
5. The extension icon will appear in your Chrome toolbar.

### Required Files

The extension includes the popup UI and the content script that injects buttons into Kanbanize pages.

```
kanbanize-title-updater/
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon64.png
│   └── icon128.png
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js        <-- injects Rename & Transpose buttons into the card modal
├── background.js
├── favicon.png
└── README.md
```

---

## 📋 Usage

### Initial Setup (one-time)

1. Click the extension icon in your Chrome toolbar to open the popup.
2. Enter your **Kanbanize API Base URL** (for example `https://yourcompany.kanbanize.com/api/v2`) into the API URL field.
3. Enter your **Kanbanize API Key** into the API Key field.
4. Click "Load Boards". Your configuration (API URL and key) will be saved in Chrome storage for future use.

Notes:
- The popup auto-loads boards if configuration is present.
- The content script (inline buttons) also reads the same saved configuration from Chrome storage. If not configured, inline buttons will prompt you to configure the popup.

### Two Ways to Use the Extension

You can use the extension either via the popup (original workflow) or directly from Kanbanize pages via inline buttons.

A — Popup Workflow (as before)
1. Open the extension popup.
2. Browse boards and click "View Cards" for any board.
3. Use the search to filter cards.
4. Click `✏️ Edit` on a card to open the extension's modal editor, modify the title and click "Update (Recursive)".
5. Click `↕️ Transpose` in the popup to increment versions of following siblings (confirmation required).

B — Inline Page Workflow (new)
1. Open Kanbanize and navigate to a board and open a card (example URL format: `https://yourcompany.kanbanize.com/ctrl_board/10/cards/1000/details/`).
2. When a card modal opens the extension injects two buttons into the modal header:
   - `✏️ Rename` — opens an inline editor in the card modal (input + Save / Cancel).
   - `↕️ Transpose` — confirm and run the transpose operation for the opened card.
3. Rename in the inline editor:
   - Edit the title inline and click Save. The extension:
     - Updates the card title (PATCH /cards/{id}) using the card's version_id.
     - Detects version prefixes and updates children recursively if the prefix changes (e.g., `1.2` → `1.3` updates `1.2.x` → `1.3.x`).
4. Transpose (inline button) prompts a confirmation before incrementing subsequent siblings' version numbers and updating their children accordingly.

---

## 🔎 Behavior Examples

Rename example:
- Parent: `1.2 Feature Name` → rename to `1.3 Feature Name`
- Children: `1.2.1 Sub-task` → `1.3.1 Sub-task`, `1.2.2 Another Task` → `1.3.2 Another Task`

Transpose example:
- If you insert a new `2.3`, running transpose on that position will:
  - increment `2.3` → `2.4`
  - increment `2.4` → `2.5`
  - update their children recursively following the same version prefix rules

---

## 🔒 Security & Privacy

- The API URL and API key are stored locally in Chrome's storage (`chrome.storage.local`) only.
- No data is sent to third-party servers by this extension. All communications go directly to your configured Kanbanize instance.
- Extension messages to the background service worker are used to perform the HTTP requests; the background service worker uses the stored API key and provided request data.

Stored keys:
- `kanbanizeApiUrl` — the API base URL
- `kanbanizeApiKey` — the API key

---

## 🛠️ Technical Details

### How it works

- Popup (popup.js)
  - Loads boards and cards through the background service worker (background.js).
  - Offers search, edit modal, and transpose operations identical in effect to the inline ones.
- Background (background.js)
  - Receives messages of type `apiCall` from both popup and content script and performs fetch requests to the configured Kanbanize API using the API key.
- Content script (content.js)
  - Injected into pages matching your Kanbanize domain.
  - Observes the DOM for `.modal-header` nodes (card modal).
  - Injects the Rename & Transpose buttons into the card modal header when detected.
  - Delegates API calls to the background with the same `apiCall` message format used by the popup.

### API Requirements

- Kanbanize API v2
- A valid account and API key with read/write permissions for cards

### Manifest & Permissions

- Uses Manifest V3
- Required permissions:
  - `storage` — to save API configuration
  - `activeTab` — to interact in the context of the current tab
- Host permissions should include your Kanbanize domain, e.g.:
  - `https://yourcompany.kanbanize.com/*`

---

## 🐛 Troubleshooting

- Buttons are not visible on the card modal:
  - Ensure you are on the right domain (`host_permissions` match your instance).
  - Make sure the extension is enabled and the content script is loaded.
  - Confirm the modal structure matches `.modal-header` and `.card-title` selectors. Small variations in the site markup may require minor selector adjustments in `content.js`.
- Inline actions show "configure API" error:
  - Open the extension popup and set the API URL and key.
- "Version not detected" errors:
  - Ensure the version number appears at the start of the card title (supported formats: `1`, `1.2`, `1.2.3`, multi-level).
- API errors or authentication failures:
  - Verify the base API URL ends in `/api/v2` (or the correct base for your installation).
  - Confirm the API key has required permissions.
- CORS errors:
  - The background service worker makes requests; if you see CORS issues, confirm the API endpoint and keys are correct and reachable.

---

## 📝 Development

- The extension is built with vanilla JavaScript and requires no build step.
- Key files:
  - `popup.js` — popup UI and actions
  - `content.js` — injects inline buttons and inline editor
  - `background.js` — service worker to perform API calls


### Styling & Accessibility
- Inline editor focuses the input once opened.
- Consider adding keyboard handling (Enter to save, Esc to cancel) if you want extra accessibility. This can be implemented in `content.js`.

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🙏 Acknowledgments

- Built for the Kanbanize API v2
- Uses Chrome Extension Manifest V3

---

## 📧 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Note**: This extension is not officially affiliated with Kanbanize. It's an independent tool created to enhance workflow productivity.
