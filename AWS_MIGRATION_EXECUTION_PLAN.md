# AWS Migration Execution Plan & Roadmap

This document outlines the detailed execution plan for finalizing the migration from a local PostgreSQL/Prisma stack to a fully managed AWS serverless stack (Cognito, DynamoDB, S3, Amplify).

---

## 1. Analysis of Pending Items

### A. Security Fixes (Hardcoded Admin Bypass)
*   **Files needing modification:** `auth.ts`
*   **Complexity:** Low
*   **Dependencies and Risks:** Removing this will prevent local mock testing for the admin user. Ensure an admin user exists in Cognito before deployment.
*   **AWS Access Required:** No
*   **Local Execution Possible:** Yes

### B. Cloudinary Removal Strategy
*   **Files needing modification:** `package.json`, `next.config.ts` (remove `res.cloudinary.com` hostname), `.env.example`, `PROJECT_SETUP.md`
*   **Complexity:** Low
*   **Dependencies and Risks:** Since `uploadToS3` is already replacing Cloudinary in the API routes, this is strictly a cleanup task.
*   **AWS Access Required:** No
*   **Local Execution Possible:** Yes

### C. Environment Variable Updates
*   **Files needing modification:** `.env.example`
*   **Complexity:** Low
*   **Dependencies and Risks:** Developers must be informed of the new required AWS environment variables (`AWS_REGION`, `COGNITO_CLIENT_ID`, `COGNITO_USER_POOL_ID`, `DYNAMODB_TABLE_NAME`, `S3_BUCKET_NAME`).
*   **AWS Access Required:** No (just updating templates)
*   **Local Execution Possible:** Yes

### D. Cognito Migration Completion
*   **Files needing modification:** `auth.ts`, `app/api/auth/register/route.ts`, `app/api/auth/reset/route.ts`, `app/api/auth/new-password/route.ts`
*   **Complexity:** Medium
*   **Dependencies and Risks:** Existing PostgreSQL users must be migrated to Cognito, or they will lose access. The local DB fallback logic in `auth.ts` must be removed safely.
*   **AWS Access Required:** Yes (to validate user pools and sign-in flow)
*   **Local Execution Possible:** No (unless a local mock/simulator is used)

### E. DynamoDB Migration Completion
*   **Files needing modification:** 
    *   `app/api/profile/route.ts`, `app/api/profile/upload/route.ts`
    *   `app/api/courses/route.ts`
    *   `app/api/enrollments/route.ts`
    *   `app/api/students/route.ts`
    *   `app/api/assignments/route.ts`, `app/api/assignments/submit/route.ts`
    *   `app/api/quizzes/attempt/route.ts`
    *   `app/api/activities/route.ts`
*   **Complexity:** High
*   **Dependencies and Risks:** Requires translating relational SQL concepts (foreign keys, `count()`, `$transaction`) into DynamoDB Single-Table Design patterns (PK, SK, GSIs). High risk of breaking data fetching logic if access patterns are not mapped correctly.
*   **AWS Access Required:** Yes (or DynamoDB Local)
*   **Local Execution Possible:** Only if DynamoDB Local is configured; otherwise, No.

### F. Prisma Removal Strategy
*   **Files needing modification:** `package.json`, `prisma/` directory (delete), `app/lib/prisma.ts` or `lib/prisma.ts` (delete).
*   **Complexity:** Low
*   **Dependencies and Risks:** **Strict Dependency:** Must *only* be executed after Phase E (DynamoDB Migration) is 100% complete and tested.
*   **AWS Access Required:** No
*   **Local Execution Possible:** Yes

### G. Amplify Deployment Preparation
*   **Files needing modification:** `amplify.yml` (create new file)
*   **Complexity:** Medium
*   **Dependencies and Risks:** Requires ensuring that the Next.js SSR and API routes are fully supported by the target AWS Amplify Hosting environment.
*   **AWS Access Required:** Yes (requires pushing to an Amplify-connected repository)
*   **Local Execution Possible:** No

---

## 2. Recommended Execution Order & Roadmap

### Phase 1: Security & Cleanup (Can be completed immediately)
*Focus on removing tech debt, patching security holes, and updating configs without needing AWS credentials.*
1.  Remove the hardcoded admin mock bypass in `auth.ts`.
2.  Remove all Cloudinary traces (`next.config.ts`, `package.json`).
3.  Update `.env.example` with standard AWS variables.
*   **Expected Migration Completion:** 45%

### Phase 2: Authentication Finalization (Requires AWS)
*Focus on establishing the Cognito-only source of truth.*
1.  Remove local DB fallback in `auth.ts`.
2.  Rewrite the `/register`, `/reset`, and `/new-password` API routes to exclusively use the Cognito SDK (`lib/aws/cognito.ts`).
3.  Remove `@auth/prisma-adapter`.
*   **Expected Migration Completion:** 60%

### Phase 3: Database Overhaul (Requires AWS or DynamoDB Local)
*The most complex phase: rewriting the entire data layer.*
1.  Map out Global Secondary Indexes (GSIs) for relationships (e.g., fetching all enrollments for a user).
2.  Rewrite API routes incrementally, starting from standalone entities (Activities) to complex relations (Enrollments, Assignments).
3.  Delete the `prisma` directory, schema, and dependencies.
*   **Expected Migration Completion:** 95%

### Phase 4: CI/CD & Deployment (Requires AWS)
1.  Create `amplify.yml` with proper build settings for Next.js (`npm run build`).
2.  Deploy to AWS Amplify and verify environment variables are injected successfully.
*   **Expected Migration Completion:** 100%

---

## 3. Task Segmentation

### Tasks That Can Be Completed Immediately (Locally)
- [ ] Remove mock `admin@eduflow.com` from `auth.ts`.
- [ ] Remove `cloudinary` from `package.json`.
- [ ] Remove `res.cloudinary.com` from `next.config.ts`.
- [ ] Remove Cloudinary documentation from `PROJECT_SETUP.md`.
- [ ] Add `AWS_REGION`, `COGNITO_CLIENT_ID`, `COGNITO_USER_POOL_ID`, `DYNAMODB_TABLE_NAME`, `S3_BUCKET_NAME` to `.env.example`.

### Tasks Blocked by Missing AWS Access
- [ ] Full removal of Prisma fallback in `auth.ts` (Requires Cognito User Pool to verify logins).
- [ ] Rewrite of `app/api/...` routes to use DynamoDB (Requires DynamoDB table with correct GSIs configured).
- [ ] AWS Amplify configuration (Requires AWS Amplify console access to verify deployment).

---

## 4. Step-by-Step Checklist
- [ ] **Step 1:** Execute Phase 1 (Local Cleanup & Security).
- [ ] **Step 2:** Provision AWS Cognito User Pool & obtain credentials.
- [ ] **Step 3:** Execute Phase 2 (Cognito Finalization) and test sign-up/sign-in flows.
- [ ] **Step 4:** Provision AWS DynamoDB Table (Single-Table Design).
- [ ] **Step 5:** Execute Phase 3 (Database API Rewrite).
- [ ] **Step 6:** Run E2E tests against DynamoDB/Cognito stack.
- [ ] **Step 7:** Uninstall Prisma completely.
- [ ] **Step 8:** Add `amplify.yml` and connect the repository to AWS Amplify.
