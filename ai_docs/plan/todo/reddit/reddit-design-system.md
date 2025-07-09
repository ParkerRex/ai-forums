# Reddit Design System

## Table of Contents
1. [Foundation](#foundation)
   - [Colors](#colors)
   - [Typography](#typography)
   - [Spacing](#spacing)
   - [Breakpoints](#breakpoints)
2. [Components](#components)
   - [Buttons](#buttons)
   - [Cards](#cards)
   - [Navigation](#navigation)
   - [Forms](#forms)
   - [Voting](#voting)
   - [Comments](#comments)
3. [Patterns](#patterns)
   - [Feed Layout](#feed-layout)
   - [Modals](#modals)
   - [Dropdowns](#dropdowns)
4. [Iconography](#iconography)
5. [Motion](#motion)

---

## Foundation

### Colors

#### Primary Palette
- **Reddit Orange**: `#FF4500` - Primary brand color, used for upvotes and CTAs
- **Reddit Blue**: `#0079D3` - Links and secondary actions
- **Reddit Red**: `#CC0000` - Destructive actions, errors

#### Neutral Palette
- **Black**: `#000000` - Primary text (dark mode)
- **Dark Gray**: `#1A1A1B` - Dark mode background
- **Medium Gray**: `#272729` - Dark mode cards
- **Light Gray**: `#DAE0E6` - Light mode borders
- **Off White**: `#F8F9FA` - Light mode background
- **White**: `#FFFFFF` - Light mode cards, dark mode text

#### Semantic Colors
- **Upvote**: `#FF4500` (Orange)
- **Downvote**: `#7193FF` (Periwinkle)
- **Success**: `#46D160`
- **Warning**: `#FFB000`
- **Error**: `#EA0027`
- **Moderator**: `#46D160` (Green)
- **Admin**: `#FF4500` (Orange-red)

### Typography

#### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
font-family-mono: "Noto Mono", Monaco, Consolas, "Courier New", monospace;
```

#### Type Scale
- **Display**: 32px / 1.2 / 700
- **Headline 1**: 24px / 1.3 / 700
- **Headline 2**: 20px / 1.3 / 700
- **Headline 3**: 18px / 1.4 / 600
- **Body Large**: 16px / 1.5 / 400
- **Body**: 14px / 1.5 / 400
- **Body Small**: 12px / 1.5 / 400
- **Caption**: 10px / 1.4 / 400

### Spacing

#### Base Unit: 4px
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 20px
- **xxl**: 24px
- **xxxl**: 32px

### Breakpoints
- **Mobile**: 0-767px
- **Tablet**: 768px-1023px
- **Desktop**: 1024px+
- **Wide**: 1280px+

---

## Components

### Buttons

#### Primary Button
```css
.button-primary {
  background: #FF4500;
  color: white;
  padding: 8px 16px;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 14px;
  border: none;
  cursor: pointer;
}

.button-primary:hover {
  background: #FF5722;
}
```

#### Secondary Button
```css
.button-secondary {
  background: transparent;
  color: #0079D3;
  padding: 8px 16px;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 14px;
  border: 1px solid #0079D3;
  cursor: pointer;
}
```

#### Icon Button
```css
.button-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
}

.button-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}
```

### Cards

#### Post Card
```css
.post-card {
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 10px;
  display: flex;
  cursor: pointer;
}

.post-card:hover {
  border-color: #898989;
}

/* Dark mode */
.dark .post-card {
  background: #1A1A1B;
  border-color: #343536;
}
```

#### Comment Card
```css
.comment {
  padding-left: 16px;
  border-left: 2px solid #EDEFF1;
  margin: 16px 0;
}

.comment-nested {
  margin-left: 24px;
}
```

### Navigation

#### Top Navigation Bar
```css
.nav-bar {
  height: 48px;
  background: white;
  border-bottom: 1px solid #EDEFF1;
  display: flex;
  align-items: center;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 100;
}
```

#### Subreddit Header
```css
.subreddit-header {
  height: 80px;
  background: #0079D3;
  color: white;
  padding: 0 20px;
  display: flex;
  align-items: flex-end;
  padding-bottom: 12px;
}

.subreddit-banner {
  height: 192px;
  background-size: cover;
  background-position: center;
}
```

### Forms

#### Text Input
```css
.input-text {
  padding: 8px 12px;
  border: 1px solid #EDEFF1;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
}

.input-text:focus {
  border-color: #0079D3;
  outline: none;
}
```

#### Textarea
```css
.textarea {
  padding: 8px 12px;
  border: 1px solid #EDEFF1;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
  min-height: 120px;
  resize: vertical;
}
```

### Voting

#### Vote Component
```css
.vote-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 12px;
}

.vote-button {
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  cursor: pointer;
  color: #878A8C;
}

.vote-button.upvoted {
  color: #FF4500;
}

.vote-button.downvoted {
  color: #7193FF;
}

.vote-count {
  font-size: 12px;
  font-weight: 700;
  color: #1A1A1B;
  margin: 4px 0;
}
```

### Comments

#### Comment Structure
```css
.comment-container {
  display: flex;
  margin: 16px 0;
}

.comment-thread-line {
  width: 2px;
  background: #EDEFF1;
  margin-right: 12px;
  cursor: pointer;
}

.comment-thread-line:hover {
  background: #0079D3;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
  color: #787C7E;
}

.comment-body {
  font-size: 14px;
  line-height: 1.5;
  color: #1A1A1B;
}
```

---

## Patterns

### Feed Layout

#### Classic View
```css
.feed-classic {
  max-width: 640px;
  margin: 0 auto;
  padding: 20px 0;
}

.post-classic {
  display: flex;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 10px;
  padding: 8px;
}
```

#### Card View
```css
.feed-card {
  max-width: 640px;
  margin: 0 auto;
  padding: 20px 0;
}

.post-card-view {
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 16px;
  overflow: hidden;
}
```

#### Compact View
```css
.feed-compact .post {
  padding: 4px 8px;
  border-bottom: 1px solid #EDEFF1;
}
```

### Modals

#### Base Modal
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 4px;
  max-width: 520px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid #EDEFF1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

### Dropdowns

#### Base Dropdown
```css
.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #EDEFF1;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  z-index: 100;
}

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  font-size: 14px;
}

.dropdown-item:hover {
  background: #F6F7F8;
}
```

---

## Iconography

### Icon Guidelines
- Size: 20x20px (default), 16x16px (small), 24x24px (large)
- Stroke width: 1.5px
- Style: Outlined, simple geometric shapes
- Color: Inherit from parent

### Common Icons
- **Upvote**: Arrow pointing up
- **Downvote**: Arrow pointing down
- **Comment**: Speech bubble
- **Share**: Arrow curved right
- **Save**: Bookmark
- **Report**: Flag
- **More**: Three dots (horizontal)
- **Close**: X
- **Menu**: Three lines (hamburger)
- **Search**: Magnifying glass
- **User**: Circle with person silhouette
- **Community**: Circle with multiple people
- **Hot**: Fire
- **New**: Sparkle
- **Top**: Chart/Arrow up
- **Rising**: Trending arrow

---

## Motion

### Transitions
```css
/* Default transition */
transition: all 0.1s ease-in-out;

/* Hover states */
transition: background-color 0.1s ease-in-out;

/* Modal/dropdown appearance */
transition: opacity 0.2s ease-out, transform 0.2s ease-out;
```

### Animations
```css
/* Loading spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Skeleton loading */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Interaction States
- **Hover**: Subtle color change or background highlight
- **Active**: Slight scale down (0.98) or darken
- **Focus**: Blue outline (2px solid #0079D3)
- **Disabled**: Opacity 0.5, cursor not-allowed

---

## Implementation Examples

### React Component Example
```jsx
// Button Component
const Button = ({ variant = 'primary', size = 'medium', children, ...props }) => {
  const classNames = `
    button
    button-${variant}
    button-${size}
  `;
  
  return (
    <button className={classNames} {...props}>
      {children}
    </button>
  );
};

// Vote Component
const VoteButtons = ({ score, userVote, onVote }) => {
  return (
    <div className="vote-container">
      <button 
        className={`vote-button ${userVote === 1 ? 'upvoted' : ''}`}
        onClick={() => onVote(1)}
      >
        <ArrowUpIcon />
      </button>
      <span className="vote-count">{score}</span>
      <button 
        className={`vote-button ${userVote === -1 ? 'downvoted' : ''}`}
        onClick={() => onVote(-1)}
      >
        <ArrowDownIcon />
      </button>
    </div>
  );
};
```

### CSS Variables
```css
:root {
  /* Colors */
  --color-primary: #FF4500;
  --color-secondary: #0079D3;
  --color-upvote: #FF4500;
  --color-downvote: #7193FF;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-xxl: 24px;
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-size-base: 14px;
  --line-height-base: 1.5;
  
  /* Borders */
  --border-radius-sm: 4px;
  --border-radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

---

## Accessibility Guidelines

### Color Contrast
- Normal text: 4.5:1 minimum contrast ratio
- Large text: 3:1 minimum contrast ratio
- Interactive elements: 3:1 minimum contrast ratio

### Keyboard Navigation
- All interactive elements accessible via Tab
- Clear focus indicators
- Skip links for main content
- Escape key closes modals/dropdowns

### Screen Readers
- Proper heading hierarchy
- Descriptive link text
- Alt text for images
- ARIA labels for icon buttons
- Live regions for dynamic content

### Mobile Considerations
- Touch targets: minimum 44x44px
- Sufficient spacing between interactive elements
- Responsive text sizing
- Gesture alternatives for hover states