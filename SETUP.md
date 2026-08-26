# Local setup

1. Install Node.js 22 and MongoDB 7+.
2. Copy `.env.example` to `.env.local` and provide development-only values.
3. Run `pnpm install`, then `pnpm dev`.
4. Open the local URL printed by the development server.

Never commit `.env.local`. Use separate MongoDB databases and S3 prefixes for development, staging and production.

