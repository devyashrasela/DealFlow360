#!/bin/bash
# Full auth test — all PRD endpoints
BASE="http://localhost:3001/api"
PASS=0
FAIL=0

check() {
  local desc="$1" status="$2" expect="$3"
  if echo "$status" | grep -q "$expect"; then
    echo "  ✅ $desc"
    ((PASS++))
  else
    echo "  ❌ $desc | got: $status"
    ((FAIL++))
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " DealFlow360 Auth PRD Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Health ─────────────────────────────────────────────────────────────────
echo ""
echo "[1] Health check"
R=$(curl -s "$BASE/../" 2>&1)
check "API healthy" "$R" "DealFlow360"

# ── 2. Register ───────────────────────────────────────────────────────────────
echo ""
echo "[2] Register new user"
TS=$(date +%s)
EMAIL="testuser_${TS}@dealflow.test"
R=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test@1234!\",\"full_name\":\"Test User $TS\"}" 2>&1)
check "Register returns 201 user" "$R" '"id"'
USER_ID=$(echo "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

R2=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test@1234!\",\"full_name\":\"Dupe\"}" 2>&1)
check "Duplicate register → 409" "$R2" '"Email already exists"'

R3=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"password":"x"}' 2>&1)
check "Missing fields → 400" "$R3" '"error"'

# ── 3. Login ──────────────────────────────────────────────────────────────────
echo ""
echo "[3] Login"
LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$EMAIL\",\"password\":\"Test@1234!\"}" 2>&1)
check "Login returns access_token" "$LOGIN" '"access_token"'
check "Login returns refresh_token" "$LOGIN" '"refresh_token"'
check "Login returns memberships" "$LOGIN" '"memberships"'

ACCESS_TOKEN=$(echo "$LOGIN" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$LOGIN" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)

BAD_LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$EMAIL\",\"password\":\"WRONG\"}" 2>&1)
check "Wrong password → 401" "$BAD_LOGIN" '"Invalid credentials"'

# ── 4. Refresh token ─────────────────────────────────────────────────────────
echo ""
echo "[4] Refresh token (FR-1.2)"
REFRESH=$(curl -s -X POST "$BASE/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}" 2>&1)
check "Refresh returns new access_token" "$REFRESH" '"access_token"'
check "Refresh returns new refresh_token" "$REFRESH" '"refresh_token"'

