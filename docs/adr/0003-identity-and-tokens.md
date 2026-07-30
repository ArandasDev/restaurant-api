# ADR 0003 — Unified identity and token strategy

- **Status:** Accepted
- **Date:** 2026-07-30

## Context

The system has several kinds of principals (platform admin, restaurant staff roles,
consumers, delivery staff). They all need authentication, RBAC and, in most cases,
tenant scoping. We must avoid duplicating authentication logic per principal type.

## Decision

- **One `User` table** holds every authentication identity (email, Argon2id password
  hash, `role`, nullable `tenantId`). Domain profiles such as `Consumer` reference a
  `User`. Roles are a single enum consumed by the `@Roles` RBAC guard.
- **Access tokens** are short-lived JWTs carrying `sub`, `tenantId` and `role`.
- **Refresh tokens** are opaque `"<id>.<secret>"` values: the `id` locates the DB row
  (O(1) lookup) and only a SHA-256 hash of the high-entropy `secret` is stored. They
  are **rotated** on every use (old token revoked) and are revocable per session —
  giving session control and reuse detection that a stateless JWT refresh cannot.
- **Password-reset tokens** use the same opaque scheme, are single-use, time-limited,
  and carry the `tenantId` so the reset flow re-establishes tenant context on its own.

## Rationale

- A unified identity removes duplicated auth code (DRY) and centralises RBAC.
- Argon2id is the OWASP-recommended, memory-hard password hash.
- Storing refresh tokens hashed with a lookup id avoids scanning salted hashes while
  still never persisting the usable secret; rotation limits the blast radius of a
  leaked token.

## Consequences

- Refresh and reset require a DB round-trip (acceptable; enables revocation).
- Platform-admin (null-tenant) flows are out of scope for Delivery 1 and are not yet
  exposed via the API.
