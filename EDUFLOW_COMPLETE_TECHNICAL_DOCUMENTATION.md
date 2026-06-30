# EDUFLOW LMS COMPLETE TECHNICAL DOCUMENTATION

Welcome to the EduFlow LMS team! This document is your ultimate guide to understanding, maintaining, and scaling the EduFlow Learning Management System. It is written specifically for developers joining the team to provide a deep dive into the business logic, architectural decisions, codebase structure, and AWS serverless infrastructure.

Read this document carefully before making changes to the codebase.

---

## SECTION 1 — PROJECT OVERVIEW

### What EduFlow LMS is
EduFlow LMS is a modern, responsive, and highly scalable Learning Management System (LMS) designed for educational institutions to manage courses, enrollments, students, and learning materials.

### Business Purpose
The primary business purpose of EduFlow is to provide a seamless, digital-first learning environment that bridges the gap between administrators, educators (tutors), and students. It replaces legacy, monolithic LMS platforms with a fast, serverless, and mobile-friendly application.

### User Types
The platform currently supports three distinct roles:
1. **ADMIN**: Full access to the platform. Can manage users, courses, settings, and view all global data.
2. **TUTOR**: Educators who can create, edit, and manage their own courses and view enrolled students.
3. **STUDENT**: End-users who consume content. They can enroll in courses, view materials, and update their personal profiles.

### Main Use Cases
* **Course Management**: Creating, updating, and deleting courses with thumbnails.
* **Student Management**: Tracking student progress and enrollment.
* **Authentication**: Secure role-based login and registration.
* **Profile Management**: Users can upload avatars and manage their information.

### Complete Feature List
* Secure authentication via AWS Cognito (Sign up, Log in, Password Reset, Email Verification).
* Role-Based Access Control (RBAC) across both frontend routing and backend API gateways.
* Serverless REST API built with AWS API Gateway and AWS Lambda.
* Single-Table Design Database using Amazon DynamoDB.
* Direct-to-S3 secure file uploads for profile pictures and course thumbnails.
* Modern, responsive UI using Next.js App Router, Tailwind CSS, and Framer Motion.

### Current Project Status
Phase 2 (AWS Migration) is complete. The application has successfully transitioned from a local monolithic stack (NextAuth + Prisma/Postgres + local API routes) to a fully decoupled AWS Serverless architecture (Cognito + DynamoDB + Lambda/SAM + S3 + Amplify).

### High Level Architecture
* **Frontend Hosting**: AWS Amplify (Next.js SSR support).
* **Identity**: AWS Cognito User Pools.
* **API Layer**: AWS API Gateway.
* **Compute**: AWS Lambda (Node.js 20.x).
* **Database**: Amazon DynamoDB (Single Table Design).
* **Storage**: Amazon S3 (Public Read buckets for media).

---

## SECTION 2 — COMPLETE FOLDER STRUCTURE

Here is the complete layout of the EduFlow repository and what each folder is responsible for:

* **`app/`**
  * **Why it exists**: Contains the Next.js 15 App Router frontend application.
  * **Responsibility**: Defines all pages, layouts, API routes for SSR, and global React contexts.
  * **Interaction**: Renders UI, consumes `lib/` for AWS helpers, and talks to the external API Gateway.

* **`app/api/`**
  * **Why it exists**: Next.js server-side API routes.
  * **Responsibility**: Handling direct-to-S3 uploads (e.g., `/api/profile/upload`) and masking AWS SDK interactions from the client browser.
  * **Interaction**: Uses `lib/aws/s3.ts` to push files to S3.

* **`app/components/`**
  * **Why it exists**: Reusable React UI components.
  * **Responsibility**: Sidebar, RoleGuard (for RBAC rendering), interactive UI elements.
  * **Interaction**: Imported by pages in `app/`.

* **`app/context/`**
  * **Why it exists**: Global state management.
  * **Responsibility**: Houses `AuthContext.tsx` which wraps the app and provides the current user session, tokens, and role.
  * **Interaction**: Wraps the `RootLayout` and is consumed by components via `useAuth()`.

