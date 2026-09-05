# Privacy Policy

We collect: your Discord account information (ID, username, email), the IP
address and browser fingerprint recorded when you submit an application, the
text of your application, and API key usage counters.

This information is used for identity verification, application review, ban
enforcement, abuse prevention, and providing the service.

If you use the "hosted: true" image generation option, the generated image
is stored on our server-side storage (by default Cloudflare R2, or local
disk depending on configuration). This storage is not a guaranteed
permanent hosting service — images may be deleted depending on
HOSTED_IMAGE_TTL_HOURS or future operational changes.

Personal data other than ban records and audit logs is deleted when your
account is deleted. Data may be shared with Discord (OAuth2 and webhooks)
and, if STORAGE_DRIVER=r2, with Cloudflare.
