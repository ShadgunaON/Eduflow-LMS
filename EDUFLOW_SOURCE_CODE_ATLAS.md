# EDUFLOW LMS SOURCE CODE ATLAS
**Type**: True Reverse Engineering Report
**Source of Truth**: `C:\Users\YHShadgunaSiddhi\Desktop\New folder (2)\eduflow-lms`

---

## SECTION 1: COMPLETE REPOSITORY TREE

### `/.git` & `/.next`
* **Purpose**: Local Git version control and Next.js compiled build cache.
* **Belongs to**: Infrastructure.

### `/app`
* **Purpose**: Next.js App Router root directory. Contains the React component tree and file-system based routing.
* **Belongs to**: Frontend.
* **Dependencies**: `lucide-react`, `framer-motion`, `@aws-amplify/auth`, `/lib`, `/components`.
* **Important Folders inside**:
  * `/api`: Contains Next.js Route Handlers (`/profile/upload/route.ts` and `/courses/upload/route.ts`).
  * `/assignments`: Contains `page.tsx` (Assignment catalog).
  * `/auth` & `/login`: Authentication screens.
  * `/components`: Reusable UI components (`CourseCard.tsx`, `RoleGuard.tsx`, `sidebar.tsx`).
  * `/context`: Global state providers (`AppContext.tsx`, `AuthContext.tsx`).
  * `/courses`: Course catalog and management.
  * `/dashboard`: Role-specific landing page.
  * `/profile` & `/settings`: User profile management.
  * `/quizzes` & `/students`: Tutors/Admin management pages.

### `/backend`
* **Purpose**: AWS Serverless Application Model (SAM) root directory.
* **Belongs to**: Backend / AWS Infrastructure.
* **Dependencies**: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `uuid`.
* **Important Folders inside**:
  * `/src/handlers`: Contains exactly 7 JS files (`activities.js`, `assignments.js`, `courses.js`, `enrollments.js`, `profile.js`, `quizzes.js`, `students.js`). These are the actual Lambda function sources.
  * `/src/handlers/lib`: Contains `dynamo.js`, `rbac.js`, `response.js` (backend-specific utilities).

### `/lib`
* **Purpose**: Shared utilities for the frontend React application.
* **Belongs to**: Frontend (Shared).
* **Important Folders inside**:
  * `/aws`: Contains `cognito.ts`, `dynamo.ts`, `s3.ts`, and `mockDb.ts`. (Note: `mockDb.ts` is explicitly used for local simulation).
  * `api.ts`: Fetch wrapper.
  * `rbac.ts`: Centralized Role strings and validation function.
  * `utils.ts`: Tailwind `clsx` and `twMerge` wrapper.

### `/public`
* **Purpose**: Static Next.js assets. Contains `favicon.ico`, `grid.svg`, `file.svg`, `globe.svg`, `window.svg`.
* **Belongs to**: Frontend.

### `/scripts` & `/scratch`
* **Purpose**: Local developer scripts and temp files. Contains `check-db.js`, `test-register.js`, `force-verify.js`, etc.
* **Belongs to**: Scripts.

### Root Configuration Files
* `template.yaml`: AWS SAM CloudFormation blueprint.
* `amplify.yml`: AWS Amplify CI/CD build specification.
* `package.json` & `package-lock.json`: NPM dependencies.
* `tailwind.config.ts`, `postcss.config.mjs`: CSS processing.
* `tsconfig.json`, `next.config.mjs`: Compiler options.
* `.env.local`, `.env.example`: Environment variable templates.
* `policy.json`: IAM policy snippet for S3 uploads.

---

## SECTION 2: IMPORTANT FILE ANALYSIS

### 1. `app/context/AuthContext.tsx`
* **Purpose**: React Context for Authentication.
* **Imports**: `createContext`, `useContext`, `useState`, `useEffect` (React); `signIn`, `signOut`, `signUp`, `confirmSignUp`, `resetPassword`, `confirmResetPassword`, `fetchAuthSession` (Amplify).
* **Exports**: `AuthProvider`, `useAuth`.
* **Types**: `User { name: string; email: string; role: string; image?: string }`.
* **React Hooks**: Uses `useEffect` to trigger `fetchAuthSession` on mount.
* **AWS Services**: Cognito User Pools (via Amplify).
* **Execution Lifecycle**: Mounts -> fetchAuthSession -> decodes ID token -> sets user state.
* **Consumers**: Wraps `app/layout.tsx`. Consumed by `api.ts`, `RoleGuard.tsx`, `sidebar.tsx`.
* **Technical Debt**: Exposes a `login` method that wraps `signIn` but does not enforce email verification checks upfront.