* **`backend/`**
  * **Why it exists**: The AWS SAM (Serverless Application Model) backend.
  * **Responsibility**: Houses all Lambda function source code, API Gateway definitions, and the CloudFormation `template.yaml`.
  * **Interaction**: Deployed independently of the frontend to AWS. Called by the frontend via HTTPS REST endpoints.

* **`backend/src/handlers/`**
  * **Why it exists**: Source code for the Lambda functions.
  * **Responsibility**: JavaScript files (e.g., `courses.js`, `students.js`) that process HTTP events, validate JWT claims, and interact with DynamoDB.
  * **Interaction**: Defined in `template.yaml`, executed by Lambda.

* **`lib/`**
  * **Why it exists**: Shared utility functions and configurations.
  * **Responsibility**: Contains `api.ts` (fetch wrapper), `rbac.ts` (role logic), and the `aws/` subfolder.
  * **Interaction**: Used across the frontend application.

* **`lib/aws/`**
  * **Why it exists**: AWS SDK integrations for the Next.js backend/frontend.
  * **Responsibility**: Setup for Cognito (`cognito.ts`), S3 (`s3.ts`), and DynamoDB client configurations.

* **`public/`**
  * **Why it exists**: Static assets.
  * **Responsibility**: SVGs, images, global CSS imports (if any) served directly by Next.js.

* **`scripts/` & `scratch/`**
  * **Why it exists**: Automation and testing.
  * **Responsibility**: Node.js scripts used to test APIs (`test_api.js`), fix databases, or perform localized testing.
  * **Interaction**: Executed manually via the CLI, never shipped to production.

---

## SECTION 3 — FILE BY FILE EXPLANATION

### Next.js Core
* **`app/layout.tsx`**
  * **Purpose**: The root layout for the Next.js app.
  * **Data Flow**: Wraps all pages in `AuthProvider` so global state is available everywhere.
* **`app/page.tsx`**
  * **Purpose**: The landing page of the application (before login).
* **`app/context/AuthContext.tsx`**
  * **Purpose**: Manages user authentication state.
  * **Dependencies**: `@aws-amplify/auth`
  * **Data Flow**: Calls `signIn`, `fetchAuthSession`, extracts the `custom:role` from the JWT ID Token, and exposes `user`, `login`, `logout` to the rest of the app.
* **`lib/api.ts`**
  * **Purpose**: A centralized wrapper around the native `fetch` API.
  * **Why it exists**: Automatically attaches the Cognito JWT Bearer token to all outbound requests to the API Gateway.
* **`app/components/sidebar.tsx`**
  * **Purpose**: The main navigation menu.
  * **Design Decision**: Uses `ROLES` array defined in `lib/rbac.ts` to conditionally render menu items based on the user's role (e.g., Students don't see the "Students" tab).

### Next.js Pages
* **`app/settings/page.tsx`**
  * **Purpose**: Allows users to view and update their profile, including uploading an avatar.
  * **Data Flow**: Submits a `FormData` object to `/api/profile/upload`.
* **`app/courses/page.tsx`**
  * **Purpose**: The main course catalog.
  * **Data Flow**: Fetches courses from the API Gateway using `lib/api.ts`. Allows ADMIN/TUTOR to create/edit/delete courses.

### Next.js Backend Routes (SSR)
* **`app/api/profile/upload/route.ts` & `app/api/courses/upload/route.ts`**
  * **Purpose**: Receives image files from the frontend and uploads them to S3.
  * **Why it exists**: We upload via Next.js SSR to keep AWS S3 credentials hidden from the browser.
  * **Dependencies**: `lib/aws/s3.ts`.

### AWS SAM Backend
* **`backend/template.yaml`**
  * **Purpose**: The Infrastructure-as-Code (IaC) definition for the serverless backend.
  * **Responsibility**: Defines the API Gateway, Lambda functions, IAM roles, and DynamoDB table references.
* **`backend/src/handlers/courses.js`**
  * **Purpose**: The Lambda handler for the `/courses` endpoint.
  * **Data Flow**: Handles GET, POST, PATCH, DELETE. Extracts the JWT from `event.requestContext.authorizer.claims`, verifies RBAC (`TUTOR`, `ADMIN`), and executes DynamoDB `PutItem`/`GetItem`/`UpdateItem`/`DeleteItem`.
