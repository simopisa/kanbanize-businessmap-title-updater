# 🎯 Kanbanize Title Updater - Chrome Extension

A powerful Chrome extension for managing hierarchical card titles in Kanbanize. Automatically update version numbers across parent-child card relationships with a single click.

## ✨ Features

- **Recursive Title Updates**: Update a card's title and automatically propagate changes to all child cards
- **Version Number Management**: Intelligent detection and updating of version numbers (e.g., 1.2, 1.2.3)
- **Card Transposition**: Increment version numbers for cards that come after a specific position
- **Board Browser**: Easy-to-use interface to browse all your Kanbanize boards
- **Card Search**: Quickly find cards with built-in search functionality
- **Persistent Configuration**: Save your API URL and key securely - no need to enter them every time
- **Multi-Instance Support**: Works with any Kanbanize instance by configuring your custom API URL
- **Auto-Load**: Automatically loads boards when you open the extension

## 🚀 Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon will appear in your Chrome toolbar

### Required Files

```
kanbanize-title-updater/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── favicon.png
└── background.js
```

## 📋 Usage

### Initial Setup

1. Click the extension icon in your Chrome toolbar
2. Enter your **Kanbanize API Base URL** (e.g., `https://yourcompany.kanbanize.com/api/v2`)
3. Enter your **Kanbanize API Key**
4. Click "Load Boards" - your configuration will be saved for future use

### Managing Cards

1. **Browse Boards**: The extension automatically loads your boards on startup
2. **Search Boards**: Use the search box to filter boards by name or ID
3. **View Cards**: Click "View Cards" on any board to see its cards
4. **Search Cards**: Filter cards by title, ID, or custom ID

### Updating Card Titles

1. Click the **✏️ Edit** button on any card
2. Modify the title in the modal dialog
3. Click **Update (Recursive)** to save
4. All child cards with matching version prefixes will be updated automatically

**Example:**
- Parent card: `1.2 Feature Name` → `1.3 Feature Name`
- Child cards: `1.2.1 Sub-task` → `1.3.1 Sub-task`
- Child cards: `1.2.2 Another Task` → `1.3.2 Another Task`

### Transposing Cards

The transpose feature helps when you insert a new card and need to increment all following cards' version numbers.

1. Click the **↕️ Transpose** button on any card
2. Confirm the action
3. All sibling cards with higher version numbers will be incremented

**Example:**
- Card `2.3` is inserted
- Existing `2.3` becomes `2.4`
- Existing `2.4` becomes `2.5`
- All their children are updated accordingly

## 🔒 Security & Privacy

- Your API URL and key are stored locally in Chrome's secure storage
- No data is sent to any third-party servers
- All communication is directly with your configured Kanbanize instance

## 🛠️ Technical Details

### API Requirements

This extension uses the Kanbanize API v2. You'll need:
- A valid Kanbanize account
- An API key with appropriate permissions
- Your Kanbanize instance API URL (format: `https://[subdomain].kanbanize.com/api/v2`)

### Common API URLs

- **Cloud instances**: `https://yourcompany.kanbanize.com/api/v2`
- **Self-hosted**: `https://kanbanize.yourdomain.com/api/v2`
- **Custom domains**: Configure according to your setup

### Permissions

The extension requires the following Chrome permissions:
- `storage`: To save your API configuration locally
- `activeTab`: To function as a browser action
- Host permissions for your Kanbanize instance

### Version Number Format

The extension recognizes version numbers in these formats:
- Single digit: `1`, `2`, `3`
- Two levels: `1.1`, `2.3`, `3.5`
- Three or more levels: `1.2.3`, `2.1.4.5`

Version numbers must appear at the **start** of the card title.

## 🐛 Troubleshooting

### Configuration Issues
- **Error loading boards**: Verify your API URL is correct (should end with `/api/v2`)
- **Authentication failed**: Check if your API key has the correct permissions
- **CORS errors**: Ensure you're using the correct Kanbanize instance URL

### API Key Issues
- Verify your API key has not expired
- Check that your account has access to the boards
- Ensure the API key has read/write permissions for cards

### Card Update Issues
- **Version not detected**: Ensure version numbers are at the start of the title
- **Children not updating**: Verify the child cards follow the parent's version pattern

### General Issues
- Clear the extension's storage: Right-click extension icon → Manage Extension → Clear storage
- Reload the extension: Go to `chrome://extensions/` and click the reload icon
- Re-enter your API URL and key if connection issues persist

## 📝 Development

### Building from Source

The extension is built with vanilla JavaScript and requires no build process.

### File Structure

- **manifest.json**: Extension configuration and permissions
- **popup.html**: Main user interface
- **popup.css**: Styling with modern gradients and animations
- **popup.js**: Core functionality and API interactions
- **background.js**: Service worker for API calls

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built for the Kanbanize API v2
- Uses Chrome Extension Manifest V3

## 📧 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Note**: This extension is not officially affiliated with Kanbanize. It's an independent tool created to enhance workflow productivity.
