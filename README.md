<<<<<<< HEAD
# Demo_Github
=======
# Demo_GitHub Task Manager

An accessible, responsive task manager web app built with semantic HTML, modern CSS, and vanilla JavaScript. Supports adding tasks with optional due dates, marking completion, filtering (All/Pending/Completed), clearing tasks, and a light/dark theme toggle with persistence.

## Features
- Add, complete, delete tasks
- Bulk actions: clear completed, delete all
- Filter: All / Pending / Completed
- Due date display with relative hints
- Dark/Light theme (auto respects system preference, persists locally)
- Accessible: skip link, aria-live announcements, focus styles
- LocalStorage persistence

## Structure
```
index.html      # Markup (semantic and accessible)
styles.css      # Dark/light themes, responsive layout
script.js       # Task logic, filtering, theming, persistence
```

## Getting Started
Open `index.html` directly in a browser. No build step required.

## Keyboard Shortcuts
- Tab: Navigate interactive elements
- Space (focused task item): Toggle completion
- Enter/Space on theme toggle: Switch theme

## Accessibility Notes
- Live region announces task changes and filter updates.
- High-contrast focus indicators.
- Reduced motion honored with `prefers-reduced-motion`.

## Potential Enhancements
- Inline task editing
- Drag-and-drop reordering
- Export/Import tasks (JSON)
- PWA support (offline install)

## License
MIT (see LICENSE file)

## Contributing
Fork and open a Pull Request. Please keep accessibility in mind for UI changes.
>>>>>>> f8c7bfb (Add README, LICENSE, and .gitignore for public release)