* **`backend/src/handlers/students.js`, `assignments.js`, `quizzes.js`, `enrollments.js`**
  * **Purpose**: Respective CRUD Lambda handlers for other entities, utilizing the Single-Table Design.

### Infrastructure Configuration
* **`amplify.yml`**
  * **Purpose**: The build specification for AWS Amplify Hosting.
  * **Design Decision**: Tells Amplify to build the Next.js app and injects local environment variables into a `.env.production` file so the Next.js SSR routes have access to them.
* **`package.json`**
  * **Purpose**: Defines dependencies.
  * **Dependencies**: `aws-amplify` (for frontend Auth), `@aws-sdk/client-s3` (for backend SSR uploads), `framer-motion` (UI animations).

### Helpers
* **`lib/rbac.ts`**
  * **Purpose**: Centralized Role-Based Access Control logic. Exports a `hasRole` function to verify if a user's role exists in an allowed array.
* **`lib/aws/s3.ts`**
  * **Purpose**: Wrapper around `@aws-sdk/client-s3`. Exposes `uploadToS3` using `@aws-sdk/lib-storage` `Upload` utility for multipart uploads.
* **`lib/aws/dynamo.ts`**
  * **Purpose**: Wrapper around `@aws-sdk/client-dynamodb`. (Used in some legacy SSR contexts, but mostly moved to the SAM backend).

---

## SECTION 4 — COMPLETE FRONTEND ARCHITECTURE

EduFlow uses the **Next.js 15 App Router** for its frontend architecture.

* **UI Architecture**: We utilize Tailwind CSS for utility-first styling and `framer-motion` for complex micro-animations (e.g., page transitions, modal pop-ups). Icons are provided by `lucide-react`.
* **State Management**: React Context (`AuthContext.tsx`) handles global auth state. Local component state (`useState`) handles forms and UI toggles. We intentionally avoided Redux to keep the architecture lightweight.
* **Authentication Flow**: Uses AWS Amplify Gen 1 SDK (`aws-amplify/auth`). When a user logs in, Amplify manages the tokens in localStorage/cookies automatically.
* **Role-Based Rendering**: A custom `<RoleGuard>` component is used to wrap UI elements. If the user's role (fetched from AuthContext) does not match the allowed roles, the component renders `null` or an unauthorized message.
* **API Communication**: The `lib/api.ts` file intercepts all fetches, automatically grabbing the ID Token via `fetchAuthSession()` and appending it as a `Bearer` token in the `Authorization` header.
* **Image Uploads**: Because pushing directly to S3 from the browser requires exposing the S3 bucket or generating presigned URLs manually, we opted for an SSR middleman. The browser POSTs `FormData` to Next.js API Routes, which then uses the AWS SDK to push to S3.

---

## SECTION 5 — COMPLETE BACKEND ARCHITECTURE

The backend is built using **AWS SAM (Serverless Application Model)**.

* **API Gateway**: Acts as the front door. It uses a Cognito Authorizer to validate JWTs automatically before requests ever hit the Lambda functions.
* **Lambda Functions**: Written in vanilla Node.js. Each logical domain (Courses, Students, Enrollments) has a single Lambda function handling all HTTP methods (GET, POST, PATCH, DELETE) via switch statements on `event.httpMethod`.
* **Authorization**: The API Gateway passes the decoded JWT claims into the Lambda event via `event.requestContext.authorizer.claims`. The Lambda uses `hasRole()` to ensure the caller has the required business role.
* **Upload Flow**: Course thumbnails and Profile images are uploaded via the Next.js SSR API directly to S3, bypassing the SAM API Gateway.
* **CRUD Flow**: Lambda functions map HTTP verbs to DynamoDB operations:
  * POST -> `PutCommand`
  * GET -> `QueryCommand` or `ScanCommand`
  * PATCH -> `UpdateCommand`
  * DELETE -> `DeleteCommand`

---

## SECTION 6 — COMPLETE AWS ARCHITECTURE

We utilize a fully decoupled AWS Serverless architecture:

