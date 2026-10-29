# Security remediation and rollout

Based on main commit `6cc3b9ee9d80a093494e46030d6cbb7fd5e690ed`.

## Behavior changes

- `/api/code/run` returns 503 for every request. Both Python subprocess and JavaScript VM execution have been removed. The editor displays the unavailable message. Restore execution only through a separately isolated, disposable worker without app credentials, network access, or app filesystem access, with CPU/memory/process/output limits.
- Multi-session refresh and attendance accept only the authenticated account. The UI sends each saved account's own access token in separate requests. Missing or expired tokens require signing in to that account again. A browser account list is not server authorization.
- Attendance ignores client-supplied portal session IDs and uses the authenticated account's encrypted stored session. An expired upstream session forces a fresh login before one retry. Both attendance URLs share this implementation.
- Login always verifies supplied credentials with the university; a cached session or university outage cannot authenticate a new login. Already authenticated session refresh may reuse its own cached session.
- MongoDB is required for authentication, session creation, revocation, and rate limiting. Failures cannot return successful authentication or successful logout. DB verification failures return 503 without a logout directive.
- New JWTs and persisted sessions expire after seven days. **Existing sessions without an expiry are intentionally invalidated at rollout; users must sign in again.**
- Rate counters use MongoDB's unique `_id` and an atomic window reset/increment, shared across app instances. Store errors deny requests.
- `.env.example` contains empty secret fields. Supply independently generated deployment secrets; CI dummy values must never be used in production.
- `npm test` executes real TypeScript handlers with mocked database/network adapters. CI enforces these tests and blocks on high/critical dependency audit findings.

## Deployment checks requiring operator access

1. Review production access logs for unexpected code execution, cross-account refresh/attendance calls, and suspicious successful logins. Static fixes do not establish whether compromise occurred.
2. Check whether historical example ACCESS_SECRET or DB_ENCRYPTION_KEY values were ever deployed. Rotate an exposed access secret and invalidate sessions. For the data encryption key, first prepare a backed-up, verified decrypt/re-encrypt migration; changing the key alone makes stored data unreadable. No live keys or data have been changed by this patch.
3. Protect main with a GitHub ruleset requiring the CI check `Build & Security Verification`, pull requests, and restricted force pushes/deletion. This is repository administration, not a workflow-file setting.
4. Run a staging smoke test with a dedicated university account: login, own-account session renewal, attendance response handling, logout/revocation, and two independently signed-in accounts. Do not submit real attendance without the account owner's authorization.
5. Validate MongoDB concurrency and recovery with multiple app instances. The regression suite mocks MongoDB; it does not prove deployment behavior.

## Remaining audit verification work

Account deletion across forums/OAuth/notifications, provider-side token revocation, cron deduplication/delivery, and multi-instance portal-renewal coordination require explicit retention/delivery policies and runtime integration checks. These are not claimed as resolved by this security patch. No live deployment, production logs, secrets, or university actions were accessed.
