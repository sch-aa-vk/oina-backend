# Agent Prompt: OINA Backend Phase 3 (Variant 1)

You are implementing Phase 3 Game Management for oina-backend.

## Goal
Implement Phase 3.1 of the game service (game CRUD + text rewards schema + scoring flag) using AWS API Gateway + Lambda + DynamoDB from the plan, without changing existing auth behavior.

Phase 3.2 (media reward upload + anonymous presigned URL access) is a separate follow-up and is NOT in scope for this prompt.

Primary source of truth:
- BACKEND_PLAN.md, section Phase 3: Game Management (APPROVED - VARIANT 1)
- Phase 3.1 checklist
- Execution Order for Agent
- Definition of Done (Phase 3.1)

## Repository
- Project: oina-backend
- Language: TypeScript
- Infra: AWS CDK
- Existing scope already live: auth endpoints and docs endpoints

## Hard Requirements
1. Do not break existing /auth/* endpoints.
2. Keep API response envelope format:
   - success: { statusCode, message, timestamp, data }
   - error: { statusCode, error, message, details }
3. Implement owner-based access control for all creator game endpoints.
4. Enforce create quotas atomically:
   - max total games per user: 5
   - max games per month: 3
5. Use DynamoDB transaction for create flow to prevent partial writes.
6. Add/update tests for critical logic and handler paths.
7. Update OpenAPI docs with Games schemas and endpoints.

## Scope to Implement
### Infrastructure (CDK)
- Add Games table with required GSIs.
- Add GameVersions table with required GSI.
- Add Lambda handlers and API routes:
  - POST /games
  - GET /games
  - GET /games/{gameId}
  - PUT /games/{gameId}
  - DELETE /games/{gameId}
  - POST /games/{gameId}/publish
  - POST /games/{gameId}/unpublish
  - GET /games/{gameId}/preview
  - GET /games/{gameId}/versions
- Add env vars:
  - DYNAMODB_GAMES_TABLE
  - DYNAMODB_GAME_VERSIONS_TABLE
- Grant IAM permissions for game tables.
- S3 bucket: do NOT implement reward media endpoints here (Phase 3.2). Only ensure game delete logic has a stub/comment for future reward media cleanup.

### Domain and Application
- Add game types and DTOs in src/types/game.types.ts.
  - Include `Reward` type (`text` | `image` | `video` | `audio`) and `ScoringConfig` from the start so the schema does not need breaking changes in 3.2.
  - Phase 3.1 only stores and validates text rewards; media reward `assetKey` is stored as-is if provided but upload is not handled yet.
- Add validators in src/utils/game-validators.ts.
- Add service methods in src/services/games.service.ts:
  - createGame
  - listUserGames
  - getUserGame
  - updateGame
  - deleteGame
  - publishGame
  - unpublishGame
  - listGameVersions
- Add handlers in src/handlers/games/ for all game routes.
- Reuse existing auth middleware to get userId.

### Business Rules
- Visibility states: draft, private-link, public.
- Valid transitions:
  - draft -> private-link/public
  - private-link <-> public
  - private-link/public -> draft
- On first publish:
  - set publishedAt if empty
  - create shareLink if empty
- Preview endpoint owner-only and draft-only.
- Versioning:
  - version 1 at create
  - increment on update/publish/unpublish
  - GameVersions stores metadata snapshots
  - latest full content remains in Games table

### Create Contract
Implement POST /games request contract from BACKEND_PLAN.md Phase 3.1.
Validation:
- title required, 1..120
- description max 1000
- type enum: choose-me | guess-by-emoji | crossword
- tags max 10, each 1..30
- content required, max serialized size 100KB
- content.scoring optional: { enabled: boolean, maxScore?: number }
- content.rewards optional array, max 5 items per game
  - each reward: id, pointsThreshold (0..100000), label (1..80), type (text | image | video | audio)
  - text reward: text field required, max 2000 chars
  - media reward: assetKey is backend-managed; reject if client sends assetKey directly for now

Error codes:
- QUOTA_TOTAL_GAMES_EXCEEDED
- QUOTA_MONTHLY_GAMES_EXCEEDED
- INVALID_GAME_PAYLOAD
- CONTENT_TOO_LARGE
- UNAUTHORIZED
- INVALID_REWARD_PAYLOAD

## Execution Sequence (must follow)
1. CDK tables + env vars + IAM.
2. types (including Reward and ScoringConfig) + validators + services.
3. POST /games first with full transaction, quota logic, and text reward + scoring validation.
4. GET list and GET by id.
5. PUT update + version increment.
6. publish/unpublish + share link behavior.
7. delete + counter consistency (add TODO comment for S3 reward media cleanup, Phase 3.2).
8. versions + preview endpoints.
9. OpenAPI update.
10. Tests + build + final verification.

## Testing Requirements
- Unit tests:
  - quota pass/fail
  - month rollover
  - ownership checks
  - visibility transitions
  - version incrementing
  - text reward validation (max 5, text field required, pointsThreshold range)
  - media reward type stored without assetKey rejection
- Integration tests:
  - happy paths and critical failures for handlers
- Include at least one test for DynamoDB transaction conflict/retry behavior.

## Deliverables
1. Working code changes in backend for Phase 3 Variant 1.
2. Updated OpenAPI docs with Games endpoints.
3. Test suite updates passing locally.
4. Short implementation report with:
   - files changed
   - key design choices
   - known limitations
   - follow-up tasks

## Final Quality Gate
Before finishing, verify:
- Existing auth endpoints unchanged and still working.
- Build passes.
- Tests pass.
- Definition of Done (Phase 3.1) in BACKEND_PLAN.md is satisfied.
- content.rewards and content.scoring fields accepted and correctly stored for text rewards.
- Media reward types (image/video/audio) are part of the type system but media upload is not implemented here (Phase 3.2).
