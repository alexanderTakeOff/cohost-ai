# Cohost AI Domain Glossary

This glossary standardizes domain terms for product, backend, and workflow work.

## Principle

The word `platform` is not allowed without a qualifier.

Use one of:

- `OTA Platform` (Airbnb, Booking)
- `PMS Platform` (Hostify)
- `AI Platform` (our system)

## System Layers

- **Ownership Layer** - real-world assets and revenue ownership.
- **Operations Layer** - human operation and service delivery.
- **Distribution Layer** - OTA channels where guests discover and book.
- **Management Layer** - PMS operations and data management (Hostify).
- **Intelligence Layer** - AI logic and automation (Assistant).

## Platform Types

- **OTA Platform** - marketplace/distribution layer (Airbnb, Booking).
- **PMS Platform** - property management system (Hostify).
- **AI Platform** - Cohost AI control and automation layer.

## Core Entities

- **Property** - physical rental unit.
- **Property Owner** - owner of the physical property and revenue beneficiary.
- **Operator** - management company operating properties.
- **Operator Team** - people operating tasks (agents, cleaners, support).
- **Host Account** - account used to communicate with guests on OTA side.
- **Listing** - public rental offer shown to guests.
- **Listing (PMS)** - listing object inside Hostify PMS.
- **Guest** - end customer who books and communicates.
- **Thread** - conversation stream.
- **AI Assistant** - Jenny.
- **Service Tenant** - customer of AI Platform using the system to manage listings and communications.

## Role Separation

One person can play multiple roles simultaneously:

- Property Owner
- Host Account
- Operator
- Platform Owner
- Service Tenant

## Naming Rules

Do not use these words without qualifier:

- `platform`
- `owner`
- `host`

Always qualify as:

- `OTA Platform`, `PMS Platform`, `AI Platform`
- `Property Owner`, `Host Account`, `Operator`, `Service Tenant`

## Mental Model

- Owner -> money
- Operator -> operations
- OTA -> distribution/sales
- PMS -> operational control
- AI -> automation brain
- Tenant -> AI Platform customer

## Key Insight

- OTA does not model ownership structure directly.
- PMS adds operational and ownership context.
- AI coordinates automations across these layers.

## Final Definition

System = Ownership + Operations + Distribution + Management + Intelligence

## Legacy Mapping in Code/DB

Historical term `tenant` in code and database is retained for now as a technical legacy.

- `tenants` (table) => Service Tenants (legacy name)
- `tenant_id` (field) => service tenant id (legacy name)
- `tenant_events` (table) => service tenant events (legacy name)

Any physical rename must be done by staged migration with rollback.
