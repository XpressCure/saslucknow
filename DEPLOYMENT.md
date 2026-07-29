# AWS EC2 deployment

Use an Ubuntu LTS EC2 instance behind an Application Load Balancer or Nginx with TLS. Run the Node application as a non-root service (systemd or a container), and use MongoDB Atlas or a private managed MongoDB deployment rather than exposing MongoDB publicly.

Store application secrets in AWS Systems Manager Parameter Store or Secrets Manager. Grant S3 access with an EC2 IAM role; avoid long-lived access keys where possible. Restrict uploads by MIME type and size and serve public media through CloudFront.

Build with `pnpm install --frozen-lockfile && pnpm build`; run the production server with `pnpm start`. Health checks should use a dedicated endpoint. Configure log rotation, automated database backups, CloudWatch alarms and a rollback-ready release directory.

Razorpay webhooks must terminate over HTTPS, verify the raw request signature using `RAZORPAY_WEBHOOK_SECRET`, store each event idempotently and confirm payment server-side. Do not trust browser success responses or store card data.
