# Thunderbird Avatar Plugin

A professional business avatar card extension for Thunderbird that displays intelligent avatar cards with company logos, favicons, and professional initials.

## 🚀 Features

- **Business Avatar Cards**: Intelligent avatar display with company branding
- **Multiple Avatar Sources**: 
  - Company favicons from domain
  - Logo APIs (Clearbit, Brandfetch)
  - Google favicon service
  - Professional initials fallback
- **High Performance**: Advanced LRU caching with TTL
- **Smart Caching**: Intelligent memory management and persistence
- **Professional Design**: Clean, modern UI with business color schemes
- **Thunderbird Integration**: Seamless integration with Thunderbird interface

## 📥 Installation

### Method 1: Manual Installation (Recommended)
1. Download the latest release from [Releases](https://github.com/sakis/thunderbird-avatar-plugin/releases)
2. Open Thunderbird
3. Go to **Tools** → **Add-ons and Themes**
4. Click the gear icon ⚙️ → **Install Add-on From File**
5. Select the downloaded `.xpi` file
6. Click **Install** and restart Thunderbird

### Method 2: Development Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/sakis/thunderbird-avatar-plugin.git
   cd thunderbird-avatar-plugin
   ```
2. Open Thunderbird
3. Go to **Tools** → **Developer Tools** → **Add-on Debugging**
4. Click **Load Temporary Add-on**
5. Select the `manifest.json` file

## 🎯 Compatibility

- **Thunderbird**: 78.0 and later
- **Betterbird**: All current versions
- **Operating Systems**: Windows, macOS, Linux

## ⚙️ Configuration

1. Go to **Tools** → **Add-ons and Themes**
2. Find "Avatar Card View" and click **Options**
3. Configure your preferences:
   - Avatar size
   - Enable/disable favicon fetching
   - Enable/disable logo APIs
   - Cache settings

## 📸 Screenshots

### Avatar Cards in Action
*Screenshot placeholder - Avatar cards displayed in email list*

### Settings Panel
*Screenshot placeholder - Extension configuration options*

### Business Integration
*Screenshot placeholder - Professional avatar display with company branding*

## 🛠️ Development

### Project Structure
```
thunderbird-avatar-plugin/
├── manifest.json           # Extension manifest
├── background.js           # Background service worker
├── content/                # Content scripts
│   ├── content-script.js   # Main content script
│   ├── thunderbird-integration.js
│   └── avatar-cards.css    # Styling
├── options/                # Settings UI
│   ├── options.html
│   ├── options.js
│   └── options.css
├── icons/                  # Extension icons
├── utils/                  # Utility modules
└── _locales/              # Internationalization
```

### Building from Source
```bash
# Clone repository
git clone https://github.com/sakis/thunderbird-avatar-plugin.git
cd thunderbird-avatar-plugin

# Install in Thunderbird for testing
# (Follow development installation steps above)
```

### API Integration
The extension integrates with:
- **Clearbit Logo API**: Company logo fetching
- **Google Favicon Service**: Reliable favicon source
- **Gravatar**: Fallback avatar service

## 🔒 Privacy & Security

- **No Data Collection**: Extension operates entirely locally
- **Secure API Calls**: All external requests use HTTPS
- **Cache Management**: Intelligent cache cleanup and size limits
- **Permission Minimal**: Only requests necessary permissions

## 📋 Permissions Explained

- `messagesRead`: Read email headers for avatar generation
- `storage`: Cache avatar data locally
- `activeTab`: Inject avatar cards into Thunderbird interface
- `https://*`: Fetch company logos and favicons securely

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 Changelog

### Version 1.1.0 (Current)
- ✅ Fixed Thunderbird compatibility issues
- ✅ Removed deprecated manifest properties
- ✅ Enhanced JavaScript error handling
- ✅ Improved avatar caching system
- ✅ Added professional business color schemes

### Version 1.0.0
- 🎉 Initial release
- ⚡ Core avatar card functionality
- 🎨 Business avatar design system
- 💾 Intelligent caching implementation

## 🐛 Bug Reports

Found a bug? Please open an issue on GitHub with:
- Thunderbird version
- Operating system
- Steps to reproduce
- Expected vs actual behavior

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Thunderbird Team**: For the excellent email client platform
- **Clearbit**: For their logo API service
- **Mozilla**: For WebExtensions architecture
- **Community**: For feedback and contributions

---

**Made with ❤️ for the Thunderbird community**