# OINA Backend - Architecture Plan

## Overview
Web game creation platform built with serverless AWS services (Lambda, API Gateway, DynamoDB, S3, Cognito).

---

## 1. AUTHENTICATION & AUTHORIZATION (Amazon Cognito + Custom Email Service)

### Architecture
- **Amazon Cognito User Pool** for user management & JWT generation
- **Nodemailer + SMTP** for sending verification codes and password reset codes (not AWS SES)
- **JWT tokens** for stateless API authorization
- **Token Blacklist (DynamoDB)** for logout & maximum security
- **Bcrypt** for password hashing (stored in Cognito)

### Key Features
- Email & password-based authentication
- **Email Verification**: 6-digit OTP code, 15-minute expiry
- **Access Token**: 1 hour expiry
- **Refresh Token**: 7 days expiry
- **Password Reset**: OTP code via email → user submits code + new password
- **Token Blacklist**: Any logged-out token is blacklisted (checked on every request)
- **Auth Middleware**: Validates JWT signature + checks token blacklist + extracts userId
- Hard account deletion (deletes user + all their games)

---

## 2. API ENDPOINTS

### 2.1 Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|-----------------|
| POST | `/auth/register` | Register user (email + password), sends OTP to email | ❌ |
| POST | `/auth/verify-email` | Verify email with 6-digit OTP code (completes registration) | ❌ |
| POST | `/auth/resend-verification-code` | Resend verification OTP to email | ❌ |
| POST | `/auth/login` | User login with email & password, returns access + refresh tokens | ❌ |
| POST | `/auth/refresh-token` | Refresh access token using refresh token | ❌ |
| POST | `/auth/logout` | Invalidate tokens (adds to blacklist) | ✅ |
| POST | `/auth/forgot-password` | Request password reset, sends OTP to email | ❌ |
| POST | `/auth/reset-password` | Confirm password reset with OTP + new password | ❌ |
| POST | `/auth/validate-token` | Validate current access token (returns user info) | ✅ |

### 2.2 User Profile Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|-----------------|
| GET | `/profile` | Get current user profile | ✅ |
| PUT | `/profile` | Update user profile | ✅ |
| DELETE | `/profile` | Delete user account | ✅ |
| GET | `/profile/settings` | Get user settings/preferences | ✅ |
| PUT | `/profile/settings` | Update user settings | ✅ |
| GET | `/profile/avatar` | Get user avatar | ✅ |
| POST | `/profile/avatar` | Upload avatar to S3 | ✅ |
| GET | `/users/{userId}` | Get public user profile | ❌ |

### 2.3 Game Management Endpoints (Creator)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|-----------------|
| POST | `/games` | Create new game (checks quota: 5 max, 3/month) | ✅ |
| GET | `/games` | List user's games (all visibility types) | ✅ |
| GET | `/games/{gameId}` | Get specific game details | ✅ |
| PUT | `/games/{gameId}` | Update game (any visibility) | ✅ |
| DELETE | `/games/{gameId}` | Hard delete game | ✅ |
| POST | `/games/{gameId}/publish` | Set visibility: 'private-link' or 'public' | ✅ |
| POST | `/games/{gameId}/unpublish` | Set visibility back to 'draft' | ✅ |
| GET | `/games/{gameId}/preview` | Preview draft game (creator only) | ✅ |
| GET | `/games/{gameId}/versions` | List game version history | ✅ |

### 2.4 Game Assets/Files Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|-----------------|
| POST | `/games/{gameId}/assets/upload` | Upload asset via API proxy (10MB max) | ✅ |
| GET | `/games/{gameId}/assets` | List game assets | ✅ |
| DELETE | `/games/{gameId}/assets/{assetId}` | Delete specific asset | ✅ |

### 2.5 Published Games Discovery Endpoints (Public)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|-----------------|
| GET | `/games/public` | List all public games (cursor pagination, newest first) | ❌ |
| GET | `/games/public?sort=likes` | Sort by likes, views, or date | ❌ |
| GET | `/games/public?category={cat}` | Filter by category | ❌ |
| GET | `/games/share/{shareLink}` | Access game by share link (private-link or public) | ❌ |
| GET | `/games/by-author/{userId}` | Get user's public games | ❌ |

### 2.6 Game Interaction Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|-----------------|
| POST | `/games/{gameId}/like` | Toggle like (increment/decrement count) | ✅ |
| POST | `/games/{gameId}/view` | Increment view count | ❌ |
| POST | `/games/{gameId}/play` | Increment play count | ❌ |

### 2.7 AI Assistance Endpoints (Future)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|-----------------|
| POST | `/ai/generate-text` | Generate game text content | ✅ |
| POST | `/ai/suggest-palette` | Suggest color palette for game | ✅ |
| POST | `/ai/enhance-description` | Improve game description | ✅ |

---

## 3. AUTH SERVICE IMPLEMENTATION DETAILS

