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
