# Profile Route Requirements

Date: 2026-04-18
Scope: oina-frontend + oina-backend

## Goal
Implement a complete profile flow so the frontend `/profile` page can:
- fetch current user profile from backend
- update editable profile fields
- display accurate game counters maintained by backend

## Current Gaps
- Frontend profile edit save is UI-only (no API call).
- Frontend auth service has no profile endpoints.
- Backend has no dedicated profile routes (`/users/me` or `/profile/me`).
- AuthProvider persists user from local storage, but does not refresh full profile from backend on app load.

## Functional Requirements

### Backend API
1. Add `GET /users/me`
- Auth required (Bearer token).
- Returns full authenticated user profile object.
- Includes fields:
  - `userId`
  - `email`
  - `username`
  - `displayName`
  - `bio`
  - `avatarUrl`
  - `isVerified`
  - `totalGames`
  - `gamesThisMonth`
  - `currentMonthStart`
  - `createdAt`
  - `updatedAt`

2. Add `PATCH /users/me`
- Auth required (Bearer token).
- Request body supports partial update of:
  - `displayName` (optional)
  - `bio` (optional)
  - `avatarUrl` (optional)
  - `username` (optional, only if uniqueness rules are implemented)
- Updates `updatedAt`.
- Returns updated user profile object.

3. Validation rules
- `displayName`: trim; min/max length constraints.
- `bio`: max length constraint.
- `avatarUrl`: valid URL format (or nullable behavior clearly defined).
- Reject unknown fields or ignore unknown fields consistently.
- Return `VALIDATION_ERROR` with details for invalid payload.

4. Error handling
- Reuse existing standardized error envelopes.
- Common errors:
  - `TOKEN_MISSING`, `TOKEN_INVALID`, `TOKEN_EXPIRED`
  - `USER_NOT_FOUND`
  - `VALIDATION_ERROR`

5. OpenAPI updates
- Add schema for profile update payload.
- Add path specs for `GET /users/me` and `PATCH /users/me`.
- Include response examples and auth requirements.

6. Infrastructure/CDK updates
- Add lambda handlers for get/update profile.
- Wire new lambdas in auth/user construct.
- Register API Gateway routes for `GET` and `PATCH`.
- Ensure required IAM and environment variables are present.

### Backend Services/Data
1. Add service methods
- `getCurrentUserProfile(userId)`
- `updateCurrentUserProfile(userId, patch)`

2. DynamoDB behavior
- Read user from `USERS_TABLE` by `userId`.
- Partial update only changed fields.
- Preserve non-edited fields.

3. Counters behavior
- `totalGames` and `gamesThisMonth` remain sourced from user record.
- Existing game create/delete flow remains source of truth.

### Frontend
1. Add profile service methods
- `getProfile()` -> `GET /users/me`
- `updateProfile(payload)` -> `PATCH /users/me`

2. AuthProvider changes
- On app init, if token exists, fetch profile from backend and set `user` state.
- Keep local storage user synchronized with latest backend response.

3. Profile page changes
- Save action must call update profile endpoint.
- Show loading state while saving.
- Show API error state on failure.
- Update UI with returned user data after success.

4. Optional refresh logic
- If profile update succeeds, update context user directly to avoid full page reload.

## Non-Functional Requirements
- Backward-compatible response envelope format.
- Keep route naming and auth patterns consistent with existing backend style.
- Add unit/integration coverage for new profile handlers/services.

## Testing Requirements

### Backend Tests
- `GET /users/me`
  - returns profile for valid token
  - returns 401 for missing/invalid token
  - returns 404 when user does not exist
- `PATCH /users/me`
  - updates each editable field
  - supports partial payload
  - rejects invalid payload
  - updates `updatedAt`

### Frontend Tests (or manual QA checklist)
- Profile page loads user data from API.
- Edit + Save updates display name/bio/avatar and persists after refresh.
- Error UI is shown when update fails.
- Counters display values from latest user payload.

## Suggested API Examples

### GET /users/me (200)
```json
{
  "statusCode": 200,
  "message": "Profile retrieved",
  "timestamp": "2026-04-18T10:00:00.000Z",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "username": "user",
    "displayName": "User Name",
    "bio": "Hello",
    "avatarUrl": "https://...",
    "isVerified": true,
    "totalGames": 2,
    "gamesThisMonth": 1,
    "currentMonthStart": "2026-04",
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-18T10:00:00.000Z"
  }
}
```

### PATCH /users/me request
```json
{
  "displayName": "New Name",
  "bio": "Updated bio"
}
```

### PATCH /users/me (200)
```json
{
  "statusCode": 200,
  "message": "Profile updated",
  "timestamp": "2026-04-18T10:05:00.000Z",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "displayName": "New Name",
    "bio": "Updated bio",
    "avatarUrl": "https://...",
    "isVerified": true,
    "totalGames": 2,
    "gamesThisMonth": 1,
    "currentMonthStart": "2026-04",
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-18T10:05:00.000Z"
  }
}
```

## Delivery Checklist
- [ ] Backend handlers added
- [ ] Backend services added
- [ ] API routes wired in CDK
- [ ] OpenAPI updated
- [ ] Frontend services added
- [ ] AuthProvider profile refresh implemented
- [ ] Profile page save wired to API
- [ ] Tests added/updated
