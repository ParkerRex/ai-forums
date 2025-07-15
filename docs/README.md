# VAI-VEX Documentation

Welcome to the VAI-VEX platform documentation. This directory contains comprehensive guides for developers, administrators, and contributors.

## Documentation Structure

### Core Documentation

- **[Payment System](./PAYMENTS.md)** - Complete guide to the payment system including tiers, pricing, technical architecture, and admin tools
- **[API Reference](./API.md)** - Comprehensive API documentation for all queries, mutations, and integrations
- **[Deployment Guide](./DEPLOYMENT.md)** - Step-by-step production deployment instructions with security checklist

### Quick Links

- **[Project Overview](./PROJECT_README.md)** - Project overview and getting started
- **[Changelog](../CHANGELOG.md)** - Version history and release notes
- **[Contributing](../CONTRIBUTING.md)** - Guidelines for contributors

## System Overview

The VAI-VEX platform is a modern community platform built with:
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Backend**: Convex (real-time database + serverless)
- **Authentication**: Clerk
- **Payments**: Stripe
- **UI**: Tailwind CSS + shadcn/ui

## Key Features

1. **Real-time Collaboration**
   - Live updates without page refresh
   - Instant voting and comments
   - Real-time search results

2. **Payment System**
   - 5-tier membership structure
   - Stripe subscription management
   - Content paywall for premium posts
   - Comprehensive admin tools

3. **Community Features**
   - Reddit-style voting
   - Rich member profiles
   - Category organization
   - Advanced search

## Getting Help

- **Development Issues**: Check the [API docs](./API.md) and [troubleshooting section](./DEPLOYMENT.md#troubleshooting)
- **Payment Questions**: See the [payment system guide](./PAYMENTS.md)
- **Deployment Help**: Follow the [deployment guide](./DEPLOYMENT.md)

## Architecture Diagrams

See the [main README](../README.md) for detailed architecture diagrams including:
- System architecture overview
- Component architecture flow
- Data flow sequences

## Quick Start for Developers

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Start development: `npm run dev`
5. Run tests: `npm test`

For detailed setup instructions, see the [Project Overview](./PROJECT_README.md).

## Documentation Updates

When updating documentation:
1. Keep examples current with the codebase
2. Update the changelog for significant changes
3. Ensure all code examples are tested
4. Follow markdown best practices
5. Include diagrams where helpful

## Additional Resources

### External Documentation
- [Convex Docs](https://docs.convex.dev/)
- [Next.js Docs](https://nextjs.org/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Clerk Docs](https://clerk.com/docs)

### Internal Resources
- Planning documents: `/ai_docs/plan/`
- Migration scripts: `/migration-data/`
- Test files: `/convex/test/`

## License

This project is proprietary to the VAI community. For licensing details, see the [LICENSE](../../LICENSE) file.