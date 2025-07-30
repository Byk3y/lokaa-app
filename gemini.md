# Gemini Codebase Guide

This document provides a comprehensive guide to the Lokaa.app codebase for Gemini, outlining the project's architecture, key technologies, and development practices.

## Project Overview

Lokaa.app is a platform for creating and managing collaborative spaces, inspired by Skool.com. It emphasizes a real-time, feature-rich user experience with a focus on performance, security, and maintainability.

**Key Features:**

*   **Real-time Feed:** A dynamic feed of posts with real-time updates for comments and likes.
*   **Rich Media:** Support for images, videos, and other media types.
*   **Post Management:** Features like post pinning, reordering, and slug-based URLs for SEO.
*   **Onboarding:** A space setup guide to help new users get started.
*   **Developer Tools:** A comprehensive suite of in-browser tools for testing and debugging.

## Architecture

The application is built on a feature-first architecture, with a clear separation of concerns between different parts of the codebase.

*   **State Management:** Zustand is used for global state management, providing a simple and scalable solution.
*   **Routing:** `react-router-dom` is used for client-side routing, with a well-defined structure for pages and routes.
*   **Styling:** Tailwind CSS is used for styling, with a focus on utility-first CSS.
*   **Backend:** Supabase provides the backend infrastructure, including a Postgres database, authentication, and real-time capabilities.

## Technologies

*   **Frontend:** React, Vite, TypeScript
*   **State Management:** Zustand
*   **Styling:** Tailwind CSS
*   **Testing:** Vitest, React Testing Library, Jest (for security tests)
*   **Linting:** ESLint
*   **Backend:** Supabase

## Development

### Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Start the Development Server:**
    ```bash
    npm run dev
    ```

### Key Scripts

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run lint`: Lints the codebase.
*   `npm run test`: Runs the test suite.
*   `npm run test:security`: Runs the security test suite.

### Code Conventions

*   **Feature-First:** Code is organized by feature, with each feature having its own directory containing all related components, services, and tests.
*   **TypeScript:** The codebase is written in TypeScript, with a focus on strong typing and code quality.
*   **ESLint:** ESLint is used to enforce a consistent coding style.
*   **Testing:** All new features should be accompanied by a comprehensive suite of tests, including unit, integration, and end-to-end tests.

### Security

The application has a strong focus on security, with a number of measures in place to protect against common vulnerabilities.

*   **Session Management:** JWTs are used for session management, with a number of security features in place to prevent token hijacking.
*   **CSRF Protection:** A custom CSRF protection mechanism is used to prevent cross-site request forgery attacks.
*   **Security Testing:** A dedicated security test suite is used to ensure that the application is secure.

### Contributing

Please refer to the `CONTRIBUTING.md` file for detailed instructions on how to contribute to the project.