NEW_ACCESS=$(echo "$REFRESH" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
NEW_REFRESH=$(echo "$REFRESH" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)

# Old refresh token should now be invalid (rotation)
OLD_REFRESH_USE=$(curl -s -X POST "$BASE/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}" 2>&1)
check "Old refresh token rejected after rotation" "$OLD_REFRESH_USE" '"error"'

INVALID_REFRESH=$(curl -s -X POST "$BASE/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"totally_invalid_token_xyz"}' 2>&1)
check "Invalid refresh token → error" "$INVALID_REFRESH" '"error"'

# ── 5. Profile (with new access token) ───────────────────────────────────────
echo ""
echo "[5] Profile endpoint (dynamic DB check)"
PROFILE=$(curl -s -X GET "$BASE/auth/profile" \
  -H "Authorization: Bearer $NEW_ACCESS" 2>&1)
check "Profile returns user" "$PROFILE" '"email"'

NO_TOKEN=$(curl -s -X GET "$BASE/auth/profile" 2>&1)
check "No token → 401" "$NO_TOKEN" '"error"'

FAKE_JWT="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.badSignature"
BAD_JWT=$(curl -s -X GET "$BASE/auth/profile" \
  -H "Authorization: Bearer $FAKE_JWT" 2>&1)
check "Forged JWT → 401" "$BAD_JWT" '"error"'

# ── 6. Setup organization ─────────────────────────────────────────────────────
echo ""
echo "[6] Setup organization"
SLUG="testprov-${TS}"
ORG_R=$(curl -s -X POST "$BASE/auth/organizations" \
  -H "Authorization: Bearer $NEW_ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"legal_name\":\"Test Provider $TS\",\"slug\":\"$SLUG\",\"organization_type\":\"provider\"}" 2>&1)
check "Create org returns organization" "$ORG_R" '"slug"'
ORG_ID=$(echo "$ORG_R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

DUP_ORG=$(curl -s -X POST "$BASE/auth/organizations" \
  -H "Authorization: Bearer $NEW_ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"legal_name\":\"Test Provider $TS\",\"slug\":\"$SLUG\",\"organization_type\":\"provider\"}" 2>&1)
check "Duplicate slug → 409" "$DUP_ORG" '"error"'

# ── 7. Customer org search (FR-2.1) ───────────────────────────────────────────
echo ""
echo "[7] Customer org search (FR-2.1)"
SEARCH=$(curl -s -X GET "$BASE/auth/customers/search?legal_name=Test" \
  -H "Authorization: Bearer $NEW_ACCESS" 2>&1)
check "Search returns organizations array" "$SEARCH" '"organizations"'

NO_QUERY=$(curl -s -X GET "$BASE/auth/customers/search" \
  -H "Authorization: Bearer $NEW_ACCESS" 2>&1)
check "Search without params → 400" "$NO_QUERY" '"error"'

# ── 8. Create invitation (FR-2.2) ─────────────────────────────────────────────
echo ""
echo "[8] Create invitation (FR-2.2)"
CUST_SLUG="testcust-${TS}"
INVITE_R=$(curl -s -X POST "$BASE/auth/invitations" \
  -H "Authorization: Bearer $NEW_ACCESS" \
  -H "x-organization-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"invitee_${TS}@test.com\",\"role\":\"customer_portal\",\"new_customer_legal_name\":\"Test Customer $TS\",\"new_customer_slug\":\"$CUST_SLUG\"}" 2>&1)
check "Create invitation returns invitation_id" "$INVITE_R" '"invitation_id"'
check "Invite includes raw_token" "$INVITE_R" '"raw_token"'
check "Invite includes expires_at" "$INVITE_R" '"expires_at"'

RAW_INVITE_TOKEN=$(echo "$INVITE_R" | grep -o '"raw_token":"[^"]*"' | cut -d'"' -f4)

# ── 9. Accept invitation (FR-2.2) ─────────────────────────────────────────────
echo ""
echo "[9] Accept invitation (FR-2.2) — new user"
ACCEPT_R=$(curl -s -X POST "$BASE/auth/invitations/accept" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$RAW_INVITE_TOKEN\",\"full_name\":\"Invited Customer $TS\",\"password\":\"Welcome@123!\"}" 2>&1)
check "Accept invitation returns access_token" "$ACCEPT_R" '"access_token"'
check "Accept invitation returns user" "$ACCEPT_R" '"user"'

# Re-use same token → should fail
REUSE_ACCEPT=$(curl -s -X POST "$BASE/auth/invitations/accept" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$RAW_INVITE_TOKEN\",\"password\":\"Welcome@123!\"}" 2>&1)
check "Re-accept used token → error" "$REUSE_ACCEPT" '"error"'

# Bad token
BAD_ACCEPT=$(curl -s -X POST "$BASE/auth/invitations/accept" \
  -H "Content-Type: application/json" \
  -d '{"token":"completelyfaketoken123","password":"x"}' 2>&1)
check "Bad token → error" "$BAD_ACCEPT" '"error"'

# ── 10. Logout + revoke session ───────────────────────────────────────────────
echo ""
echo "[10] Logout (session revocation)"
LOGOUT=$(curl -s -X POST "$BASE/auth/logout" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$NEW_REFRESH\"}" 2>&1)
check "Logout succeeds" "$LOGOUT" '"message"'

POST_LOGOUT_REFRESH=$(curl -s -X POST "$BASE/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$NEW_REFRESH\"}" 2>&1)
check "Revoked token rejected after logout" "$POST_LOGOUT_REFRESH" '"error"'

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " PASS: $PASS  |  FAIL: $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