### Email Verification Flow
```
1. User calls POST /auth/register { email, password }
   ↓
2. Check if email exists in Users table
   ↓
3. Generate 6-digit OTP code, hash with bcrypt, store in OTPCodes table (TTL: 15 min)
   ↓
4. Send email via nodemailer with OTP code
   ↓
5. Return success message (email sent)
   ↓
6. User calls POST /auth/verify-email { email, code }
   ↓
7. Retrieve OTP from OTPCodes table, verify code with bcrypt
   ↓
8. If valid: Create user in Users table with isVerified=true, delete OTP
   ↓
9. Return success (registration complete)
```

### Login Flow
```
1. User calls POST /auth/login { email, password }
   ↓
2. Retrieve user from Users table (query by email GSI)
   ↓
3. Verify password with bcrypt against stored hash
   ↓
4. Generate JWT access token (1 hour expiry) + refresh token (7 days expiry)
   ↓
5. Return { accessToken, refreshToken, user }
```

### Password Reset Flow
```
1. User calls POST /auth/forgot-password { email }
   ↓
2. Check if user exists by email
   ↓
3. Generate 6-digit OTP code, hash with bcrypt, store in OTPCodes table (TTL: 15 min)
   ↓
4. Send email via nodemailer with OTP code
   ↓
5. Return success message (email sent)
   ↓
6. User calls POST /auth/reset-password { email, code, newPassword }
   ↓
7. Retrieve OTP from OTPCodes table, verify code with bcrypt
   ↓
8. If valid: Hash new password with bcrypt, update user's password in Users table, delete OTP
   ↓
9. Add all user's existing tokens to TokenBlacklist (force re-login on all devices)
   ↓
10. Return success
```

### Token Refresh Flow
```
1. User calls POST /auth/refresh-token { refreshToken }
   ↓
2. Verify refresh token JWT signature & expiry
   ↓
3. Check TokenBlacklist table - reject if token is blacklisted
   ↓
4. Extract userId from refresh token
   ↓
5. Generate new access token (1 hour expiry)
   ↓
6. Return { accessToken }
```

### Logout Flow (Token Blacklist)
```
1. User calls POST /auth/logout { accessToken }
   ↓
2. Verify JWT signature
   ↓
3. Extract jti (JWT ID) from token
   ↓
4. Extract expiresAt (natural expiry timestamp)
   ↓
5. Add record to TokenBlacklist table with { tokenJti, userId, expiresAt }
   ↓
6. Return success
   ↓
7. DynamoDB TTL automatically deletes record after expiresAt
```

### Auth Middleware (For Protected Endpoints)
```
1. Extract Authorization header: "Bearer {accessToken}"
   ↓
2. Verify JWT signature against Cognito public key
   ↓
3. Check if token is expired
   ↓
4. Query TokenBlacklist table with token's jti
   ↓
5. If found in blacklist: return 401 Unauthorized
   ↓
6. Extract userId from token claims
   ↓
7. Attach userId to request context
   ↓
8. Proceed to next middleware/handler
```

### Token Structure (JWT)
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "uuid-here",
    "email": "user@example.com",
    "jti": "unique-token-id",
    "iat": 1678536000,
    "exp": 1678539600,
    "type": "access"
  },
  "signature": "..."
}
```

### SMTP Configuration
Environment variables (passed via GitHub Actions secrets):
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@example.com
```

---

## 4. DYNAMODB TABLE STRUCTURE

### 3.1 Users Table
**Table Name:** `Users`

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `userId` | String | PK | Cognito user ID (UUID) |
| `email` | String | GSI | User email address |
| `username` | String | GSI | Unique username |
| `displayName` | String | - | User's display name |
| `bio` | String | - | User bio/description |
| `avatarUrl` | String | - | S3 URL to user avatar |
| `isVerified` | Boolean | - | Email verification status |
| `totalGames` | Number | - | Current game count (max 5) |
| `gamesThisMonth` | Number | - | Games created this month (max 3) |
| `currentMonthStart` | String | - | ISO date of current quota month |
| `createdAt` | String | - | ISO-8601 timestamp |
| `updatedAt` | String | - | ISO-8601 timestamp |
| `preferences` | Map | - | User settings (theme, notifications, etc.) |

**Password Storage:** Managed by Cognito (not stored in DynamoDB). Cognito handles bcrypt hashing internally.

**GSI:**
- GSI1: `email-index` (for email lookups)
- GSI2: `username-index` (for username lookups)

**TTL:** None

---

### 3.2 TokenBlacklist Table (For Logout Security)
**Table Name:** `TokenBlacklist`

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `tokenJti` | String | PK | Unique token identifier (extracted from JWT) |
| `userId` | String | GSI | User who logged out this token |
| `expiresAt` | Number | TTL | Unix timestamp when token naturally expires |
| `blacklistedAt` | String | - | ISO-8601 timestamp when token was blacklisted |

**GSI:**
- GSI1: `userId-blacklistedAt-index` (partition: userId, sort: blacklistedAt) - Find user's blacklisted tokens

**TTL:** `expiresAt` - Automatically deletes expired tokens after their natural expiry time

**Purpose:** When user logs out, their token is added here. On every API request, middleware checks if token is in this table. Once token naturally expires, DynamoDB TTL removes it automatically.

---

