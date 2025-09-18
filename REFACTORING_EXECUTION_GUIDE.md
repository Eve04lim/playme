# Playme Refactoring Execution Guide

## Overview
This guide provides step-by-step execution procedures and rollback plans for the comprehensive refactoring of Playme music app to eliminate Dashboard remount/refetch loops and PKCE "state not found" issues.

## Pre-Execution Checklist
- [ ] Backup current codebase: `git stash push -m "Pre-refactoring backup"`
- [ ] Ensure dev server is stopped: `pkill -f vite`
- [ ] Clear Vite cache: `rm -rf node_modules/.vite`
- [ ] Verify current branch: `git branch` (should be on main or feature branch)
- [ ] Check for uncommitted changes: `git status`

## Execution Procedures

### Phase 1: Core Stability Fixes (HIGH PRIORITY)

#### 1.1 Fix DashboardPage useEffect Dependencies
**Files Modified:** `src/pages/DashboardPage.tsx`
**Risk Level:** LOW
**Expected Impact:** Eliminates infinite useEffect loops

```bash
# Test the changes
npm run dev
# Navigate to dashboard after Spotify auth
# Check browser console - should see only 1-2 fetch logs per playlist
# No infinite "🎵 tracks fetched" logs
```

**Success Criteria:**
- Dashboard loads without infinite network requests
- Console shows fetch count stopping at 1-2 per playlist
- No performance degradation after 30 seconds

**Rollback Procedure:**
```bash
git checkout HEAD~1 -- src/pages/DashboardPage.tsx
npm run dev
```

#### 1.2 Fix Header ResizeObserver Loop  
**Files Modified:** `src/components/layout/Header.tsx`
**Risk Level:** LOW
**Expected Impact:** Prevents micro-layout loops

```bash
# Test the changes
npm run dev
# Resize browser window several times
# Check console for ResizeObserver warnings (should be minimal)
```

**Success Criteria:**
- No ResizeObserver loop warnings in console
- Header height updates smoothly on window resize
- No continuous CSS variable updates

**Rollback Procedure:**
```bash
git checkout HEAD~1 -- src/components/layout/Header.tsx
npm run dev
```

#### 1.3 Fix App Router Layout Stability
**Files Modified:** `src/App.tsx`
**Risk Level:** MEDIUM
**Expected Impact:** Prevents route element recreation

```bash
# Test the changes
npm run dev
# Navigate between pages: /login -> auth -> dashboard -> back
# Check React DevTools - should see stable component tree
```

**Success Criteria:**
- Navigation works smoothly without layout remounts
- React DevTools shows stable component keys
- No unexpected component unmount/remount cycles

**Rollback Procedure:**
```bash
git checkout HEAD~1 -- src/App.tsx
npm run dev
```

### Phase 2: PKCE Authentication Fixes (HIGH PRIORITY)

#### 2.1 Fix SpotifyCallback PKCE Integration
**Files Modified:** `src/components/auth/SpotifyCallback.tsx`
**Risk Level:** MEDIUM
**Expected Impact:** Eliminates "PKCE state not found" errors

```bash
# Test the changes
npm run dev
# Complete full Spotify auth flow multiple times
# Check browser localStorage for proper PKCE state management
```

**Success Criteria:**
- Auth flow completes without "PKCE state not found" errors
- LocalStorage shows proper PKCE state creation/clearing sequence
- Callback handles expired/invalid states gracefully

**Rollback Procedure:**
```bash
git checkout HEAD~1 -- src/components/auth/SpotifyCallback.tsx
npm run dev
```

#### 2.2 Enhanced PKCE State Management
**Files Modified:** `src/utils/authHelpers.ts`
**Risk Level:** LOW  
**Expected Impact:** Prevents localStorage conflicts

```bash
# Test the changes
npm run dev
# Check localStorage keys use 'playme_' prefix
# Test TTL expiration behavior
```

**Success Criteria:**
- LocalStorage keys prefixed with 'playme_'
- TTL expiration works correctly (10 minutes)
- No conflicts with other apps' localStorage

**Rollback Procedure:**
```bash
git checkout HEAD~1 -- src/utils/authHelpers.ts
npm run dev
```

### Phase 3: Store Optimizations (MEDIUM PRIORITY)

#### 3.1 Fix Store Same-Value Updates
**Files Modified:** `src/stores/tracksStore.ts`, `src/stores/authStore.ts`
**Risk Level:** LOW
**Expected Impact:** Reduces unnecessary re-renders

```bash
# Run unit tests
npm run test src/stores/__tests__/tracksStore.test.ts
# All tests should pass
npm run dev
# Check React DevTools Profiler for reduced render counts
```

**Success Criteria:**
- Unit tests pass
- Reduced component re-render frequency 
- Same data sets don't trigger store updates

**Rollback Procedure:**
```bash
git checkout HEAD~1 -- src/stores/tracksStore.ts src/stores/authStore.ts
npm run test
```

### Phase 4: Router v7 Future Flags (LOW PRIORITY)

#### 4.1 Implement Future Flags
**Files Modified:** `src/App.tsx`
**Risk Level:** LOW
**Expected Impact:** Eliminates Router v7 warnings

