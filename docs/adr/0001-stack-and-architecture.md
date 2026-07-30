# ADR 0001 — Stack and architecture

- **Status:** Accepted
- **Date:** 2026-07-30

## Context

We are building a multi-tenant SaaS e-commerce API for restaurants, targeting
thousands of tenants, with strong requirements around security, testability,
maintainability and scalability.

## Decision

Use **NestJS + TypeScript**, **PostgreSQL** via **Prisma**, and **Jest + Supertest**.
Organise each feature as a NestJS module with **Clean Architecture** layers
(`domain` → `application` → `infrastructure`/`presentation`), with dependencies
pointing inward and business logic kept framework-agnostic behind repository ports.

## Rationale

- NestJS provides first-class DI, guards/interceptors/pipes and `@nestjs/swagger`,
  which map directly onto SOLID, Separation of Concerns and API-First.
- TypeScript gives the strong typing the project mandates.
- Prisma offers type-safe, parameterised data access (mitigating SQL injection) and a
  migration workflow we can extend with raw SQL (needed for RLS policies).
- Layered modules keep the codebase testable (ports are trivially mockable) and let
  us grow feature-by-feature without a big up-front framework.

## Consequences

- A small amount of boilerplate per module (ports + adapters), accepted for the
  decoupling and testability it buys.
- Prisma is the single persistence technology; repository ports keep the domain
  isolated from it should that ever change.