### 3.3 OTP Codes Table (For Email Verification & Password Reset)
**Table Name:** `OTPCodes`

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `otpId` | String | PK | Unique OTP request ID (UUID) |
| `email` | String | GSI | User's email address |
| `type` | String | - | 'email-verification' or 'password-reset' |
| `code` | String | - | 6-digit OTP code (hashed with bcrypt) |
| `userId` | String | - | Associated userId (null for new registrations) |
| `attempts` | Number | - | Number of failed verification attempts |
| `createdAt` | String | - | ISO-8601 timestamp |
| `expiresAt` | Number | TTL | Unix timestamp (15 minutes from creation) |

**GSI:**
- GSI1: `email-type-index` (partition: email, sort: type) - Find active OTP for user

**TTL:** `expiresAt` - Automatically deletes expired OTPs

**Purpose:** Stores temporary OTP codes sent via email. User must submit correct code within 15 minutes. Max 5 attempts, then OTP expires.

---

### 3.4 Games Table
**Table Name:** `Games`

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `gameId` | String | PK | Unique game ID (UUID) |
| `userId` | String | GSI | Creator's user ID |
| `title` | String | - | Game title |
| `description` | String | - | Game description |
| `thumbnail` | String | - | S3 URL to game thumbnail |
| `category` | String | GSI | Game category (quiz, crossword, puzzle, etc.) |
| `tags` | List | - | Array of tags |
| `visibility` | String | GSI | 'draft', 'private-link', or 'public' |
| `content` | Map | - | Game data (config, questions, grid, etc.) <100KB |
| `publishedAt` | String | - | ISO-8601 timestamp when first published |
| `createdAt` | String | GSI | ISO-8601 timestamp |
| `updatedAt` | String | - | ISO-8601 timestamp |
| `shareLink` | String | GSI | Unique UUID slug for share URL |
| `viewCount` | Number | - | Total views |
| `playCount` | Number | - | Total plays |
| `likeCount` | Number | - | Total likes (increment/decrement) |
| `likedBy` | Set | - | Set of userIds who liked (for toggle logic) |

**GSI:**
- GSI1: `userId-createdAt-index` (partition: userId, sort: createdAt) - Find user's games
- GSI2: `visibility-createdAt-index` (partition: visibility, sort: createdAt) - Find public games by date
- GSI3: `visibility-likeCount-index` (partition: visibility, sort: likeCount) - Sort by popularity
- GSI4: `shareLink-index` (partition: shareLink) - Direct share URL access
- GSI5: `category-likeCount-index` (partition: category, sort: likeCount) - Popular by category

**TTL:** None

---

### 3.5 GameVersions Table (Simplified for MVP)
**Table Name:** `GameVersions`

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| `versionId` | String | PK | Unique version ID |
| `gameId` | String | GSI | Game ID (for querying versions) |
| `userId` | String | - | Creator user ID |
| `versionNumber` | Number | - | Version number (1, 2, 3...) |
| `changeLog` | String | - | Description of changes (text only) |
| `visibility` | String | - | Snapshot of visibility at this version |
| `createdAt` | String | - | ISO-8601 timestamp |

**GSI:**
- GSI1: `gameId-createdAt-index` (partition: gameId, sort: createdAt) - Get versions for a game

**TTL:** None

**Note:** Content stored in Games table only, versions track change history

---

## 5. S3 BUCKET STRUCTURE

### Main Game Assets Bucket: `oina-games-assets`

```
/
├── games/
│   ├── {gameId}/
│   │   ├── assets/
│   │   │   ├── images/            # PNG, JPG, GIF (inline game assets)
│   │   │   ├── audio/             # MP3, WAV (future)
│   │   │   └── video/             # MP4 (future)
│   │   └── rewards/
│   │       ├── {rewardId}.jpg     # Reward image uploaded by creator
│   │       ├── {rewardId}.mp4     # Reward video message from creator
│   │       └── {rewardId}.mp3     # Reward audio message from creator
│   └── ...
├── thumbnails/
│   ├── {gameId}.png               # Auto-generated or uploaded
│   └── ...
└── user-avatars/
    ├── {userId}.jpg
    └── ...
```

**Access Control:**
- All S3 access proxied through API (no direct CORS)
- Game assets: 10MB max total per game
- Reward media: 50MB max per file (to allow video messages)
- Supported reward media types: PNG, JPG, GIF, MP4, MP3, WAV, M4A
- Reward media presigned URLs: **no auth required** (accessible by anonymous players via share link)
- Presigned URL expiry: 15 minutes
- Content data (including text rewards) stored in DynamoDB `Games.content`

---

## 6. LAMBDA FUNCTIONS

### API Routes (Lambda @ API Gateway)
- Authentication handlers (Sign up, Sign in, Verify, Password reset)
- User profile CRUD + avatar upload
- Game management CRUD (with quota validation)
- Game discovery & filtering
- Interactions (likes, views, plays)
- AI assistance (text generation, color palettes)

### Trigger Functions
- Post-confirmation trigger (Cognito) → Create user profile in DynamoDB with initial quotas
- Game delete trigger → Decrement user totalGames counter
- Monthly scheduled job → Reset gamesThisMonth counters

---

## 7. API RESPONSE STRUCTURE

