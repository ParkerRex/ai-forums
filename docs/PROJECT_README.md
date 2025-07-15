# VAI-VEX

This repository contains the source code for the VAI-VEX application, a full-stack web application built with Next.js, Convex, and a variety of other modern technologies.

## Overview

The application is a feature-rich platform that includes user authentication, a blogging system, a membership model with payments, a news feed, and administrative tools. It is designed to be a high-quality, production-ready application with a focus on user experience and developer productivity.

For a comprehensive overview of the project's documentation, please refer to the main [Documentation README](../docs/README.md).

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

    Create a `.env.local` file in the root of the project by copying `.env.example` and filling in the necessary environment variables.

    ```bash
    cp .env.example .env.local
    ```

4.  **Set up Convex backend:**

    Initialize your Convex development environment and set Convex-specific environment variables:

    ```bash
    npx convex dev
    npx convex env set STRIPE_SECRET_KEY "your_stripe_secret_key"
    npx convex env set NEXT_PUBLIC_APP_URL "http://localhost:3000"
    npx convex env set CLERK_JWT_ISSUER_DOMAIN "your_clerk_issuer_domain"
    npx convex env set EXA_API_KEY "your_exa_api_key" # Required for news feed functionality
    ```

5.  **Run the development server:**

    ```bash
    npm run dev
    ```

    This will start the development server on `http://localhost:3000`.

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

Contributions are welcome! Please read the [CONTRIBUTING.md](../docs/CONTRIBUTING.md) file for more information on how to contribute to the project.

## License

This project is licensed under the [MIT License](LICENSE).