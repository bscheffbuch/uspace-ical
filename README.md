# <img src="public/icons/icon_48.png" width="45" align="left"> u:space Calendar Downloader

A modern Chrome extension for downloading and subscribing to calendar data from the University of Vienna's u:space platform.

## Features

- 📅 Download course calendars directly from u:space 
- 🔄 Subscribe to calendars using the webcal:// protocol for automatic updates
- 🌓 Beautiful UI with automatic light/dark mode support
- 🌐 Multilingual support (English & German for now)
- 📦 Option to merge all courses into a single calendar file or download as separate files
- 🔐 Automatic authentication with u:space
- 🧩 Integration with common calendar applications
- 💾 Choose between direct download or calendar app subscription
- ⚙️ User preference saving for format, delivery method, theme and language

## Screenshots

<!-- TODO: Add screenshots here -->

## Installation

### From Chrome Web Store

NOT available

### Manual Installation (Developer Mode)

1. Download the latest release from the [Releases](https://github.com/USERNAME/uspace-ical/releases) page
2. Extract the ZIP file to a location on your computer
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer Mode" by toggling the switch in the top right corner
5. Click "Load Unpacked" and select the extracted folder
6. The extension should now appear in your browser toolbar

## Usage

1. Click on the extension icon in your browser toolbar to open the popup
2. Sign in to u:space when prompted
3. Select the semester you want to download calendars for
4. Choose your preferred delivery method:
   - **Download file**: Saves the calendar to your device
   - **Open with calendar app**: Subscribes directly with your default calendar application
5. For downloads, choose your preferred format:
   - **Single calendar file**: All courses merged into one calendar
   - **Separate calendar files**: Individual calendars in a ZIP archive
6. Click "Get Calendar" to proceed

## Settings

The extension offers several customization options:
- **Language**: Choose between English and German
- **Theme**: Light, Dark, or follow your system settings
- **Calendar Format**: Single file or separate files
- **Delivery Method**: Direct download or calendar app subscription

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- npm (included with Node.js)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/USERNAME/uspace-ical.git
   cd uspace-ical
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Development commands:
   ```bash
   # Start development mode with hot reload
   npm run watch
   
   # Build for production
   npm run build
   
   # Create a packaged extension zip file
   npm run pack
   
   # Build and pack in one command
   npm run repack
   
   # Format code with Prettier
   npm run format
   ```

4. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer Mode"
   - Click "Load Unpacked" and select the `build` directory

## Project Structure

```
├── build/               # Compiled extension files
├── config/              # Webpack configuration
├── public/              # Static assets
│   ├── icons/           # Extension icons
│   ├── manifest.json    # Extension manifest
│   └── ...              # HTML and JS files
├── src/                 # Source code
│   ├── i18n/            # Internationalization files
│   │   ├── en.json      # English translations
│   │   └── de.json      # German translations
│   ├── background.js    # Background service worker
│   ├── popup.js         # Popup UI functionality
│   └── ...              # Other JS files
└── package.json         # Project dependencies
```

## Privacy

This extension:
- Only stores your u:space session cookies locally in your browser
- Does not transmit your personal data to third-party servers
- Only makes requests to official u:space endpoints and related domains

## Contribution

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

<!-- TODO: Add license information -->

---

This project was bootstrapped with [Chrome Extension CLI](https://github.com/dutiyesh/chrome-extension-cli).