### Standard Success Response
```json
{
  "statusCode": 200,
  "data": {
    // Resource data
  },
  "message": "Operation successful",
  "timestamp": "2026-03-01T10:00:00Z"
}
```

### Error Response
```json
{
  "statusCode": 400,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {}
}
```

---

## 8. SECURITY & BEST PRACTICES

### Authentication
- ✅ Cognito for authentication
- ✅ JWT tokens with 1-hour expiry
- ✅ Refresh tokens for long-lived sessions
- ✅ API Gateway authorizers

### Data Protection
- ✅ Encryption at rest (DynamoDB, S3)
- ✅ Encryption in transit (HTTPS/TLS)
- ✅ Presigned URLs for S3 access (15-min expiry)
- ✅ CORS policy restrictions

### Rate Limiting
- ✅ API Gateway throttling
- ✅ Per-user rate limits
- ✅ DynamoDB on-demand pricing with auto-scaling

### Data Validation
- ✅ Input sanitization on all endpoints
- ✅ File size limits (max 10MB total per game)
- ✅ Allowed file types: PNG, JPG, GIF, MP3, WAV, MP4
- ✅ Game creation quota enforcement (5 max, 3/month)

---

## 9. DEPLOYMENT STRUCTURE (AWS CDK)

### Overall Architecture - Single Comprehensive Stack

```
lib/
├── stacks/
│   └── OinaBackendStack.ts        # All phases in ONE stack (conditionally deployed)
├── services/                       # Shared business logic
│   ├── auth.service.ts
│   ├── email.service.ts
│   ├── token.service.ts
│   └── cognito.service.ts
├── middleware/
│   ├── auth.middleware.ts
│   └── ... (other middleware)
├── handlers/                       # Lambda function handlers
│   ├── auth/
│   │   ├── register.ts
│   │   ├── login.ts
│   │   ├── logout.ts
│   │   ├── verify-email.ts
│   │   ├── resend-code.ts
│   │   ├── refresh-token.ts
│   │   ├── forgot-password.ts
│   │   ├── reset-password.ts
│   │   └── validate-token.ts
│   ├── profile/               # Phase 2
│   │   ├── get-profile.ts
│   │   ├── update-profile.ts
│   │   └── ... (other profile endpoints)
│   └── games/                 # Phase 3 (NOT DISCUSSED)
│       ├── create-game.ts
│       └── ... (other game endpoints)
├── types/
│   ├── auth.types.ts
│   ├── user.types.ts
│   ├── game.types.ts
│   └── responses.types.ts
├── utils/
│   ├── otp.ts
│   ├── jwt.ts
│   ├── validators.ts
│   └── errors.ts
└── config/
    └── smtp.config.ts
```

### Single Stack Pattern (OinaBackendStack.ts)

```typescript
// oina-backend-stack.ts
constructor(scope: Construct, id: string, props?: cdk.StackProps) {
  super(scope, id, props);
  
  // PHASE 2: Auth & Users
  // Cognito User Pool + Client
  // Lambda functions for /auth/* endpoints
  // Lambda functions for /profile/* endpoints
  // IAM roles, DynamoDB access, API Gateway routes
  
  // PHASE 3+: Only add when discussed and approved
  // Lambda functions for /games/* endpoints
  // Game management infrastructure
}
```

#### What Goes in OinaBackendStack:

**Phase 2 (Default - Always Deployed)**
- Cognito User Pool + Client configuration
- 9 Auth Lambda functions (register, login, logout, etc.)
- User profile CRUD Lambda functions
- IAM roles for Lambda + DynamoDB + Cognito access
- API Gateway routes: `/auth/*` and `/profile/*`
- CloudWatch logging

**Phase 3+ (Added when discussed & approved)**
- Game management Lambda functions
- Game discovery Lambda functions
- Additional API Gateway routes

#### Deployment with GitHub Actions

```yaml
- name: Deploy CDK Stack
  run: npx cdk deploy --all
```

#### Environment Variables

```
COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID
DYNAMODB_USERS_TABLE
DYNAMODB_OTP_TABLE
DYNAMODB_BLACKLIST_TABLE
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
JWT_SECRET
OTP_EXPIRY_MINUTES=15
```

---

## 10. PHASE-BY-PHASE IMPLEMENTATION

**⚠️ IMPORTANT:** Phases marked as "NOT DISCUSSED" should NOT be implemented without prior discussion and agreement. Only work on phases that have been explicitly confirmed.

### Phase 1: Core Infrastructure (MVP Foundation)
- [ ] Cognito User Pool (email + password auth, configurable token expiry)
- [ ] DynamoDB: Users, Games, GameVersions, OTPCodes, TokenBlacklist tables
- [ ] S3 bucket with API proxy setup
- [ ] API Gateway with rate limiting

### Phase 2: Authentication & Users
**Location:** `lib/stacks/OinaBackendStack.ts` (enabled by default)