### 2. `lib/api.ts`
* **Purpose**: Intercepts HTTP requests to inject the JWT.
* **Imports**: `fetchAuthSession` from Amplify.
* **Functions**: `api.get`, `api.post`, `api.patch`, `api.delete`.
* **AWS Services**: API Gateway.
* **Execution Lifecycle**: Called by UI component -> fetches local token -> appends `Bearer` -> calls `fetch`.
* **Common Mistakes**: If `fetchAuthSession` fails, it throws a runtime error in the browser console instead of redirecting to `/login`.

### 3. `lib/rbac.ts`
* **Purpose**: Centralized RBAC definitions.
* **Exports**: `ROLES = { ADMIN: "ADMIN", TUTOR: "TUTOR", STUDENT: "STUDENT" }`. `hasRole(userRole, allowedRoles)`.
* **Consumers**: `sidebar.tsx`, `RoleGuard.tsx`, all `page.tsx` components.

### 4. `backend/src/handlers/courses.js`
* **Purpose**: REST API controller for `/courses`.
* **Imports**: `dynamoDb` (from `lib/dynamo.js`), `hasRole` (from `lib/rbac.js`), `createResponse`, `createError` (from `lib/response.js`), `uuidv4`.
* **AWS Services**: Lambda, DynamoDB.
* **Database Usage**: 
  * GET: `ScanCommand` filtering for `SK = METADATA`.
  * POST: `PutCommand` with `PK = COURSE#<uuid>`.
  * PATCH: `UpdateCommand`.
  * DELETE: `DeleteCommand`.
* **Execution Lifecycle**: API Gateway triggers `handler(event)` -> Extracts `claims['custom:role']` -> Checks RBAC -> Queries DynamoDB -> Returns HTTP object.

### 5. `backend/template.yaml`
* **Purpose**: Infrastructure as Code.
* **Responsibilities**: Defines the `EduFlowApi` (ApiGateway), `EduFlowCognitoAuthorizer`, `CoursesFunction`, `StudentsFunction`, `AssignmentsFunction`, `QuizzesFunction`, `ActivitiesFunction`, `EnrollmentsFunction`, `ProfileFunction`.
* **Dependencies**: AWS CloudFormation.

### 6. `lib/aws/cognito.ts`, `lib/aws/dynamo.ts`, `lib/aws/s3.ts`
* **Purpose**: Wrappers for AWS SDK v3.
* **Technical Debt Found**: Both `cognito.ts` and `dynamo.ts` explicitly import `mockDb.ts` and check `const IS_MOCK_MODE = !CLIENT_ID || !USER_POOL_ID;`. If environment variables are missing, they fall back to reading `.mock-db.json` from the local disk. `s3.ts` has `const IS_MOCK_MODE = false;` explicitly hardcoded to prevent crashes in Vercel/Amplify.

---

## SECTION 3: EXPORTED FUNCTIONS

### `hasRole(userRole, allowedRoles)`
* **Purpose**: Determines if a user has permission.
* **Parameters**: `userRole` (string), `allowedRoles` (Array of strings).
* **Return Value**: `boolean`.
* **Internal Logic**: Converts `userRole` to uppercase and checks if it exists in the `allowedRoles` array. Returns `true` if matched, `false` otherwise.
* **Who calls it**: Frontend `RoleGuard.tsx`, Backend Lambda handlers (`courses.js`, `students.js`).

### `uploadToS3(fileBuffer, fileName, contentType, bucketName)`
* **Purpose**: Streams a file buffer to S3 via multipart upload.
* **Parameters**: `fileBuffer` (Buffer), `fileName` (string), `contentType` (string), `bucketName` (string).
* **Return Value**: `Promise<string>` (The public S3 URL).
* **Internal Logic**: Instantiates `@aws-sdk/lib-storage` `Upload`. Awaits `.done()`. Constructs `https://${bucketName}.s3.amazonaws.com/${fileName}`.
* **Who calls it**: `/api/profile/upload/route.ts`.

