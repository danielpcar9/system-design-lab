# Phase 2 · URL Shortener contract

Both implementations in this folder must satisfy the same contract.

## `POST /links`

Request:

```json
{ "url": "https://example.com/article" }
```

Success: `201 Created`

```json
{ "code": "abc123", "url": "https://example.com/article" }
```

Invalid URL: `422 Unprocessable Entity`.

Duplicate code: `409 Conflict`.

## Learning checkpoints

1. Validate at the HTTP boundary.
2. Keep the unique constraint in the persistence layer.
3. Make the collision response explicit.
4. Keep analytics out of the create request.
5. Add a request test before changing the implementation.

The first implementation uses in-memory storage so the request flow is easy to inspect. The next exercise is to replace it with PostgreSQL and add Redis for the redirect path.