- [ ] Cognito User Pool setup (email + password auth)
- [ ] Nodemailer integration with SMTP (email delivery)
- [ ] Email verification flow (6-digit OTP, 15 min expiry)
- [ ] User registration (email + password + verification)
- [ ] User login (email + password → JWT tokens)
- [ ] Token refresh flow (refresh token → new access token)
- [ ] Password reset flow (OTP verification + new password)
- [ ] Token blacklist table & logout functionality
- [ ] Auth middleware (JWT validation + blacklist check)
- [ ] Token validation endpoint
- [ ] User profile CRUD
- [ ] Avatar upload (API proxy to S3)
- [ ] Account deletion (hard delete + cascade games)

### Phase 3: Game Management (APPROVED - VARIANT 1)
**Location:** `lib/stacks/OinaBackendStack.ts`

- [ ] Create game with quota validation (5 max, 3/month)
- [ ] Update, delete games
- [ ] Three visibility states: draft, private-link, public
- [ ] Share link generation (UUID slug)
- [ ] Asset upload via API proxy (10MB limit)
- [ ] Game versions (change log tracking)
- [ ] Preview endpoint for drafts

#### Phase 3.1 - Variant 1 Mandatory Scope (Implementation Checklist)

**Infrastructure (CDK)**
- [ ] Add `Games` table (PK: `gameId`) with GSIs:
   - [ ] `userId-createdAt-index` (PK `userId`, SK `createdAt`)
   - [ ] `visibility-createdAt-index` (PK `visibility`, SK `createdAt`)
   - [ ] `visibility-likeCount-index` (PK `visibility`, SK `likeCount`)
   - [ ] `shareLink-index` (PK `shareLink`)
   - [ ] `category-likeCount-index` (PK `category`, SK `likeCount`)
- [ ] Add `GameVersions` table (PK `versionId`) with GSI:
   - [ ] `gameId-createdAt-index` (PK `gameId`, SK `createdAt`)
- [ ] Add game Lambda functions in stack:
   - [ ] `create-game.ts`
   - [ ] `list-games.ts`
   - [ ] `get-game.ts`
   - [ ] `update-game.ts`
   - [ ] `delete-game.ts`
   - [ ] `publish-game.ts`
   - [ ] `unpublish-game.ts`
   - [ ] `preview-game.ts`
   - [ ] `list-game-versions.ts`
- [ ] Add API Gateway routes:
   - [ ] `POST /games`
   - [ ] `GET /games`
   - [ ] `GET /games/{gameId}`
   - [ ] `PUT /games/{gameId}`
   - [ ] `DELETE /games/{gameId}`
   - [ ] `POST /games/{gameId}/publish`
   - [ ] `POST /games/{gameId}/unpublish`
   - [ ] `GET /games/{gameId}/preview`
   - [ ] `GET /games/{gameId}/versions`
- [ ] Add env vars for game handlers:
   - [ ] `DYNAMODB_GAMES_TABLE`
   - [ ] `DYNAMODB_GAME_VERSIONS_TABLE`
- [ ] Grant IAM read/write permissions for both game tables to game Lambda role

**Backend Domain Model**
- [ ] Create `src/types/game.types.ts`:
   - [ ] `GameVisibility = 'draft' | 'private-link' | 'public'`
   - [ ] `GameType = 'choose-me' | 'guess-by-emoji' | 'crossword'`
   - [ ] `GameRecord` and `GameVersionRecord`
   - [ ] DTOs for create/update/publish/list responses
- [ ] Create `src/services/games.service.ts`:
   - [ ] `createGame(userId, payload)`
   - [ ] `listUserGames(userId, cursor?)`
   - [ ] `getUserGame(userId, gameId)`
   - [ ] `updateGame(userId, gameId, payload)`
   - [ ] `deleteGame(userId, gameId)`
   - [ ] `publishGame(userId, gameId, visibility)`
   - [ ] `unpublishGame(userId, gameId)`
   - [ ] `listGameVersions(userId, gameId)`
- [ ] Create `src/utils/game-validators.ts` for payload validation by `type`

**Auth and Ownership**
- [ ] Reuse existing auth middleware to extract `userId`
- [ ] For every game endpoint, enforce owner check (`game.userId === auth.userId`)
- [ ] Return `403 FORBIDDEN` for non-owner access, `404` if game does not exist

**Quota Logic (critical)**
- [ ] Enforce limits during `POST /games`:
   - [ ] Max active games per user: 5
   - [ ] Max created games in rolling month bucket: 3
- [ ] Keep user counters in `Users` table:
   - [ ] `totalGames`
   - [ ] `gamesThisMonth`
   - [ ] `currentMonthStart` (`YYYY-MM`)
- [ ] Implement month rollover logic:
   - [ ] If current `YYYY-MM` differs from `currentMonthStart`, reset `gamesThisMonth` to 0 before increment
- [ ] Use DynamoDB `TransactWriteItems` for atomic create flow:
   - [ ] conditional update on `Users`
   - [ ] insert game record in `Games`
   - [ ] insert initial version record in `GameVersions`

**Versioning Rules (MVP)**
- [ ] Create version `1` when game is first created
- [ ] On each successful update/publish/unpublish create new version record with:
   - [ ] `versionNumber = previous + 1`
   - [ ] `changeLog` from request or default auto-message
   - [ ] `visibility` snapshot
- [ ] Keep latest content only in `Games`; `GameVersions` stores metadata snapshots for history list

