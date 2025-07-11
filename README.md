# VAI-VEX

This repository contains the source code for the VAI-VEX application, a full-stack web application built with Next.js, Convex, and a variety of other modern technologies.

## Overview

The application is a feature-rich platform that includes user authentication, a blogging system, a membership model with payments, a news feed, and administrative tools. It is designed to be a high-quality, production-ready application with a focus on user experience and developer productivity.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/)
- **Backend:** [Convex](https://www.convex.dev/)
- **Authentication:** [Clerk](https://clerk.com/)
- **Payments:** [Stripe](https://stripe.com/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/) and [shadcn/ui](https://ui.shadcn.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Testing:** [Vitest](https://vitest.dev/) and [Playwright](https://playwright.dev/)
- **Linting:** [ESLint](https://eslint.org/)
- **Formatting:** [Prettier](https://prettier.io/)

## Getting Started

To get started with the project, you will need to have Node.js and npm installed.

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/vai-vex.git
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    This project uses Convex for the backend, and each developer has their own separate development environment. To get set up, you will need to:

    1.  **Reach out to Parker** to get the necessary environment variables.
    2.  Create a `.env.local` file in the root of the project and add the variables provided.
    3.  Follow the Convex setup instructions to initialize your development environment. This will likely involve running `npx convex dev`.

4.  **Run the development server:**

    ```bash
    npm run dev
    ```

    This will start the development server on `http://localhost:3000`.

## Project Structure

Here is a breakdown of the project's file structure:

```
/
├── app/
│   ├── globals.css # Global CSS styles
│   ├── layout.tsx # Root layout for the application
│   ├── not-found.tsx # Custom 404 page
│   ├── page.tsx # Home page
│   ├── [category]/ # Dynamic category pages
│   ├── actions/ # Server-side actions
│   ├── admin/ # Admin dashboard pages
│   ├── api/ # API routes
│   ├── blog/ # Blog pages
│   ├── bookmarks/ # User bookmarks page
│   ├── calendar/ # Calendar feature pages
│   ├── create/ # Content creation page
│   ├── educate/ # Educational content pages
│   ├── members/ # Member profile pages
│   ├── membership/ # Membership and subscription pages
│   ├── news/ # News feed page
│   ├── onboarding/ # User onboarding flow
│   ├── pricing/ # Pricing page
│   ├── reactivate/ # Account reactivation page
│   └── settings/ # User settings pages
├── components/
│   ├── ui/ # UI components from shadcn/ui
│   ├── *.tsx # Reusable React components
├── convex/
│   ├── schema.ts # Convex database schema
│   ├── *.ts # Convex backend functions (queries, mutations, actions)
├── hooks/
│   ├── *.ts # Custom React hooks
├── lib/
│   ├── *.ts # Utility functions and libraries
├── public/
│   ├── *.svg # Static SVG assets
│   └── *.png # Static image assets
├── scripts/
│   ├── *.js # Scripts for various development and administrative tasks
│   └── *.ts
├── tests/
│   ├── *.spec.ts # Playwright end-to-end tests
├── .github/ # GitHub-specific configuration
├── .next/ # Next.js build output
├── .vercel/ # Vercel deployment configuration
├── ai_docs/ # AI-generated documentation and plans
├── docs/ # Project documentation
├── node_modules/ # Project dependencies
├── playwright-report/ # Playwright test reports
├── test-results/ # Test results
└── types/ # TypeScript type definitions
```

## Component-by-Component Breakdown

### Root Components

-   `attachment-grid.tsx`: Displays a grid of attachments.
-   `auth-button.tsx`: A button for user authentication.
-   `bookmark-button.tsx`: A button for bookmarking content.
-   `bug-report-button.tsx`: A button to trigger a bug report modal.
-   `bug-report-modal.tsx`: A modal for submitting bug reports.
-   `category-toggle-group.tsx`: A group of toggles for filtering by category.
-   `checkout-error-recovery.tsx`: A component to handle checkout errors.
-   `code-block-wrapper.tsx`: A wrapper for code blocks to provide additional functionality.
-   `comment-actions-menu.tsx`: A menu of actions for a comment.
-   `comment-section.tsx`: A component to display a comment section.
-   `ConvexClientProvider.tsx`: A Convex client provider for the application.
-   `current-customers-ticker.tsx`: A ticker to display current customers.
-   `discord-status.tsx`: Displays the status of a Discord integration.
-   `drafts-modal.tsx`: A modal for managing drafts.
-   `enhanced-comment-input.tsx`: An enhanced comment input field.
-   `error-boundary.tsx`: An error boundary to catch and handle errors.
-   `error-display.tsx`: A component to display errors.
-   `feature-request-button.tsx`: A button to trigger a feature request modal.
-   `feature-request-modal.tsx`: A modal for submitting feature requests.
-   `footer.tsx`: The application footer.
-   `gif-picker.tsx`: A picker for selecting GIFs.
-   `global-search.tsx`: A global search input.
-   `header.tsx`: The application header.
-   `join-vai-pro.tsx`: A component to encourage users to join the pro plan.
-   `last-push-tag.tsx`: A tag to display the last push information.
-   `link-badge.tsx`: A badge for links.
-   `media-preview-grid.tsx`: A grid for previewing media.
-   `media-preview-item.tsx`: An item in the media preview grid.
-   `media-upload-section.tsx`: A section for uploading media.
-   `member-card.tsx`: A card to display member information.
-   `member-dropdown.tsx`: A dropdown menu for member actions.
-   `member-edit-form.tsx`: A form for editing member information.
-   `member-edit-modal.tsx`: A modal for editing member information.
-   `member-header-skeleton.tsx`: A skeleton loader for the member header.
-   `member-hover-card.tsx`: A hover card to display member information.
-   `member-profile.tsx`: A component to display a member's profile.
-   `member-skeleton.tsx`: A skeleton loader for a member.
-   `members-display.tsx`: A component to display a list of members.
-   `membership-cta-modal.tsx`: A modal for a membership call to action.
-   `mention-autocomplete.tsx`: An autocomplete for mentioning users.
-   `notification-bell.tsx`: A notification bell icon.
-   `notification-dropdown.tsx`: A dropdown for displaying notifications.
-   `online-users.tsx`: A component to display online users.
-   `payment-reminder-banner.tsx`: A banner to remind users of a payment.
-   `payment-retry-modal.tsx`: A modal for retrying a payment.
-   `paywall.tsx`: A paywall to restrict access to content.
-   `pdf-preview.tsx`: A component to preview PDF files.
-   `poll-creation-modal.tsx`: A modal for creating polls.
-   `poll-display.tsx`: A component to display a poll.
-   `poll-voters-modal.tsx`: A modal to display poll voters.
-   `post-card.tsx`: A card to display a post.
-   `post-content-teaser.tsx`: A teaser for post content.
-   `post-creation-form.tsx`: A form for creating posts.
-   `post-delete-modal.tsx`: A modal for deleting a post.
-   `post-detail.tsx`: A component to display the details of a post.
-   `post-edit-modal.tsx`: A modal for editing a post.
-   `post-form-fields.tsx`: Fields for the post form.
-   `post-header-skeleton.tsx`: A skeleton loader for the post header.
-   `post-header.tsx`: The header for a post.
-   `post-history-modal.tsx`: A modal to display the history of a post.
-   `post-list.tsx`: A list of posts.
-   `post-paywall-direct.tsx`: A direct paywall for a post.
-   `post-preview-overlay.tsx`: An overlay for post previews.
-   `post-preview-toggle.tsx`: A toggle for post previews.
-   `post-preview.tsx`: A component to preview a post.
-   `post-sidebar-skeleton.tsx`: A skeleton loader for the post sidebar.
-   `post-sidebar.tsx`: The sidebar for a post.
-   `preview-generation-dialog.tsx`: A dialog for generating previews.
-   `pricing-comparison-table.tsx`: A table for comparing pricing plans.
-   `reactivate-banner-inline.tsx`: An inline banner for reactivating an account.
-   `reactivate-banner-top.tsx`: A top banner for reactivating an account.
-   `rich-text-editor-full.tsx`: A full-featured rich text editor.
-   `rich-text-editor.tsx`: A rich text editor.
-   `settings-dialog.tsx`: A dialog for settings.
-   `sidebar-roadmap-component.tsx`: A roadmap component for the sidebar.
-   `sign-in-form.tsx`: A form for signing in.
-   `sign-in-modal.tsx`: A modal for signing in.
-   `sort-popover.tsx`: A popover for sorting options.
-   `sortable-comment-item.tsx`: A sortable comment item.
-   `subscription-expired-modal.tsx`: A modal for an expired subscription.
-   `subscription-status-skeleton.tsx`: A skeleton loader for the subscription status.
-   `theme-provider.tsx`: A provider for the application theme.
-   `theme-toggle-simple.tsx`: A simple theme toggle.
-   `theme-toggle-switch.tsx`: A theme toggle switch.
-   `theme-toggle.tsx`: A theme toggle.
-   `video-preview.tsx`: A component to preview videos.
-   `vote-hover-card.tsx`: A hover card for votes.
-   `weekly-countdown.tsx`: A weekly countdown timer.
-   `youtube-embed.tsx`: A component to embed YouTube videos.
-   `youtube-preview.tsx`: A component to preview YouTube videos.

### Admin Components

-   `admin/member-card.tsx`: A card to display member information in the admin dashboard.
-   `admin/member-details-modal.tsx`: A modal to display member details in the admin dashboard.
-   `admin/member-status-filter.tsx`: A filter for member status in the admin dashboard.
-   `admin/payment-details-modal.tsx`: A modal to display payment details in the admin dashboard.
-   `admin/payment-history.tsx`: A component to display payment history in the admin dashboard.

### Calendar Components

-   `calendar/calendar-grid.tsx`: A grid for the calendar.
-   `calendar/event-card.tsx`: A card to display a calendar event.
-   `calendar/event-modal.tsx`: A modal for calendar events.

### News Components

-   `news/news-card.tsx`: A card to display a news item.
-   `news/news-feed-widget.tsx`: A widget for the news feed.

### UI Components (from shadcn/ui)

-   `ui/accordion.tsx`: An accordion component.
-   `ui/alert-dialog.tsx`: An alert dialog component.
-   `ui/alert.tsx`: An alert component.
-   `ui/arrow-big-up.tsx`: A big up arrow icon.
-   `ui/arrow-left.tsx`: A left arrow icon.
-   `ui/aspect-ratio.tsx`: A component to maintain the aspect ratio of an element.
-   `ui/avatar.tsx`: An avatar component.
-   `ui/badge.tsx`: A badge component.
-   `ui/bell.tsx`: A bell icon.
-   `ui/breadcrumb.tsx`: A breadcrumb component.
-   `ui/button.tsx`: A button component.
-   `ui/calendar-days.tsx`: A component to display the days of a calendar.
-   `ui/calendar.tsx`: A calendar component.
-   `ui/card.tsx`: A card component.
-   `ui/carousel.tsx`: A carousel component.
-   `ui/chart.tsx`: A chart component.
-   `ui/checkbox.tsx`: A checkbox component.
-   `ui/clap.tsx`: A clap icon.
-   `ui/collapsible.tsx`: A collapsible component.
-   `ui/command.tsx`: A command component.
-   `ui/comment-thread-line.tsx`: A line for a comment thread.
-   `ui/context-menu.tsx`: A context menu component.
-   `ui/dialog.tsx`: A dialog component.
-   `ui/drawer.tsx`: A drawer component.
-   `ui/dropdown-menu.tsx`: A dropdown menu component.
-   `ui/emoji.tsx`: An emoji component.
-   `ui/expand.tsx`: An expand icon.
-   `ui/flame.tsx`: A flame icon.
-   `ui/flask.tsx`: A flask icon.
-   `ui/form.tsx`: A form component.
-   `ui/gif.tsx`: A GIF component.
-   `ui/github.tsx`: A GitHub icon.
-   `ui/home.tsx`: A home icon.
-   `ui/hover-card.tsx`: A hover card component.
-   `ui/input-otp.tsx`: An input for one-time passwords.
-   `ui/input.tsx`: An input component.
-   `ui/key.tsx`: A key icon.
-   `ui/label.tsx`: A label component.
-   `ui/laptop-minimal-check.tsx`: A laptop icon with a checkmark.
-   `ui/link.tsx`: A link component.
-   `ui/media-upload.tsx`: A component for uploading media.
-   `ui/menubar.tsx`: A menubar component.
-   `ui/message-square.tsx`: A message square icon.
-   `ui/moon.tsx`: A moon icon.
-   `ui/navigation-menu.tsx`: A navigation menu component.
-   `ui/pagination.tsx`: A pagination component.
-   `ui/party-popper.tsx`: A party popper icon.
-   `ui/pen-tool.tsx`: A pen tool icon.
-   `ui/plus.tsx`: A plus icon.
-   `ui/popover.tsx`: A popover component.
-   `ui/progress.tsx`: A progress bar component.
-   `ui/rabbit.tsx`: A rabbit icon.
-   `ui/radio-group.tsx`: A radio group component.
-   `ui/resizable.tsx`: A resizable component.
-   `ui/scroll-area.tsx`: A scroll area component.
-   `ui/search.tsx`: A search icon.
-   `ui/select.tsx`: A select component.
-   `ui/separator.tsx`: A separator component.
-   `ui/sheet.tsx`: A sheet component.
-   `ui/sidebar.tsx`: A sidebar component.
-   `ui/skeleton.tsx`: A skeleton loader component.
-   `ui/slider.tsx`: A slider component.
-   `ui/smile.tsx`: A smile icon.
-   `ui/sonner.tsx`: A toast notification component.
-   `ui/square-stack.tsx`: A square stack icon.
-   `ui/sun.tsx`: A sun icon.
-   `ui/switch.tsx`: A switch component.
-   `ui/table.tsx`: A table component.
-   `ui/tabs.tsx`: A tabs component.
-   `ui/telescope.tsx`: A telescope icon.
-   `ui/text-area.tsx`: A text area component.
-   `ui/textarea.tsx`: A textarea component.
-   `ui/tier-badge.tsx`: A badge for a tier.
-   `ui/toggle-group.tsx`: A toggle group component.
-   `ui/toggle.tsx`: A toggle component.
-   `ui/tooltip.tsx`: A tooltip component.
-   `ui/upload.tsx`: An upload icon.
-   `ui/upvote.tsx`: An upvote icon.
-   `ui/users.tsx`: A users icon.
-   `ui/vote-button.tsx`: A button for voting.

## Testing

The project uses Vitest for unit and integration tests, and Playwright for end-to-end tests.

-   **Run unit and integration tests:**

    ```bash
    npm test
    ```

-   **Run end-to-end tests:**

    ```bash
    npx playwright test
    ```

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information on how to contribute to the project.

## License

This project is licensed under the [MIT License](LICENSE).