---

## SECTION 4: REACT EXECUTION FLOW

### Flow: Dashboard Render
* **User Action**: Navigates to `/dashboard`.
* **Component**: `app/dashboard/page.tsx` mounts.
* **Hook**: Calls `const { user, loading } = useAuth()`.
* **Context**: `AuthContext` determines `user.role` (e.g., `STUDENT`).
* **UI Update**: The page renders `Welcome back, {user.name}`. It mounts `<RevenueTrendChart />` (if Admin) or recent courses (if Student).
* **Technical Debt Found**: `app/components/RevenueTrendChart.tsx` line 12 explicitly states `// Mock data: normally you'd compute this from actual enrollments over time`. The chart renders hardcoded math arrays.

### Flow: Course Upload (Thumbnail)
* **User Action**: Clicks "Upload Image" in the Course Edit Modal.
* **Component**: `CourseModal.tsx` calls `handleUpload()`.
* **API**: `fetch("/api/courses/upload")` with `FormData`.
* **Backend (Next.js SSR)**: `app/api/courses/upload/route.ts` parses the `jwt` from the Auth header.
* **AWS SDK**: Calls `uploadToS3(buffer, "eduflow-courses")`.
* **Database**: (Actually, the UI receives the S3 URL, and *then* the UI calls `api.patch("/courses/{id}", { thumbnail: url })` to update DynamoDB via Lambda.
* **UI Update**: The modal thumbnail preview updates.
## SECTION 5: BACKEND LAMBDA ANALYSIS

*Based on `backend/src/handlers/`*

### 1. `courses.js`
* **HTTP Methods**: GET, POST, PATCH, DELETE.
* **RBAC**: GET (Open to all roles). POST/PATCH/DELETE (ADMIN or TUTOR).
* **Validation**: Extracts `id` from `pathParameters`. Parses stringified `body`. Throws `500` if `body` is malformed JSON.
* **Database Queries**:
  * GET: `ScanCommand` with `FilterExpression: "SK = :sk AND begins_with(PK, :pk)"`.
  * POST: `PutCommand` with `PK = COURSE#<uuid>`, `SK = METADATA`.
  * PATCH: `UpdateCommand` converting body keys into `UpdateExpression` dynamically.
  * DELETE: `DeleteCommand` targeting exact PK/SK.
* **Output**: JSON stringified objects with CORS headers (`Access-Control-Allow-Origin: *`).

### 2. `students.js`
* **HTTP Methods**: GET, DELETE.
* **RBAC**: GET/DELETE (ADMIN or TUTOR).
* **Validation**: None specific.
* **Database Queries**: 
  * GET: `ScanCommand` filtering for `SK = PROFILE` and `role = STUDENT`.
* **Technical Debt**: A `ScanCommand` to find students is extremely inefficient at scale. It reads the entire table. A Global Secondary Index (GSI) should be used.

### 3. `enrollments.js`
* **HTTP Methods**: GET, POST, DELETE.
* **RBAC**: GET (Self or ADMIN/TUTOR). POST (STUDENT). DELETE (ADMIN/TUTOR or Self).
* **Database Queries**: 
  * POST: `PutCommand` associating `USER#<email>` (PK) with `ENROLL#COURSE#<courseId>` (SK).
  * GET: `QueryCommand` where `PK = USER#<email>` and `begins_with(SK, "ENROLL#")`.

### 4. `quizzes.js` & `assignments.js`
* **Technical Debt**: Both of these files exist in the backend with full CRUD operations written, but the Next.js frontend has `// Mock Data Types` hardcoded (e.g., in `app/assignments/page.tsx` and `app/components/ui/QuizTakingModal.tsx`). The frontend is currently bypassing these Lambdas entirely.

---

## SECTION 6: AWS RESOURCES (IMPLEMENTED ONLY)

*Based strictly on `template.yaml`, `amplify.yml`, and `lib/aws/` files.*

### 1. AWS Amplify
* **Purpose**: Frontend hosting and Next.js SSR.
* **Configuration**: `amplify.yml` defines the `build` sequence (`npm ci`, `npm run build`) and injects `.env.production`.
* **Execution**: Triggered via webhook on GitHub push.

### 2. Amazon Cognito User Pools
* **Purpose**: Identity Provider.
* **Configuration**: Handled outside the SAM template. Passed in via `NEXT_PUBLIC_COGNITO_USER_POOL_ID`.
* **Execution**: Frontend calls `signIn`. 

### 3. AWS API Gateway
* **Purpose**: HTTP REST endpoint routing to Lambdas.
* **Configuration**: Defined in `template.yaml` as `EduFlowApi` (Type: `AWS::Serverless::Api`).
* **Security**: `EduFlowCognitoAuthorizer` is attached to every route. It natively validates the Cognito JWT before invoking Lambda.

### 4. AWS Lambda
* **Purpose**: Serverless Node.js 20.x compute.
* **Configuration**: Defined in `template.yaml` (e.g., `CoursesFunction` Type: `AWS::Serverless::Function`).
* **Environment Variables**: Injects `DYNAMODB_TABLE_NAME` into `process.env`.
* **IAM Policies**: Uses `DynamoDBCrudPolicy` pointing to `EduFlowDataTable`.

### 5. Amazon DynamoDB
* **Purpose**: Single-Table NoSQL storage.
* **Configuration**: Defined as `EduFlowDataTable` (Type: `AWS::DynamoDB::Table`) with `BillingMode: PAY_PER_REQUEST`.
* **Keys**: `PK` (String, HASH), `SK` (String, RANGE).

### 6. Amazon S3
* **Purpose**: Profile and Course Thumbnail storage.
* **Configuration**: Implemented via `@aws-sdk/client-s3` in Next.js API routes targeting `eduflow-profiles` and `eduflow-courses` buckets.

---

## SECTION 7: AUTHENTICATION FLOW IMPLEMENTATION

*Based on `app/context/AuthContext.tsx` and `@aws-amplify/auth` integration.*

### Cognito JWT Flow
1. **User Types Email**: `app/login/page.tsx` fires `login(email, password)`.
2. **Amplify `signIn`**: SDK negotiates SRP with Cognito.
3. **ID Token Generation**: Cognito returns an ID Token containing `{ email, sub, "custom:role" }`.
4. **Context Hydration**: `AuthContext` calls `fetchAuthSession()`. It parses the ID Token payload.
5. **State Update**: `setUser({ name, email, role: claims["custom:role"] })`.
6. **Protected Routes**: When the user navigates, `RoleGuard.tsx` reads `user.role`. If `user` is null, the `RootLayout` forces a redirect.
7. **Authorization Header**: `lib/api.ts` intercepts all API calls, fetches the ID token via `fetchAuthSession()`, and injects it as `Authorization: Bearer <token>`.

### Refresh Tokens
Amplify natively stores the Refresh Token. When `api.ts` calls `fetchAuthSession()`, if the ID Token is expired (older than 1 hour), Amplify silently swaps the Refresh Token for a new ID Token.

---

## SECTION 8: DYNAMODB SCHEMA IMPLEMENTATION

*Based on operations in `backend/src/handlers/`.*

### Entities and Keys

**1. Course (`courses.js`)**
* `PK`: `COURSE#<uuid>`
* `SK`: `METADATA`
* *Attributes*: `title`, `description`, `price`, `category`, `thumbnail`.

**2. User Profile (`profile.js`, `students.js`)**
* `PK`: `USER#<email>`
* `SK`: `PROFILE`
* *Attributes*: `name`, `role`, `image`.

**3. Enrollment (`enrollments.js`)**
* `PK`: `USER#<email>`
* `SK`: `ENROLL#COURSE#<courseId>`
* *Attributes*: `enrolledAt`, `progress`.

**4. Quiz (`quizzes.js`)**
* `PK`: `COURSE#<courseId>`
* `SK`: `QUIZ#<uuid>`
* *Attributes*: `title`, `questions` (JSON array).

**5. Assignment (`assignments.js`)**
* `PK`: `COURSE#<courseId>`
* `SK`: `ASSIGNMENT#<uuid>`
* *Attributes*: `title`, `dueDate`.

### Access Patterns Implemented
* **List Courses**: `ScanCommand` for `SK = METADATA`. (Tech Debt: Slow).
* **Get My Enrollments**: `QueryCommand` for `PK = USER#<me> AND begins_with(SK, "ENROLL#")`. (Fast).
* **Get Course Quizzes**: `QueryCommand` for `PK = COURSE#<id> AND begins_with(SK, "QUIZ#")`. (Fast).
## SECTION 9: IMPLEMENTED API ENDPOINTS

*Based strictly on `backend/template.yaml` and `app/api/` route handlers.*

### Lambda-Backed Endpoints (API Gateway)
* `GET /courses` -> `CoursesFunction` (All Roles)
* `POST /courses` -> `CoursesFunction` (ADMIN/TUTOR)
* `PATCH /courses/{id}` -> `CoursesFunction` (ADMIN/TUTOR)
* `DELETE /courses/{id}` -> `CoursesFunction` (ADMIN/TUTOR)
* `GET /students` -> `StudentsFunction` (ADMIN/TUTOR)
* `GET /profile` -> `ProfileFunction` (All Roles)
* `PATCH /profile` -> `ProfileFunction` (All Roles)
* `POST /enrollments` -> `EnrollmentsFunction` (STUDENT)
* `GET /enrollments` -> `EnrollmentsFunction` (All Roles)
* `DELETE /enrollments/{courseId}` -> `EnrollmentsFunction` (All Roles)
* `POST /quizzes`, `GET /quizzes`, `POST /assignments`, `GET /assignments` -> Mapped in `template.yaml`, but the frontend explicitly mocks these in `app/assignments/page.tsx` instead of calling them.

### Next.js SSR Endpoints (Direct HTTP)
* `POST /api/profile/upload`
* `POST /api/courses/upload`

---

## SECTION 10: UPLOAD FLOW IMPLEMENTATION

*Based on `app/api/profile/upload/route.ts` and `lib/aws/s3.ts`.*

1. **Browser**: Sends `multipart/form-data` to `/api/profile/upload` with Bearer token.
2. **SSR Route**: Extracts JWT. Extracts `file`.
3. **AWS SDK**: Calls `@aws-sdk/lib-storage` `Upload`. Target: `eduflow-profiles` bucket.
4. **Backend Logic**: Awaits upload. URL is generated using string interpolation: `https://${bucketName}.s3.amazonaws.com/${fileName}`.
5. **Database Update**: The Next.js API route calls `DynamoDBClient` directly to execute an `UpdateCommand` on `USER#<email>`, setting `image = url`.
6. **Current Implementation Flaw**: The SSR route does *not* validate the JWT signature cryptographically using JWKS. It naively assumes the token is valid, which is a major security loophole compared to API Gateway.

---

## SECTION 11: PACKAGE.JSON ANALYSIS

### Critical Backend Dependencies
* `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`: These power the Next.js SSR backend routes for uploads and user profile updates.

### Critical Frontend Dependencies
* `aws-amplify`: Used in `AuthContext.tsx` to handle SRP login flows.
* `framer-motion`: Used in `app/login/page.tsx` for complex tab-switching animations.
* `zod`: Used in backend handlers (via local imports, though `package.json` installs it globally).
* `uuid`: Generates UUIDs for new courses/quizzes.
* `lucide-react`: Used heavily in `sidebar.tsx` and UI cards.

### Removable Dependencies (Technical Debt)
* `bcryptjs`: Was used in NextAuth architecture. Unused in Cognito architecture. **Can be removed.**
* `jose`: Was used for manual JWT verification. Now handled by API Gateway. **Can be removed.**
* `resend`: Used previously for custom emails. **Can be removed.**
* `@aws-sdk/s3-request-presigner`: Installed but completely unused in `lib/aws/s3.ts`.

---

## SECTION 12: ENVIRONMENT VARIABLES

*Based on explicit references in code.*

### Frontend (`.env.local` / Amplify Console)
* `NEXT_PUBLIC_COGNITO_USER_POOL_ID`: Consumed by `aws-amplify` in `AuthContext.tsx`. Failure mode: Users cannot log in.
* `NEXT_PUBLIC_COGNITO_CLIENT_ID`: Consumed by `aws-amplify`. Failure mode: Login requests rejected by AWS.
* `NEXT_PUBLIC_API_URL`: Consumed by `lib/api.ts`. Failure mode: All dashboard network requests fail.

### Next.js SSR Backend (`.env.local`)
* `AWS_REGION`: Consumed by `lib/aws/s3.ts` and `dynamo.ts`.
* `DYNAMODB_TABLE_NAME`: Consumed by `lib/aws/dynamo.ts`.

### Lambda Backend (`template.yaml` Environment block)
* `DYNAMODB_TABLE_NAME`: Injected by CloudFormation at deploy time. Consumed by `src/handlers/courses.js`, etc. Failure mode: `ResourceNotFoundException`.

---

## SECTION 13: TECHNICAL DEBT IDENTIFICATION

*This section is built purely on `grep` analysis of the current source code.*

### 1. Hardcoded Mock Data (The "Mock" Epidemic)
The codebase heavily relies on hardcoded data, bypassing the actual DynamoDB backend in several places:
* **`app/context/AppContext.tsx:154`**: `// Only for mock purposes; practically you would do this on the backend`.
* **`app/profile/page.tsx:53`**: `// We will just mock success for now`.
* **`app/assignments/page.tsx:23`**: Contains a massive block of `// Mock Data Types` and hardcoded assignment JSON arrays. The `AssignmentsFunction` in the backend is literally never called by this page.
* **`app/components/RevenueTrendChart.tsx:12`**: `// Mock data: normally you'd compute this from actual enrollments over time`. It renders static arrays.
* **`app/components/ui/QuizTakingModal.tsx:19`**: `// Generate some mock questions deterministically based on the quiz ID so it's consistent`. Quizzes are entirely faked.

### 2. The Local Mock DB Architecture
* `lib/aws/cognito.ts` and `lib/aws/dynamo.ts` have extensive logic checking `const IS_MOCK_MODE = !CLIENT_ID || !USER_POOL_ID;`. 
* If `.env.local` is missing variables, it silently falls back to reading/writing to a local `.mock-db.json` file on disk. 
* *Risk*: If an environment variable drops in production SSR, the server will try to write to a local JSON file (which fails in a serverless read-only filesystem) instead of DynamoDB.

### 3. Inefficient Queries
* `backend/src/handlers/courses.js` and `students.js` use `ScanCommand` to list items. This reads every item in the table, burning read capacity units (RCUs) and destroying performance as the LMS grows.

### 4. Security Risks
* Next.js SSR API Routes (`/api/profile/upload`) parse the JWT manually but **do not cryptographically verify the signature**. A user could forge an un-signed JWT and the Next.js backend would blindly trust the payload and update the database via `dynamo.ts`.

---

## SECTION 14: REPOSITORY HEALTH REPORT

### Completed Features (Working Code)
* Authentication (Login, Signup, Verify, Password Reset) via Cognito.
* RBAC routing (Admin/Tutor vs Student visibility).
* Course Management (Create, Edit, Delete, View).
* Direct-to-S3 Multipart Uploads for Profile Pictures and Course Thumbnails.
* AWS SAM Backend deployment logic.

### Broken / Incomplete Features (Mocked Code)
* **Assignments**: Completely mocked in the UI. Backend Lambda exists but is orphaned.
* **Quizzes**: UI uses deterministic mock questions. Does not actually fetch from the database.
* **Revenue Chart**: Hardcoded arrays. No actual enrollment analytics calculations exist.
* **Profile Updating (Metadata)**: `app/profile/page.tsx` has a comment `// We will just mock success for now`. Saving profile changes (other than the avatar upload) does not actually save to the backend.

### Action Items for Next Developer
1. **Remove the Mock Epidemic**: Connect `app/assignments/page.tsx` and `app/quizzes/page.tsx` to the `api.get('/assignments')` endpoints using `lib/api.ts`.
2. **Secure the SSR Routes**: Add `aws-jwt-verify` to `/api/profile/upload` to ensure forged tokens cannot overwrite database records.
3. **Fix Database Scaling**: Replace `ScanCommand` in Lambdas with Global Secondary Indexes (GSIs).
4. **Cleanup Dependencies**: Run `npm uninstall bcryptjs jose resend @aws-sdk/s3-request-presigner`.

*End of Document*
