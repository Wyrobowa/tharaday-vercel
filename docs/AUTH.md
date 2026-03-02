# Auth (Email + Password)

## Endpoints
- `POST /api/login`
- `POST /api/signup`

Request body:
```json
{
  "email": "user@example.com",
  "password": "plain-text-password"
}
```

Signup request body:
```json
{
  "name": "New User",
  "email": "user@example.com",
  "password": "plain-text-password"
}
```

Success response (`200`):
```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "name": "Example User",
    "email": "user@example.com",
    "role_id": 1,
    "status_id": 1
  }
}
```

Error responses:
- `400` if `email` or `password` is missing
- `401` if credentials are invalid
- `500` if `AUTH_JWT_SECRET` is missing

Signup responses:
- `201` with `{ token, user }` when account is created
- `409` if user with this email already exists
- `500` if no active default role/status is available

## Required DB column
`users` table must include `password_hash`:

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;
```

If you want every user to always have a password:

```sql
ALTER TABLE users
ALTER COLUMN password_hash SET NOT NULL;
```

## Password storage
- Passwords are hashed with `scrypt` before storing.
- API never returns `password_hash`.

## Environment variables
- `AUTH_JWT_SECRET` (required for `/api/login`)
- `AUTH_TOKEN_TTL_SECONDS` (optional, default `604800`)
- `SIGNUP_DEFAULT_ROLE_NAME` (optional, default `customer`)
- `SIGNUP_DEFAULT_STATUS_NAME` (optional, default `active`)