1. **AWS Amplify Hosting (Next.js SSR)**
   * *Why selected*: Easiest way to deploy a Next.js App Router application with CI/CD hooked directly to GitHub.
2. **Amazon Cognito (User Pools)**
   * *Why selected*: Replaced NextAuth. Provides highly secure, scalable identity management out of the box, with built-in JWT generation, forgot password flows, and email verification.
3. **AWS API Gateway (REST)**
   * *Why selected*: To expose our backend logic securely. Integrated natively with Cognito Authorizers to prevent unauthorized traffic from invoking Lambdas.
4. **AWS Lambda**
   * *Why selected*: Zero-maintenance compute. We only pay when the API is invoked.
5. **Amazon DynamoDB**
   * *Why selected*: Replaced PostgreSQL/Prisma. Provides single-digit millisecond latency at any scale. We use a Single-Table Design to store all entities in one table.
6. **Amazon S3**
   * *Why selected*: Storing static binary assets (images). We use two buckets: one for profile pictures and one for course thumbnails.
7. **AWS SAM & CloudFormation**
   * *Why selected*: Infrastructure as Code (IaC). Allows us to version-control our backend infrastructure and deploy it consistently using `sam deploy`.
8. **IAM & Execution Roles**
   * *Why selected*: Security. Every Lambda has a strict execution role allowing it to *only* talk to the specific DynamoDB table it needs. The Next.js SSR runs under an Amplify SSR execution role.

---

## SECTION 7 — AUTHENTICATION FLOW

### The Complete Login Lifecycle
1. **User Input**: The user enters their email and password on `/login`.
2. **SDK Invocation**: `AuthContext` calls `signIn({ username, password })` from `@aws-amplify/auth`.
3. **Cognito Handshake**: The Amplify SDK securely communicates with AWS Cognito using the SRP (Secure Remote Password) protocol.
4. **Token Generation**: Cognito authenticates the user and returns three JWTs:
   * **ID Token**: Contains user profile data (email, name, and `custom:role`).
   * **Access Token**: Contains OAuth scopes.
   * **Refresh Token**: Used to get new tokens when they expire.
5. **Role Extraction**: `AuthContext` calls `fetchAuthSession()` to parse the ID Token, extracting `custom:role` (e.g., `ADMIN`, `TUTOR`).
6. **State Update**: The React context updates `user` state, re-rendering the app.
7. **Routing**: The user is pushed to `/dashboard`.
8. **Protected APIs**: When the frontend requests data, `lib/api.ts` gets the ID Token and attaches it to the `Authorization` header. The API Gateway validates the signature, and passes the claims to Lambda for RBAC verification.

---

## SECTION 8 — DATA FLOW

### API Gateway Data Flow
```text
User 
  → [Browser (Next.js UI)] 
    → Fetch GET /courses (Header: Bearer JWT)
      → [API Gateway] (Validates JWT via Cognito Authorizer)
        → [Lambda GetCoursesFunction] (Parses event.httpMethod)
          → Role Check (hasRole)
            → [DynamoDB] (QueryCommand)
          ← Returns JSON Array
      ← [API Gateway] 200 OK
  ← [Browser] Updates UI State
```

### Next.js SSR Upload Data Flow
```text
User 
  → [Browser] Selects Image
    → POST FormData to /api/profile/upload (Next.js API Route)
      → [Next.js Node Server (Amplify)]
        → Buffer image
        → [@aws-sdk/client-s3 Upload] 
          → [S3 Bucket]
      ← Next.js receives S3 URL
      → [Next.js Node Server] Updates DynamoDB user record with new image URL
  ← Returns updated user object to Browser
```

---

## SECTION 9 — DATABASE DESIGN

EduFlow uses **DynamoDB Single-Table Design**. All entities (users, courses, enrollments) live in a single table, `EduFlow-LMS-Data-USE1`.

### Schema Patterns
* **Partition Key (PK)**: String (e.g., `USER#admin@eduflow.com`, `COURSE#uuid`)
* **Sort Key (SK)**: String (e.g., `PROFILE`, `METADATA`, `ENROLLMENT#date`)