**Visibility and Share Rules**
- [ ] Allowed state transitions:
   - [ ] `draft -> private-link`
   - [ ] `draft -> public`
   - [ ] `private-link -> public`
   - [ ] `public -> private-link`
   - [ ] `private-link/public -> draft` (unpublish)
- [ ] On first publish to `private-link` or `public`:
   - [ ] set `publishedAt` if empty
   - [ ] generate stable `shareLink` UUID if empty
- [ ] `GET /games/{gameId}/preview` available only for owner and only for `draft` state

**Rewards System — data model must be included in Phase 3.1**

Vision: the game creator attaches rewards to their game at creation/edit time.
The player is anonymous. Scoring and reward unlock logic runs entirely client-side.
The backend stores reward definitions as part of `content` and serves reward media via presigned S3 URLs (no player account required).

Two reward types:
1. **Text reward** — inline in `content`, delivered with the game payload. No extra backend calls.
2. **Media reward** (photo/video/audio) — stored in S3 under `games/{gameId}/rewards/`, served via a public-safe presigned URL endpoint.

Reward unlock model: each reward has a `pointsThreshold` (integer ≥ 0). The client calculates the player's score, finds the highest threshold the player met, and displays that reward. Threshold `0` means "shown on any completion".

Content extension for rewards (applies to all game types):
```json
"rewards": [
  {
    "id": "r1",
    "pointsThreshold": 0,
    "label": "You finished!",
    "type": "text",
    "text": "Happy Birthday! 🎂"
  },
  {
    "id": "r2",
    "pointsThreshold": 80,
    "label": "Champion!",
    "type": "image",
    "assetKey": "games/{gameId}/rewards/r2.jpg"
  },
  {
    "id": "r3",
    "pointsThreshold": 100,
    "label": "Perfect score!",
    "type": "video",
    "assetKey": "games/{gameId}/rewards/r3.mp4"
  }
]
```

Scoring config (per game type):
```json
"scoring": {
  "enabled": true,
  "maxScore": 100
}
```

Rules:
- [ ] `rewards` is an optional array in `content` (max 5 rewards per game)
- [ ] `scoring.enabled: false` → rewards only show on completion (threshold ignored)
- [ ] `scoring.enabled: true` → rewards shown based on score threshold
- [ ] Text rewards are stored inline in `content`, no S3 upload needed
- [ ] Media reward `assetKey` is filled automatically by the backend after upload (Phase 3.2)
- [ ] When game is deleted, all reward media assets under `games/{gameId}/rewards/` are deleted from S3
- [ ] Phase 3.1 scope: text rewards only (full structure defined now to avoid schema breaking changes)
- [ ] Phase 3.2 scope: media reward upload + presigned URL endpoint

**New API endpoint for media reward access (Phase 3.2)**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|-----------------|
| GET | `/games/share/{shareLink}/rewards/{rewardId}/media` | Get presigned S3 URL for reward media (anonymous access) | ❌ |
| POST | `/games/{gameId}/rewards/{rewardId}/upload` | Upload reward media asset | ✅ |

---

**Create Game Contract (to align frontend and backend)**

Request: `POST /games`
```json
{
   "type": "choose-me",
   "title": "How well do you know me?",
   "description": "Birthday surprise game",
   "category": "quiz",
   "tags": ["birthday", "friends"],
   "content": {
      "recipient": { "name": "Sarah", "occasion": "Birthday" },
      "personalMessage": "Let's play!",
      "questions": [],
      "scoring": { "enabled": false },
      "rewards": [
         {
            "id": "r1",
            "pointsThreshold": 0,
            "label": "You did it!",
            "type": "text",
            "text": "Happy Birthday Sarah! 🎂"
         }
      ]
   }
}
```

Response: `201`
```json
{
   "statusCode": 201,
   "message": "Game created",
   "timestamp": "2026-04-12T10:00:00.000Z",
   "data": {
      "gameId": "uuid",
      "userId": "uuid",
      "type": "choose-me",
      "title": "How well do you know me?",
      "visibility": "draft",
      "createdAt": "2026-04-12T10:00:00.000Z",
      "updatedAt": "2026-04-12T10:00:00.000Z",
      "content": {}
   }
}
```

Validation rules:
- [ ] `title` required, trim, length 1..120
- [ ] `description` optional, max 1000
- [ ] `type` required enum: `choose-me | guess-by-emoji | crossword`
- [ ] `content` required, max serialized size 100KB
- [ ] `tags` max 10, each tag length 1..30
- [ ] `content.rewards` optional array, max 5 items
- [ ] each reward: `id`, `pointsThreshold` (0..100000), `label` (1..80), `type` (`text` | `image` | `video` | `audio`)
- [ ] text reward: `text` required, max 2000 chars
- [ ] media reward (`image`/`video`/`audio`): `assetKey` is set by backend after upload, not accepted from client
- [ ] `content.scoring.enabled` boolean, optional (default false)

Error codes for create endpoint:
- [ ] `QUOTA_TOTAL_GAMES_EXCEEDED`
- [ ] `QUOTA_MONTHLY_GAMES_EXCEEDED`
- [ ] `INVALID_GAME_PAYLOAD`
- [ ] `CONTENT_TOO_LARGE`
- [ ] `UNAUTHORIZED`
- [ ] `INVALID_REWARD_PAYLOAD`

