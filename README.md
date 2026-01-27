# Hours Vue App

A modern Vue 3 application for tracking development hours and productivity, integrating with Bitbucket to display pull requests and commits in an interactive dashboard.

## 🚀 Features

- **Real-time Bitbucket Integration**: Fetches pull requests and commits from configured repositories
- **Interactive Dashboard**: Sort, filter, and search through your development activity  
- **Modern UI**: Clean, responsive design that works on desktop and mobile
- **Copy to Clipboard**: Quick access to issue IDs for easy reference
- **Date Range Filtering**: View activity from the last few days to past month
- **Repository Filtering**: Focus on specific repositories
- **Type Filtering**: Separate commits from pull requests

## 🚦 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:5174/](http://localhost:5174/)

4. **Click "Refresh"** to fetch your latest Bitbucket activity

## 📝 Usage

- **Refresh Data**: Click the refresh button to fetch latest data from Bitbucket
- **Filter by Repository**: Use the dropdown to focus on specific repositories
- **Change Date Range**: Select from 3 days to 1 month of activity
- **Search**: Type in the search bar to find specific items
- **Sort**: Click column headers to sort data
- **Copy Issue IDs**: Click issue ID buttons to copy to clipboard

## ⚙️ Configuration

The app is pre-configured for **Rens Hoogendam** at **Atabix**. To customize:

1. Open `src/services/bitbucketService.js`
2. Update the configuration object with your Bitbucket credentials and repositories

## 🏗️ Build for Production

```bash
npm run build
```

Built with ❤️ using Vue 3 and Vite