```bash
# Test the changes
npm run dev
# Check console for Router warnings (should be gone)
# Test navigation behavior remains the same
```

**Success Criteria:**
- No React Router v7 future flag warnings
- Navigation behavior unchanged
- No performance impact

**Rollback Procedure:**
```bash
git checkout HEAD~1 -- src/App.tsx
npm run dev
```

## Testing Procedures

### Manual Testing Checklist
1. **Auth Flow Test**
   - [ ] Click Spotify connect button
   - [ ] Complete OAuth flow
   - [ ] Verify redirect to dashboard
   - [ ] Check localStorage for proper PKCE cleanup

2. **Dashboard Performance Test**  
   - [ ] Dashboard loads without infinite loops
   - [ ] Playlist selection triggers single fetch
   - [ ] Page refresh doesn't cause refetch
   - [ ] Switch between playlists works smoothly

3. **Error Handling Test**
   - [ ] Clear localStorage before callback
   - [ ] Verify "PKCE state not found" error displays
   - [ ] Test expired state scenario
   - [ ] Test state mismatch scenario

### Automated Testing

```bash
# Run unit tests
npm run test

# Run E2E tests (requires dev server)
npm run dev &
DEV_SERVER_PID=$!
npm run e2e tests/auth-flow-comprehensive.spec.ts
kill $DEV_SERVER_PID
```

### Performance Verification

```bash
# Start dev server and monitor
npm run dev
# Open Chrome DevTools
# Go to Performance tab
# Record during auth flow + dashboard load
# Verify:
# - No infinite loops in flame chart
# - Network requests are minimal and cached
# - Main thread not blocked by continuous work
```

## Rollback Plans

### Emergency Rollback (All Changes)
```bash
# If major issues occur, revert all changes
git stash push -m "Emergency stash before rollback"
git reset --hard HEAD~8  # Adjust number based on commit count
npm run dev
```

### Selective Rollback
```bash
# Rollback specific components if needed
git checkout HEAD~1 -- src/pages/DashboardPage.tsx
git checkout HEAD~1 -- src/components/auth/SpotifyCallback.tsx
git checkout HEAD~1 -- src/App.tsx
npm run dev
```

### Recovery Verification
After any rollback:
1. Clear browser cache and localStorage
2. Start fresh dev server: `rm -rf node_modules/.vite && npm run dev`
3. Test basic auth flow
4. Verify no console errors

## Risk Assessment & Mitigation

### High Risk Areas
1. **SpotifyCallback.tsx Changes**
   - **Risk:** Could break OAuth flow entirely
   - **Mitigation:** Extensive E2E testing, gradual rollout
   - **Fallback:** Immediate rollback if auth fails

2. **App.tsx Router Changes**
   - **Risk:** Could break navigation
   - **Mitigation:** Test all routes, verify future flags compatibility
   - **Fallback:** Remove future flags, revert to simple route structure

### Medium Risk Areas  
1. **DashboardPage.tsx useEffect Changes**
   - **Risk:** Could break data loading
   - **Mitigation:** Unit tests, manual testing of all data flows
   - **Fallback:** Revert to original dependencies

### Low Risk Areas
1. **Store optimizations**
2. **Header ResizeObserver fix**  
3. **PKCE helper enhancements**

## Success Metrics

### Functional Requirements Met
- ✅ Spotify auth completes without "PKCE state not found" 
- ✅ Dashboard loads without infinite loops
- ✅ Page refresh doesn't trigger refetch
- ✅ Single playlist/track API calls per user action

### Performance Improvements
- ✅ Reduced component re-renders (measurable via React DevTools)
- ✅ Eliminated continuous network requests
- ✅ Faster dashboard load times
- ✅ No ResizeObserver warnings

### Code Quality
- ✅ All unit tests pass
- ✅ All E2E tests pass
- ✅ No TypeScript errors
- ✅ No ESLint warnings
- ✅ Router v7 warnings eliminated

## Post-Deployment Monitoring

### Key Metrics to Watch
1. **Auth Flow Success Rate** - Should be >95%
2. **Dashboard Load Time** - Should improve by 20-30%
3. **API Request Volume** - Should reduce by 50-70%
4. **Client-Side Error Rate** - Should decrease significantly

### Logging Points
```typescript
// Add these temporarily to monitor behavior
console.log('🎵 Dashboard fetch count:', fetchCountRef.current)
console.log('🔐 PKCE state operation:', { operation: 'load/save/clear', timestamp: Date.now() })
console.log('🔄 Store update:', { store: 'tracks/playlist', same: boolean })
```

### Rollback Triggers
- Auth success rate drops below 90%
- Dashboard load time increases
- Increase in client-side errors
- User reports of infinite loading states

## Support Information

### Debugging Commands
```bash
# Check current state
npm run type-check
npm run lint  
npm run test
npm run e2e

# Performance analysis
npm run dev
# Then use Chrome DevTools Performance tab

# Clear all caches
rm -rf node_modules/.vite
npm start --force
```

### Contact & Escalation
- **Primary**: Development team lead
- **Secondary**: DevOps team for production issues
- **Emergency**: Immediate rollback authority