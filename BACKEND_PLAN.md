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
│   │   └── assets/
│   │       ├── images/            # PNG, JPG, GIF
│   │       ├── audio/             # MP3, WAV (future)
│   │       └── video/             # MP4 (future)
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
- Supported types: images (now), audio/video (future)
- Content data stored in DynamoDB (under 100KB expected)

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

```
cdk-stack/
├── stacks/
│   ├── AuthStack.ts           # Cognito setup
│   ├── DatabaseStack.ts       # DynamoDB tables
│   ├── StorageStack.ts        # S3 buckets
│   ├── ApiStack.ts            # API Gateway
│   └── LambdaStack.ts         # Lambda functions
├── lambdas/
│   ├── auth/
│   ├── users/
│   ├── games/
│   ├── published-games/
│   └── analytics/
└── lib/
    ├── constructs/            # Reusable CDK constructs
    └── config/                # Environment config
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

### Phase 3: Game Management (NOT DISCUSSED)
- [ ] Create game with quota validation (5 max, 3/month)
- [ ] Update, delete games
- [ ] Three visibility states: draft, private-link, public
- [ ] Share link generation (UUID slug)
- [ ] Asset upload via API proxy (10MB limit)
- [ ] Game versions (change log tracking)
- [ ] Preview endpoint for drafts

### Phase 4: Discovery & Interaction (NOT DISCUSSED)
- [ ] Public games listing (cursor pagination, newest first)
- [ ] Sort by: date, likes, views, category
- [ ] Share link access
- [ ] Like toggle (increment/decrement)
- [ ] View/play count tracking
- [ ] User's public games page

### Phase 5: AI Features (NOT DISCUSSED, Future)
- [ ] Text generation for game content
- [ ] Color palette suggestions
- [ ] Description enhancement

### Phase 6: Monitoring & Optimization (NOT DISCUSSED)
- [ ] CloudWatch logging
- [ ] Error tracking
- [ ] Cost optimization
- [ ] Performance monitoring

---

## 11. EXAMPLE GAME DATA STRUCTURES

### Quiz/Choice Game ("Choose Me")
```json
{
  "type": "quiz",
  "title": "Which Character Are You?",
  "questions": [
    {
      "id": "q1",
      "text": "Your ideal weekend?",
      "options": [
        {"id": "a", "text": "Reading a book", "weight": {"result1": 2}},
        {"id": "b", "text": "Party with friends", "weight": {"result2": 2}}
      ]
    }
  ],
  "results": [
    {"id": "result1", "title": "The Thinker", "description": "..."},
    {"id": "result2", "title": "The Socialite", "description": "..."}
  ]
}
```

### Crossword Game
```json
{
  "type": "crossword",
  "title": "My Crossword",
  "grid": {
    "rows": 10,
    "cols": 10,
    "cells": [[{"char": "A", "number": 1}, ...]]
  },
  "clues": {
    "across": [{"number": 1, "clue": "Capital of France", "answer": "PARIS"}],
    "down": [{"number": 2, "clue": "...", "answer": "..."}]
  }
}
```

### Emoji Choice Game
```json
{
  "type": "emoji-choice",
  "title": "Pick Your Mood",
  "options": [
    {"emoji": "😊", "result": "You're feeling happy!"},
    {"emoji": "😢", "result": "You're feeling sad!"}
  ]
}
```

**Note:** Player progress stored in browser localStorage (no backend tracking)
```

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

This plan provides a scalable, secure foundation for your web game platform. You can start with Phase 1-2 and expand based on user feedback and adoption.
