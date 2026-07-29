# MongoDB schema

Collections use string UUIDs, `createdAt`/`updatedAt` timestamps, locale fields and soft publication states.

| Collection | Important indexed fields |
|---|---|
| users | email (unique), role, status |
| organisationSettings | key + language (unique), category |
| pages | slug + language (unique), status, publishedAt |
| people | slug + language, profileType |
| topics | slug + language |
| resources | slug + language, type, topicIds, status, publishedAt, featured |
| quotations | language, topicIds, status, featured |
| events | slug + language, startDateTime, status, featured |
| eventRegistrations | eventId, email, referenceNumber (unique), createdAt |
| contributions | providerOrderId, providerPaymentId, paymentStatus, receiptNumber |
| communityMembers | email, mobile, consent |
| volunteerApplications | email, status, createdAt |
| shrineGallery | status, eventDate, sortOrder |
| contactEnquiries | status, assignedTo, createdAt |
| newsletterSubscribers | email + language, status |
| auditLogs | userId, entityType + entityId, timestamp |

Payment webhooks must be stored idempotently using the provider event ID as a unique key. Private collections are never exposed through unrestricted public queries.