### Entity Examples
**User Record (Profile)**
* PK: `USER#admin@eduflow.com`
* SK: `PROFILE`
* Attributes: `email`, `name`, `role`, `image`

**Course Record**
* PK: `COURSE#9c8b8724-4e8d-4956-b802-fba0a3abae6e`
* SK: `METADATA`
* Attributes: `title`, `description`, `category`, `price`, `thumbnail`, `instructorId`

**Student Enrollment**
* PK: `USER#student@gmail.com`
* SK: `ENROLL#COURSE#9c8b...`
* Attributes: `enrolledAt`, `progress`

**Activity Log**
* PK: `ACTIVITY`
* SK: `DATE#2026-06-25T10:00:00Z`
* Attributes: `type`, `message`, `icon`

---

## SECTION 10 — COMPLETE API DOCUMENTATION

*Base URL: `https://lsbvzcesa2.execute-api.us-east-1.amazonaws.com/Prod`*

| Endpoint | Method | Authentication | RBAC Allowed | Purpose | Request Body | Response |
|----------|--------|----------------|--------------|---------|--------------|----------|
| `/courses` | GET | Cognito JWT | ADMIN, TUTOR, STUDENT | List all courses | None | `[{ id, title, price... }]` |
| `/courses` | POST | Cognito JWT | ADMIN, TUTOR | Create a course | `{ title, description, category, price }` | `201 { id, title... }` |
| `/courses/{id}` | PATCH | Cognito JWT | ADMIN, TUTOR | Edit a course | `{ title? }` | `200 { updated attributes }` |
| `/courses/{id}` | DELETE| Cognito JWT | ADMIN, TUTOR | Delete course | None | `200 { message: "deleted" }` |
| `/students` | GET | Cognito JWT | ADMIN, TUTOR | List students | None | `[{ email, name, status }]` |
| `/quizzes` | POST | Cognito JWT | ADMIN, TUTOR | Create quiz | `{ courseId, title, questions }` | `201 { quiz object }` |

*Note: All backend endpoints return `401 Unauthorized` if the JWT is missing/invalid, and `403 Forbidden` if the role is not in the allowed list.*

---

## SECTION 11 — ROLE BASED ACCESS

RBAC is strictly enforced in two places: Frontend Rendering and Backend Lambdas.

### The Roles
* **ADMIN**: The superuser. Has access to all menus, can create/edit/delete any course, manage any user, and view global dashboards.
* **TUTOR**: The educator. Can access `/courses`, `/students`, `/assignments`. They can Create, Update, and Delete courses. They cannot access system settings or manipulate admin accounts.
* **STUDENT**: The consumer. Can access `/dashboard` and `/courses` (Read-Only). They cannot create courses, and attempting to POST to `/courses` will result in a hard `403 Forbidden` from the Lambda.

### The Code (`lib/rbac.ts`)
```typescript
export const ROLES = {
  ADMIN: "ADMIN",
  TUTOR: "TUTOR",
  STUDENT: "STUDENT",
};

export const hasRole = (userRole: string, allowedRoles: string[]) => {
  return allowedRoles.includes(userRole.toUpperCase());
};
```

---

## SECTION 12 — DESIGN DECISIONS

* **Why we migrated NextAuth → Cognito**: NextAuth required maintaining an active PostgreSQL connection for session management, which is an anti-pattern in serverless environments due to connection pooling exhaustion. Cognito provides managed identity without database overhead.
* **Why we migrated Prisma → DynamoDB**: Prisma requires a heavy query engine and relational joins, which suffer from cold starts in Lambda. DynamoDB HTTP APIs are incredibly fast, scale infinitely, and don't suffer from connection limits.
* **Why we migrated Node backend → Lambda**: A traditional Express backend requires EC2 or ECS, meaning paying for idle time and managing scaling. AWS SAM + Lambda means zero maintenance and infinite concurrency.
* **Why S3 uploads go through Next.js SSR**: Giving the browser direct IAM credentials to push to S3 is dangerous. Generating pre-signed URLs requires extra Lambda overhead. Pushing through the Next.js SSR API route keeps credentials safe on the server and simplifies the frontend logic.

