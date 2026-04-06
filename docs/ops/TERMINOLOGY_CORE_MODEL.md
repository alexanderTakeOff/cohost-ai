# Terminology — Core Model

## Principle

The words `platform`, `owner`, and `host` must not be used without qualification.

## System Layers

- **Ownership Layer** — real-world assets and revenue.
- **Operations Layer** — people and operational processes.
- **Distribution Layer** — OTA channels (Airbnb, Booking, etc.).
- **Management Layer** — PMS operations (Hostify).
- **Intelligence Layer** — AI logic and automation (Cohost AI Assistant).

## Platform Types

- **OTA Platform** — market/distribution platform (Airbnb, Booking).
- **PMS Platform** — operations management platform (Hostify).
- **AI Platform** — this system (logic, automation, orchestration).

## Core Entities

- **Property** — physical real-estate unit.
- **Property Owner** — person/entity receiving property income.
- **Operator** — operating company managing properties and workflows.
- **Operator Team** — staff acting under the Operator.
- **Host Account** — account used for guest communication on OTA/PMS side.
- **Guest** — booking customer.
- **Listing (PMS)** — listing object in PMS (Hostify).
- **Thread** — conversation stream.
- **AI Assistant** — Jenny.
- **Service Tenant** — customer account of the AI Platform.

## Role Separation

One person can have multiple roles at the same time:

- Property Owner
- Host Account
- Operator
- Platform Owner
- Service Tenant

## Naming Rules

Always qualify:

- OTA Platform / PMS Platform / AI Platform
- Property Owner / Host Account / Operator / Service Tenant

## Mental Model

- Owner -> money
- Operator -> operations
- OTA -> distribution
- PMS -> control
- AI -> intelligence
- Service Tenant -> user/customer of AI Platform

## Key Insight

- OTA does not model Property Owner explicitly.
- PMS adds management context.
- AI orchestrates automation across layers within defined permissions.

## Final Definition

System = Ownership + Operations + Distribution + Management + Intelligence

## Runtime Invariant

For runtime routing, canonical identifier is `listing_id` from PMS webhook payload.

## Identification Scheme (MVP)

### Scope

This scheme is intentionally minimal for the current MVP and closed beta.

- One **Service Tenant** in Cohost AI maps to one **Hostify account**.
- If one real-world client operates multiple Hostify accounts, model them as multiple tenants for now.
- Do not use email as cross-system identity between Cohost AI and Hostify.

### Identity Layers

1. **App Login Identity**
   - `auth.users.id`
   - email
   - Purpose: access to Cohost AI UI only

2. **AI Platform Tenant Identity**
   - `tenants.id`
   - Purpose: internal isolation boundary for config, metrics, and control-plane state

3. **Canonical External Identity**
   - `Hostify customer_id`
   - Purpose: canonical Hostify account identifier for the tenant
   - Current evidence:
     - runtime SNS topic account marker matches Hostify `customer_id`
     - example: `hostify-webhook-go-700000252-message_new` <-> `customer_id = 700000252`

4. **Runtime Routing Identity**
   - `customer_id` / account marker
   - `listing_id`
   - `thread_id`
   - `reservation_id`
   - Purpose: route guest-message runtime safely without depending on onboarding cache freshness

### Current Mapping Rule

For MVP, use this working model:

- `tenant` = one connected Hostify account in Cohost AI
- `customer_id` = canonical external identifier of that tenant
- one tenant can have many units / listings / aliases
- runtime resolves inside tenant scope using account marker first, then listing identity

### Non-Goals for MVP

Do not introduce these as core model assumptions yet:

- one tenant with multiple Hostify accounts
- organization layer above multiple tenants
- email-based matching between Cohost AI and Hostify

These may be added later only if real product usage requires them.
