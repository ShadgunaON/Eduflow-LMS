# AWS Migration Readiness Audit Report

## 1. AWS Migration Completion Percentage
Overall estimated completion: **~35%**
- **Storage (S3):** 90%
- **Authentication (Cognito):** 50%
- **Database (DynamoDB):** 10%
- **Deployment (Amplify):** 0%

## 2. Completed Items
- **S3 Integration**: Client and upload utilities (`lib/aws/s3.ts`) are fully implemented. S3 replaces Cloudinary in major API routes (`profile/upload`, `courses/upload`, `assignments/submit`).
- **Cognito Integration**: Client and helper utilities (`lib/aws/cognito.ts`) are implemented. Cognito sign-in is partially integrated into `auth.ts` as the primary authentication attempt.
- **DynamoDB Initialization**: Base client utilities (`lib/aws/dynamo.ts`) are configured for Single-Table Design patterns.
- **Validation**: Build and TypeScript checks pass cleanly. There are no broken imports (`npm run build` executed successfully without errors).

## 3. Pending Items
- **Database**: Replace all Prisma ORM operations with DynamoDB operations across the API layer.
- **Authentication**: Fully transition to Cognito in `auth.ts` by removing local PostgreSQL fallback methods.
- **Deployment**: Create an `amplify.yml` configuration and verify build readiness for AWS Amplify.
- **Environment**: Document missing AWS environment variables in `.env.example`.
- **Cleanup**: Remove deprecated dependencies (Prisma, Cloudinary) from `package.json` and the codebase.

## 4. Critical Blockers
- **Extensive Prisma Reliance**: Over 20+ API routes currently fetch, mutate, and rely heavily on Prisma relations (e.g., `prisma.$transaction`). These must be translated to DynamoDB queries (using GSIs where necessary).
- **Missing AWS Environment Variables**: `.env.example` lacks AWS requirements (`AWS_REGION`, `COGNITO_CLIENT_ID`, `COGNITO_USER_POOL_ID`, `DYNAMODB_TABLE_NAME`, `S3_BUCKET_NAME`), meaning local environments cannot test AWS out-of-the-box.
- **Hardcoded Mock Data**: `auth.ts` currently contains a hardcoded administrator login bypass (`admin@eduflow.com` / `admin123`), which is a major security risk for deployment.

## 5. Files Requiring Changes

### Authentication
- `auth.ts`: Remove Prisma adapter, remove hardcoded admin bypass, remove Prisma local fallback logic.

### Database (API Layer Migration)
The following files (among others) require a complete rewrite to migrate from `prisma` to `docClient`:
- `app/api/profile/route.ts` & `app/api/profile/upload/route.ts`
- `app/api/courses/route.ts`
- `app/api/enrollments/route.ts`
- `app/api/students/route.ts`
- `app/api/assignments/route.ts` & `app/api/assignments/submit/route.ts`
- `app/api/quizzes/attempt/route.ts`
- `app/api/activities/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/reset/route.ts`
- `app/api/auth/new-password/route.ts`

### Configuration & Cleanup
- `package.json`: Uninstall `@prisma/client`, `@auth/prisma-adapter`, `prisma`, `cloudinary`.
- `prisma/`: Delete the entire directory.
- `.env.example`: Remove PostgreSQL & Cloudinary variables; add required AWS variables.

## 6. Risk Assessment
- **High Risk**: The rewrite from a relational database (Postgres) to a NoSQL datastore (DynamoDB) requires careful mapping of access patterns. Complex aggregations currently executed by Prisma (e.g., counting students, course relationships) will need specific DynamoDB Global Secondary Index (GSI) strategies.
- **Medium Risk**: Existing accounts and data in PostgreSQL will need a one-off migration script to safely transfer users to Cognito and data to DynamoDB without data loss.
- **Low Risk**: Storage migration is effectively stable. It only requires a final cleanup of deprecated Cloudinary usage.

## 7. Recommended Next Steps
1. **Security Patch**: Immediately remove the mock administrator bypass in `auth.ts`.
2. **Environment Variable Alignment**: Add the required AWS configuration variables to `.env.example`.
3. **DynamoDB Access Pattern Mapping**: Map out the DynamoDB Single-Table Design schema (PK, SK, GSIs) for Users, Courses, Enrollments, and Assignments before rewriting the APIs.
4. **Iterative API Migration**: Incrementally replace Prisma queries with DynamoDB operations, testing route by route.
5. **Amplify Configuration**: Generate and test `amplify.yml` to prepare the CI/CD pipeline.
