# Participation platform setup

The participation platform is isolated from the gallery and video service. It uses port `3002`, a separate MongoDB database and the `/api/participation/` URL prefix.

## Local preparation

1. Copy `.env.example` to `.env.local` and set a development MongoDB URI.
2. Export the variables from `.env.local` in the terminal used for the service.
3. Run `npm run db:seed:participation` once. The seed is idempotent and can be run again safely.
4. Run `npm run dev:participation` alongside `npm run dev`. The Vite development server proxies `/api/participation/` to port `3002`.
5. Open `/participate`.

## Administrator activation

1. Set a long, random `SAS_ADMIN_ACTIVATION_CODE` in the participation service environment.
2. Open `/admin`, choose **Activate administrator account**, and enter the seeded administrator email, activation code, and a new password.
3. After activation succeeds, remove `SAS_ADMIN_ACTIVATION_CODE` from the environment and restart the participation service.
4. Administrators subsequently use the normal email and password sign-in. Sessions are stored server-side, expire automatically, and use an HTTP-only secure cookie in production.

## Member journey

1. A visitor submits Parichay at `/participate` and safely keeps the displayed `PAR-...` reference.
2. An administrator approves the Parichay from `/admin`.
3. The approved person opens `/member`, chooses **First visit**, and activates the account with the same mobile number, Parichay reference, and a new password.
4. The member can then update Parichay, review live Sankalp, make a verified Razorpay contribution, and view private acknowledgements and contribution history.
5. Existing administrators can also sign into the member portal with their administrator email and password.

Member and administrator sessions are separate, server-side, HTTP-only sessions. Financial records are never created from browser success alone: the server validates the Razorpay signature, retrieves the payment from Razorpay, checks order, amount and captured status, and accepts duplicate callbacks idempotently.

## Razorpay

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` only in `/etc/saslucknow-participation.env`. Configure the webhook URL as:

`https://saslucknow.in/api/participation/webhooks/razorpay`

Subscribe to `payment.captured` and `order.paid`. Run the seed again after deployment to create payment, member-session, and contributor indexes. The in-portal acknowledgement is a payment acknowledgement; an 80G certificate must be issued separately by the authorised branch only after its legal configuration is complete.

Until the participation API is running, the page deliberately shows an unavailable state and does not pretend that submissions have been stored.

## Production preparation

1. Create a dedicated MongoDB user restricted to the `sas_lucknow` database.
2. Store `MONGODB_URI` in `/etc/saslucknow-participation.env` with owner-only permissions.
3. Install `deploy/saslucknow-participation.service` as a systemd unit.
4. Add the participation proxy rules from the supplied Apache configuration and reload Apache.
5. Seed the production database before enabling the homepage link.
6. Create `/var/lib/saslucknow-participation/documents`, make it writable by the service user, and set `SAS_DOCUMENT_STORAGE_DIR` to that directory. Uploaded Sankalp documents remain private and are served only after administrator authentication.

Do not enable live Razorpay credentials until the legal entity, receiving bank account, website review and receipt/80G process have been approved.
