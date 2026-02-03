# Xtream to STRM

<div align="center">

![Xtream to STRM Logo](frontend/public/Xtreamm-app_Full_Logo.jpg)

**A modern web application for managing Xtream Codes and M3U playlists**  
Generate Jellyfin-compatible `.strm` and `.nfo` files for your media server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Hub](https://img.shields.io/docker/v/mourabena2ui/xtream-to-strm-web?label=Docker%20Hub&logo=docker)](https://hub.docker.com/r/mourabena2ui/xtream-to-strm-web)
[![Docker Pulls](https://img.shields.io/docker/pulls/mourabena2ui/xtream-to-strm-web)](https://hub.docker.com/r/mourabena2ui/xtream-to-strm-web)
[![Version](https://img.shields.io/badge/version-2.6.0-blue.svg)](https://github.com/mourabena2-ui/xtream-to-strm-web/releases)

</div>

---

## 🌟 Overview

Xtream to STRM is a complete, production-ready web application that transforms your Xtream Codes subscriptions and M3U playlists into **Jellyfin-compatible** media files. The application generates `.strm` stream files and `.nfo` metadata files following Jellyfin's naming conventions and folder structure, enabling seamless integration with your Jellyfin media server. Also compatible with Kodi and other media servers that support the same format.

Built with modern technologies, it provides an intuitive interface for managing your VOD content with advanced features like selective synchronization, intelligent metadata generation, and comprehensive administration tools.

## ✨ Key Features

### 🎬 Multi-Source Support
- **Xtream Codes**: Full support for Xtream API with multi-subscription management
- **M3U Playlists**: Import from URLs or file uploads with group-based selection

### 🎯 Smart Synchronization
- **Parallel Fetching**: High-performance sync with concurrent metadata fetching (async/await)
- **Selective Sync**: Choose specific categories or groups to synchronize
- **Incremental Updates**: Only sync what's changed since last update
- **Dual Control**: Separate sync for Movies and Series
- **Robustness**: Redirect support and improved error handling for Xtream providers

### 📋 Rich Metadata
- **NFO Generation**: Detailed metadata files in Jellyfin format
- **TMDB Integration**: Automatic movie/series information enrichment
- **Smart Folder Structure**: 
  - Movies: `Movie Name {tmdb-ID}` folder support
  - Series: Optional `Season XX` subfolders
- **Configurable Formatting**: Title prefix cleaning, date formatting, and name normalization

### 🎨 Modern Interface
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-Time Updates**: Live sync progress and status monitoring
- **Dark Mode**: Beautiful, comfortable viewing experience
- **Intuitive Navigation**: Clean organization with logical menu structure

### 🛠️ Advanced Administration
- **Database Management**: Easy reset and cleanup operations
- **File Management**: Bulk delete and reorganization tools
- **NFO Settings**: Customize title formatting with regex patterns
- **Statistics Dashboard**: Comprehensive overview of your content

## 🚀 Quick Start

### Installation from Docker Hub (Recommended)

```bash
docker run -d \
  -p 8000:8000 \
  -v $(pwd)/output:/output \
  -v $(pwd)/db:/db \
  --name xtream-to-strm \
  mourabena2ui/xtream-to-strm-web:latest
```

Access the web interface at **http://localhost:8000**

### Using Docker Compose

```yaml
version: '3.8'

services:
  app:
    image: mourabena2ui/xtream-to-strm-web:latest
    container_name: xtream_app
    ports:
      - "8000:8000"
    volumes:
      - ./output:/output
      - ./db:/db
    restart: unless-stopped
```

Then start with:
```bash
docker-compose up -d
```

## 📖 Usage

### 1. Add Your Content Source

**For Xtream Codes:**
- Navigate to **XtreamTV** → **Subscriptions**
- Add your subscription details (URL, username, password)
- Configure movie and series output directories

**For M3U Playlists:**
- Navigate to **M3U Import** → **Sources**
- Add source via URL or file upload
- Configure output directory

### 2. Select Content to Sync

**For Xtream:**
- Go to **XtreamTV** → **Bouquet Selection**
- List available categories
- Select categories for movies and/or series

**For M3U:**
- Go to **M3U Import** → **Group Selection**
- Select your source
- Choose groups for movies and/or series

### 3. Synchronize

Click **Sync Movies** or **Sync Series** to generate your files!

### 4. Configure Your Media Server

Point Jellyfin to the `/output` directory to scan your new content. The generated files follow Jellyfin's naming conventions for optimal recognition.

## 🎛️ NFO Configuration

Customize how titles are formatted in NFO files:

| Setting | Description | Example |
|---------|-------------|---------|
| **Prefix Regex** | Strip language/country prefixes | `FR - Movie` → `Movie` |
| **Format Date** | Move year to parentheses | `Name_2024` → `Name (2024)` |
| **Clean Name** | Replace underscores with spaces | `My_Movie` → `My Movie` |

Access these settings in **Administration** → **NFO Settings**

## 📁 Generated File Structure

```
output/
├── movies/
│   └── Movie Name (2024)/
│       ├── Movie Name (2024).strm
│       └── Movie Name (2024).nfo
└── series/
    └── Series Name/
        ├── Season 01/
        │   ├── Series Name S01E01.strm
        │   └── Series Name S01E01.nfo
        └── tvshow.nfo
```

## 🔧 Technology Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Celery
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Infrastructure**: Redis, SQLite
- **Containerization**: Docker (multi-stage build)

## 📝 Version History

### v2.6.0 (Latest)
- ✨ **Performance**: Parallel fetching engine (significant sync speedup)
- ✨ **Metadata**: TMDB ID folder support `Movie {tmdb-ID}`
- ✨ **Series**: Configurable Season folders & Filename formatting
- 🔒 **Security**: Non-root container user (`appuser`)
- 🛠️ **Admin**: New Cache Clearing tools & Smart Database Reset
- 🐞 Fixed redirect handling for unstable IPTV providers

### v2.5.0
- ✨ Enhanced NFO title formatting options
- ✨ Configurable regex for prefix stripping
- ✨ Date formatting at end of titles
- ✨ Name cleaning (underscore replacement)
- 🎨 New application logo
- 🐛 Fixed config endpoint routing
- 🐛 Improved M3U sync with NFO generation

### v2.0.0
- ✨ Added M3U playlist support
- ✨ Refactored UI structure
- ✨ Split sync controls for Movies/Series
- 🎨 Enhanced dashboard and navigation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/mourabena2-ui/xtream-to-strm-web/issues)
- **Docker Hub**: [mourabena2ui/xtream-to-strm-web](https://hub.docker.com/r/mourabena2ui/xtream-to-strm-web)

## ☕ Support This Project

If you find this project helpful, consider supporting its development!

<a href="https://www.buymeacoffee.com/mourabena" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

Your support helps maintain and improve this project. Thank you! 🙏

---

<div align="center">

**Made with ❤️ for the Jellyfin and Kodi community**

[Docker Hub](https://hub.docker.com/r/mourabena2ui/xtream-to-strm-web) • [GitHub](https://github.com/mourabena2-ui/xtream-to-strm-web)

</div>