**Handler File Plan**
- [ ] `src/handlers/games/create-game.ts`
- [ ] `src/handlers/games/list-games.ts`
- [ ] `src/handlers/games/get-game.ts`
- [ ] `src/handlers/games/update-game.ts`
- [ ] `src/handlers/games/delete-game.ts`
- [ ] `src/handlers/games/publish-game.ts`
- [ ] `src/handlers/games/unpublish-game.ts`
- [ ] `src/handlers/games/preview-game.ts`
- [ ] `src/handlers/games/list-game-versions.ts`

**OpenAPI / Docs**
- [ ] Extend `openapi.ts` with `Games` tag and schemas:
   - [ ] `CreateGameRequest`
   - [ ] `UpdateGameRequest`
   - [ ] `PublishGameRequest`
   - [ ] `GameResponse`
   - [ ] `GameListResponse`
   - [ ] `VersionResponse`
- [ ] Add all Phase 3 endpoint definitions and examples

**Testing (must-have before merge)**
- [ ] Unit tests for service methods:
   - [ ] quota pass/fail
   - [ ] month rollover
   - [ ] ownership checks
   - [ ] visibility transitions
   - [ ] version incrementing
- [ ] Integration tests for handlers (happy path + critical errors)
- [ ] At least one test covering DynamoDB transaction conflict/retry behavior

**Operational safeguards**
- [ ] CloudWatch structured logs for all game handlers:
   - [ ] `requestId`, `userId`, `gameId`, `operation`, `errorCode`
- [ ] API Gateway throttling for write endpoints
- [ ] Idempotency strategy for `POST /games` (optional for MVP, required before production)

**Frontend Handoff (develop branch alignment)**
- [ ] Frontend will call `POST /games` from publish step handlers
- [ ] Frontend stores returned `gameId` and uses `PUT /games/{gameId}` for edits
- [ ] Frontend publish button calls `POST /games/{gameId}/publish`
- [ ] Keep response envelope format compatible with existing interceptor (`data` wrapper)
- [ ] Frontend includes `content.rewards` and `content.scoring` fields when building the game payload
- [ ] Text rewards are sent inline; media rewards are uploaded separately via Phase 3.2 endpoint

#### Phase 3.2 - Reward Media Uploads (PLANNED, implement after 3.1)
**Location:** `lib/stacks/OinaBackendStack.ts`

- [ ] S3 bucket path: `games/{gameId}/rewards/{rewardId}.{ext}`
- [ ] Lambda: `upload-reward-media.ts` — creator uploads image/video/audio for a reward
  - [ ] Auth required, owner-only
  - [ ] Max file size: 50 MB (larger than game assets to allow video messages)
  - [ ] Allowed types: PNG, JPG, GIF, MP4, MP3, WAV, M4A
  - [ ] After upload: writes `assetKey` into `content.rewards[id].assetKey` via `PUT /games/{gameId}`
- [ ] Lambda: `get-reward-media.ts` — returns a 15-min presigned S3 URL for reward media
  - [ ] **No auth required** (anonymous player access)
  - [ ] Accessed by shareLink (not gameId) to prevent guessing
  - [ ] Endpoint: `GET /games/share/{shareLink}/rewards/{rewardId}/media`
  - [ ] Validates that game visibility is `private-link` or `public`
  - [ ] Validates that `rewardId` exists in game `content.rewards`
- [ ] On game delete: delete all objects under `games/{gameId}/rewards/` from S3
- [ ] env vars: `S3_GAME_ASSETS_BUCKET` (reuse existing bucket, add `/rewards/` prefix)

### Phase 4: Discovery & Interaction (NOT DISCUSSED)
**Location:** `lib/stacks/OinaBackendStack.ts`

- [ ] Public games listing (cursor pagination, newest first)
- [ ] Sort by: date, likes, views, category
- [ ] Share link access
- [ ] Like toggle (increment/decrement)
- [ ] View/play count tracking
- [ ] User's public games page

### Phase 5: AI Features (NOT DISCUSSED, Future)
**Location:** `lib/stacks/OinaBackendStack.ts`

- [ ] Text generation for game content
- [ ] Color palette suggestions
- [ ] Description enhancement

### Phase 6: Monitoring & Optimization (NOT DISCUSSED)
**Location:** `lib/stacks/OinaBackendStack.ts`

- [ ] CloudWatch logging
- [ ] Error tracking
- [ ] Cost optimization
- [ ] Performance monitoring

---

## 11. EXAMPLE GAME DATA STRUCTURES

> All game types share a common `scoring` and `rewards` envelope in `content`.
> Both are optional. Text rewards are stored inline; media rewards reference S3 keys.

