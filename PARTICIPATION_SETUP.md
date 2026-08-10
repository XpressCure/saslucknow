# Participation platform setup

The participation platform is isolated from the gallery and video service. It uses port `3002`, a separate MongoDB database and the `/api/participation/` URL prefix.

## Local preparation

1. Copy `.env.example` to `.env.local` and set a development MongoDB URI.
2. Export the variables from `.env.local` in the terminal used for the service.
3. Run `npm run db:seed:participation` once. The seed is idempotent and can be run again safely.
4. Run `npm run dev:participation` alongside `npm run dev`. The Vite development server proxies `/api/participation/` to port `3002`.
5. Open `/participate`.

Until the participation API is running, the page deliberately shows an unavailable state and does not pretend that submissions have been stored.

## Production preparation

1. Create a dedicated MongoDB user restricted to the `sas_lucknow` database.
2. Store `MONGODB_URI` in `/etc/saslucknow-participation.env` with owner-only permissions.
3. Install `deploy/saslucknow-participation.service` as a systemd unit.
4. Add the participation proxy rules from the supplied Apache configuration and reload Apache.
5. Seed the production database before enabling the homepage link.

Do not add Razorpay secrets until the legal entity, receiving bank account and 80G details have been approved. Payment creation and webhook verification will be added as a separate release.
