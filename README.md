# Life Grid Plugin for Obsidian

An Obsidian plugin to visualize your entire life as an interactive grid, where each dot represents a day of your existence. Track your journey, highlight important milestones, and gain perspective on how you're spending the time you have. Perfect for anyone who enjoys a mild existential crisis with their morning notes.

Entirely vibe-coded, so thank you, Claude!

## ✨ Features

### 📅 **Life Visualization**

-   **Daily Dots**: Every day of your life is represented as a dot in a beautiful grid
-   **Age Display**: Hover over any day to see your exact age at that moment
-   **Today Highlight**: Current day is highlighted with a special border
-   **Automatic Scrolling**: Grid automatically centers on today when opened

### 📝 **Daily Notes Integration**

-   **Note Detection**: Days with daily notes are automatically highlighted in green
-   **Seamless Navigation**: Click any day to open or create a daily note
-   **Custom Colors**: Override default colors using frontmatter in your daily notes

### 🎯 **Life Periods**

-   **Background Coloring**: Define colored periods for different life phases
-   **Flexible Ranges**: Set start and end dates, or use "present" for ongoing periods
-   **Period Labels**: Add meaningful labels like "Childhood", "University", "Career"
-   **Visual Organization**: Easily see how your life has been structured

### 🌟 **Special Events & Milestones**

-   **Event Highlighting**: Mark special days with custom colors and event names
-   **Milestone Tooltips**: Rich tooltips show event details when you hover
-   **Event Borders**: Important events get special visual treatment
-   **Minimap Events**: See all your events at a glance in the sidebar minimap

### 🗺️ **Interactive Minimap**

-   **Decade Markers**: Visual guides show decade boundaries
-   **Event Overview**: All special events are displayed as lines on the timeline
-   **Quick Navigation**: Click to jump to different periods of your life
-   **Proportional Scaling**: Adapts to your screen size

### 🎨 **Beautiful Design**

-   **Dark Theme Optimized**: Designed to work perfectly with Obsidian's dark theme
-   **Responsive Layout**: Adapts to different screen sizes and window dimensions
-   **Smooth Interactions**: Optimized performance with spatial indexing for fast tooltips
-   **Year Headers**: Clear visual separation with highlighted milestone years (every 5 years)

## 🚀 Getting Started

### Installation

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Life Grid"
4. Install and enable the plugin

### Initial Setup

1. **Set Your Birthday**:

    - Go to Settings → Community Plugins → Life Grid
    - Enter your birthday in YYYY-MM-DD format (e.g., `1990-05-15`)

2. **Adjust Maximum Age** (optional):

    - Default is 95 years
    - Adjust based on your preference for how far to project

3. **Open Life Grid View**:
    - Use command palette: `Ctrl/Cmd + P` → "Open Life Grid"
    - Or use the ribbon icon (if enabled)

## 📖 Usage Guide

### Daily Notes Integration

The plugin automatically detects daily notes in YYYY-MM-DD format. Days with notes appear in green, making it easy to see your journaling consistency.

### Adding Special Events

To mark special events, add frontmatter to your daily notes:

```yaml
---
color: "#ff6b6b"
eventName: "Graduated from University"
---
# 2015-06-15

Today I graduated! What an amazing milestone...
```

### Configuring Life Periods

Life periods help you visualize different phases of your life:

1. **Open Settings**: Go to Settings → Community Plugins → Life Grid
2. **Add New Period**: Click "+ Add New Period"
3. **Configure Period**:
    - **Label**: e.g., "University Years"
    - **Start Date**: `2011-09-01`
    - **End Date**: `2015-06-15` (or "present" for ongoing)
    - **Color**: Choose a background color

### Navigation & Interaction

-   **Hover**: See age, date, and event information
-   **Click**: Open or create daily notes
-   **Scroll**: Navigate through your life timeline
-   **Minimap**: Use the right sidebar for quick navigation

## ⚙️ Configuration

### Settings Panel

Access all settings through Settings → Community Plugins → Life Grid:

-   **Birthday**: Your birth date (required)
-   **Maximum Age**: How many years to display (default: 95)
-   **Life Periods**: Define colored background periods
-   **Advanced JSON**: Direct JSON editing for power users

### Frontmatter Options

Customize individual days with frontmatter in your daily notes:

```yaml
---
# Custom color for this day
color: "#ff6b6b"

# Event name for special occasions
eventName: "Wedding Day"
---
```

### Period Configuration

```json
{
	"start": "2010-09-01",
	"end": "2014-06-15",
	"color": "#4a90e2",
	"label": "College Years"
}
```

## 💡 Tips & Best Practices

### 🎯 **Getting the Most Value**

-   Set up life periods to see the big picture of your life phases
-   Use consistent daily journaling to see patterns in green dots
-   Mark important events with custom colors and meaningful names
-   Review periodically to gain perspective on time and priorities

### 🎨 **Visual Organization**

-   Use similar color schemes for related periods
-   Choose distinct colors for major life transitions
-   Use the minimap to quickly jump between decades
-   Take advantage of the decade markers for long-term planning

### 📝 **Daily Notes Integration**

-   Establish a consistent daily note naming convention (YYYY-MM-DD)
-   Use templates for daily notes to maintain consistency
-   Consider adding the Life Grid view to your daily workflow

## 🔧 Advanced Features

### JSON Configuration

For power users, you can directly edit the periods configuration as JSON:

```json
[
	{
		"start": "1990-05-15",
		"end": "2008-06-15",
		"color": "#ffd93d",
		"label": "Childhood & School"
	},
	{
		"start": "2008-09-01",
		"end": "2012-05-15",
		"color": "#4a90e2",
		"label": "University"
	},
	{
		"start": "2012-06-01",
		"end": "present",
		"color": "#50c878",
		"label": "Professional Career"
	}
]
```

### Performance Optimization

The plugin is optimized for performance:

-   Spatial indexing for fast tooltip detection
-   Batch SVG rendering for smooth scrolling
-   Efficient event handling for large date ranges

## 🤝 Contributing

Found a bug or have a feature request? We'd love to hear from you!

-   **GitHub**: [mrdonado/obsidian-life-grid](https://github.com/mrdonado/obsidian-life-grid)
-   **Issues**: Report bugs or request features
-   **Pull Requests**: Contributions are welcome!

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Thanks [to GitHub Copilot](https://github.com/features/copilot) for writing all this code. I just wrote prompts.

---

_Remember: Every dot represents a day. Make them count._ ✨