### Quiz/Choice Game ("Choose Me") — with scoring + rewards
```json
{
  "type": "choose-me",
  "title": "How well do you know me?",
  "content": {
    "recipient": { "name": "Sarah", "occasion": "Birthday" },
    "personalMessage": "Let's see how well you know me 🎂",
    "questions": [
      {
        "id": "q1",
        "text": "What's my favourite colour?",
        "options": [
          {"id": "a", "text": "Blue", "correct": true, "points": 10},
          {"id": "b", "text": "Red", "correct": false, "points": 0}
        ]
      }
    ],
    "scoring": { "enabled": true, "maxScore": 100 },
    "rewards": [
      {
        "id": "r1",
        "pointsThreshold": 0,
        "label": "You finished!",
        "type": "text",
        "text": "Thanks for playing! 🎉"
      },
      {
        "id": "r2",
        "pointsThreshold": 80,
        "label": "Amazing score!",
        "type": "video",
        "assetKey": "games/abc-123/rewards/r2.mp4"
      }
    ]
  }
}
```

### Crossword Game
```json
{
  "type": "crossword",
  "title": "My Crossword",
  "content": {
    "recipient": { "name": "Jamie", "occasion": "Anniversary" },
    "personalMessage": "Solve our story 💛",
    "grid": {
      "rows": 10,
      "cols": 10,
      "cells": [[{"char": "A", "number": 1}]]
    },
    "clues": {
      "across": [{"number": 1, "clue": "Capital of France", "answer": "PARIS"}],
      "down": [{"number": 2, "clue": "...", "answer": "..."}]
    },
    "scoring": { "enabled": true, "maxScore": 100 },
    "rewards": [
      {
        "id": "r1",
        "pointsThreshold": 0,
        "label": "Finished!",
        "type": "text",
        "text": "You're amazing! 🧩"
      },
      {
        "id": "r2",
        "pointsThreshold": 100,
        "label": "Perfect!",
        "type": "image",
        "assetKey": "games/xyz-789/rewards/r2.jpg"
      }
    ]
  }
}
```

### Guess By Emoji Game
```json
{
  "type": "guess-by-emoji",
  "title": "Guess our memories!",
  "content": {
    "recipient": { "name": "Alex", "occasion": "Graduation" },
    "personalMessage": "Each puzzle is a memory 🎓",
    "puzzles": [
      {
        "id": "p1",
        "emojis": ["🗼", "🥐", "☕"],
        "answer": "Paris trip",
        "difficulty": "easy"
      }
    ],
    "showAnswers": true,
    "scoring": { "enabled": true, "maxScore": 100 },
    "rewards": [
      {
        "id": "r1",
        "pointsThreshold": 0,
        "label": "Done!",
        "type": "audio",
        "assetKey": "games/def-456/rewards/r1.mp3"
      }
    ]
  }
}
```

**Note:** Player progress and score calculation run in browser only (no backend tracking). Backend stores reward definitions and serves reward media via presigned URLs.

---

## 12. COST ESTIMATION (Rough Monthly)

| Service | Estimate | Notes |
|---------|----------|-------|
| **Cognito** | $0-5 | 50k MAU free tier included |
| **DynamoDB** | $25-50 | On-demand pricing, depends on usage |
| **Lambda** | $10-30 | 1M free requests/month |
| **S3** | $15-40 | Storage + transfer costs |
| **API Gateway** | $3.50+ | $3.50 per million requests |
| **CloudWatch** | $5-15 | Logs and monitoring |
| **Total** | **$58-140** | Scales with usage |

---

## 13. EXECUTION ORDER FOR AGENT (VARIANT 1)

Use this order to avoid rework and broken deploys.

**Phase 3.1 (implement fully first)**
1. Implement CDK tables + env vars + IAM grants for game resources.
2. Implement game types + validators + service logic.
3. Implement `POST /games` handler first (with full quota transaction, text rewards + scoring schema included in content from day 1).
4. Implement `GET /games` and `GET /games/{gameId}`.
5. Implement `PUT /games/{gameId}` and version incrementing.
6. Implement publish/unpublish + share link behavior.
7. Implement delete + counter decrement consistency + reward media cleanup stub.
8. Add versions and preview endpoints.
9. Update OpenAPI schemas and endpoint docs.
10. Add/finish tests, run build and tests, then deploy to dev.

**Phase 3.2 (after 3.1 is deployed)**
11. Implement S3 reward media upload endpoint (creator, auth required).
12. Implement presigned URL endpoint for reward media (anonymous, by shareLink).
13. Add reward media cleanup to game delete flow.
14. Add tests for media upload and anonymous access.

### Definition of Done (Phase 3.1)
- [ ] All Phase 3.1 checklist items are completed.
- [ ] `content.rewards` and `content.scoring` fields are accepted and stored correctly for text rewards.
- [ ] `POST /games` is consumed successfully by frontend develop branch.
- [ ] No auth regression for existing `/auth/*` endpoints.
- [ ] Build/test pipeline is green.
- [ ] API docs updated and deployed.

### Definition of Done (Phase 3.2)
- [ ] Creator can upload an image/video/audio file as a reward asset.
- [ ] Anonymous player can get a presigned URL for reward media via shareLink.
- [ ] Game delete cascades to reward media in S3.
- [ ] Tests cover anonymous access and creator-only upload.

---

This plan provides a scalable, secure foundation for your web game platform. You can start with Phase 1-2 and expand based on user feedback and adoption.