---

## SECTION 13 — LESSONS LEARNED

During the massive AWS migration, we encountered and solved several critical engineering challenges:

1. **Amplify Stale Builds & Cache**: 
   * *Issue*: Changes pushed to GitHub were not reflecting in the deployed Amplify app. 
   * *Fix*: We realized Next.js aggressively caches builds. We updated `amplify.yml` to clear `.next/cache` before builds and implemented proper environment variable injection.
2. **RBAC Mismatch (TUTOR vs INSTRUCTOR)**: 
   * *Issue*: Tutors couldn't create courses, receiving 403 Forbidden.
   * *Fix*: The frontend was assigning `custom:role = TUTOR`, but the SAM backend was checking for `INSTRUCTOR`. We wrote a script to standardize the entire codebase to `TUTOR`.
3. **CORS on API Gateway**:
   * *Issue*: Browsers blocked requests to the API Gateway due to missing CORS headers on 4xx/5xx responses.
   * *Fix*: We updated `template.yaml` to include global `Cors` definitions, and ensured every Lambda `catch` block returns `Access-Control-Allow-Origin: "*"`.
4. **S3 Permissions Error Masking**:
   * *Issue*: Profile uploads failed with a generic "Failed to upload file".
   * *Fix*: We discovered `lib/aws/s3.ts` was masking the error. By unmasking it, we found `Could not load credentials from any providers`, revealing that the Amplify SSR runtime lacked IAM S3 access by default. We resolved this via IAM/Environment variables.
5. **Cognito JWT Parsing**:
   * *Issue*: Extracting roles from the token was failing.
   * *Fix*: We learned that `@aws-amplify/auth` Gen 1 requires calling `fetchAuthSession()` to manually grab the ID Token, rather than relying on `getCurrentUser()`.

---

## SECTION 14 — INTERVIEW PREPARATION

If you are interviewing for an internship or junior role on this team, be prepared to answer these questions based on this architecture:

**Q: Explain how Authentication works in this application.**
*Answer*: We use AWS Cognito. The user logs in via Amplify, which retrieves an ID Token, Access Token, and Refresh Token. The ID Token contains the user's `custom:role`. When the frontend makes an API call, it attaches the ID token to the Authorization header. API Gateway validates the signature of the token automatically before forwarding the request to Lambda, where we extract the role and perform RBAC checks.

**Q: What is a Single-Table Design in DynamoDB? Why use it?**
*Answer*: Single-Table Design stores all entities (Users, Courses, Activity) in one table rather than creating a table for each. We differentiate them using Partition Keys (PK) and Sort Keys (SK) like `USER#admin` and `PROFILE`. We use it because DynamoDB does not support JOINs. By structuring keys smartly, we can fetch a user and all their enrolled courses in a single query, providing extreme performance at scale.

**Q: Why didn't you use Prisma and PostgreSQL?**
*Answer*: In a highly concurrent serverless environment (Lambda), every function invocation would open a new database connection. This rapidly exhausts PostgreSQL connection limits, causing the app to crash. DynamoDB operates over HTTP, eliminating connection pool limits entirely.

---

## SECTION 15 — FUTURE IMPROVEMENTS

For future developers maintaining EduFlow, here are areas prioritized for production scaling:

1. **CloudFront CDN for Images**: Currently, images are served directly from the S3 bucket URL. Putting a CloudFront distribution in front of S3 will cache images globally, reducing latency and lowering S3 egress costs.
2. **AppSync Integration**: While the GraphQL schema and AppSync resources exist in `template.yaml`, the frontend currently uses the REST API Gateway. Migrating the frontend to consume AppSync will allow real-time subscriptions (e.g., chat, live course updates).
3. **Presigned S3 URLs**: Currently, uploads go through Next.js SSR. To reduce bandwidth on the Next.js server, we should migrate to a pre-signed URL flow, where the browser asks Lambda for a signature, and then uploads directly to S3.
4. **Pagination**: As the platform grows, `/courses` and `/students` will return too much data. We need to implement DynamoDB `LastEvaluatedKey` logic in the backend and infinite scrolling in the UI.

---
*End of Documentation*
