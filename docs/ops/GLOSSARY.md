# Cohost AI Domain Glossary

This glossary standardizes domain terms for product, backend, and workflow work.

## Canonical Terms

- **Host Account**  
  The paying customer account (host-side business entity) using Cohost AI.

- **Host Team Member**  
  A user operating under a host account (owner, co-host, admin, assistant).

- **Guest**  
  End customer who books or sends messages about a stay.

- **Listing**  
  A specific rental unit/property in Hostify.

- **Reservation**  
  A booking linked to a listing and guest.

- **Thread**  
  Conversation stream in Hostify inbox.

## Terminology Mapping

Historical term `tenant` in code/docs currently maps to **Host Account**.
This is a naming legacy; functional meaning is host-side account isolation.

- `tenants` (table) => host accounts (legacy name)
- `tenant_id` (field) => host account id (legacy name)
- `tenant_events` (table) => host account events (legacy name)

## Naming Policy Going Forward

1. In new docs and architecture notes, prefer **Host Account** wording.
2. In existing code/database, preserve legacy names until a planned migration.
3. Any physical rename of DB tables/fields must be done via staged migration with rollback.
