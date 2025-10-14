# Value Stream Timeline Extension

A visual timeline view for Azure DevOps that displays Epics and Features across Value Streams with quarter and month representations.

## Features

- 📊 **Visual Timeline**: See your epics and features laid out across quarters and months
- 🎯 **Value Stream Organization**: Group work items by value streams
- 📈 **Progress Tracking**: View user story completion progress on each epic and feature
- 🔄 **Dynamic Navigation**: Navigate between quarters and zoom in/out
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎨 **Color-Coded Cards**: Orange for epics, purple for features
- 📅 **Today Indicator**: Visual marker showing the current date

## Installation

1. Install the extension from the Azure DevOps Marketplace
2. Navigate to Azure Boards → Timeline
3. Configure query settings in Project Settings → Timeline Settings

## Configuration

### Setting Up a Query

1. Go to **Azure Boards** → **Queries**
2. Create a new query that returns your Epics and Features
3. Copy the Query GUID from the URL
4. Go to **Project Settings** → **Timeline Settings**
5. Paste the Query GUID and save

### Requirements

- Work items must have **Iteration Path** assigned
- Iterations must be configured in **Project Settings** → **Project Configuration** → **Iterations**
- Iterations must have **Start Date** and **End Date** defined

## Usage

### Viewing the Timeline

1. Navigate to **Azure Boards** → **Timeline**
2. The timeline displays the previous quarter, current quarter, and next two quarters
3. Click on epic cards to expand and see child features

### Navigation Controls

- **← Previous / Next →**: Move the timeline backward or forward by one quarter
- **Today**: Return to the current quarter view
- **Zoom In/Out**: Adjust the timeline scale

### Understanding the Display

- **Orange Cards**: Epics
- **Purple Cards**: Features  
- **Grey Line**: Current date indicator
- **Progress Bars**: Show completed vs total user stories

## Troubleshooting

### No data displayed?

- Ensure epics are assigned to iterations
- Verify iterations have start and end dates configured
- Check that the query GUID is correctly configured in settings

### Items not showing?

- Items only display if they have valid iteration paths
- The iteration must exist in Project Configuration
- Items must be within the visible quarter range

## Support

For issues, feature requests, or questions, please visit our [GitHub repository](https://github.com/YOUR_REPO).

## Version History

### 1.0.0
- Initial release
- Timeline view with quarters and months
- Epic and feature cards with progress tracking
- Dynamic navigation and zoom controls
- Responsive design

## License

MIT License