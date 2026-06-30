# SOURCE SNAPSHOT CONTENTS

This document details the contents of the `EduFlowLMS_Source_Snapshot.zip` archive.

## 1. Complete Folder Tree
```
app
app/api
app/api/courses
app/api/courses/upload
app/api/debug
app/api/debug/role
app/api/profile
app/api/profile/upload
app/assignments
app/auth
app/auth/new-password
app/auth/verify
app/components
app/components/dashboard
app/components/ui
app/context
app/courses
app/courses/[id]
app/dashboard
app/data
app/enrollment
app/lib
app/login
app/profile
app/quizzes
app/quizzes/[id]
app/settings
app/students
app/students/[id]
backend
backend/src
backend/src/handlers
backend/src/handlers/lib
data
e2e-tests
lib
lib/aws
public
public/courses
scripts
```

## 2. Included Files
- .env (Sanitized)
- .env.example
- .env.local (Sanitized)
- .gitignore
- AGENTS.md
- API_ARCHITECTURE.md
- ARCHITECTURE.md
- AUTH_SETUP.md
- AWS_MIGRATION_AUDIT_REPORT.md
- AWS_MIGRATION_EXECUTION_PLAN.md
- BACKEND_AUDIT_REPORT.md
- CLAUDE.md
- COMPREHENSIVE_CODE_REVIEW.md
- DATABASE_SETUP.md
- DEPLOYMENT_PREPARATION.md
- E2E_VERIFICATION_REPORT.md
- EDUFLOW_COMPLETE_TECHNICAL_DOCUMENTATION.md
- EDUFLOW_DEVELOPER_BIBLE.md
- EDUFLOW_SOURCE_CODE_ATLAS.md
- LEARNING_GUIDE.md
- PROJECT_AUDIT.md
- PROJECT_SETUP.md
- README.md
- ROLE_MATRIX.md
- SOURCE_SNAPSHOT_CONTENTS.md
- admin_evidence_report.md
- amplify.yml
- amplify_failed_build_log.txt
- app/api/courses/upload/route.ts
- app/api/profile/upload/route.ts
- app/assignments/page.tsx
- app/auth/new-password/page.tsx
- app/components/ActivityTimeline.tsx
- app/components/AnimatedStatsCard.tsx
- app/components/ClientShell.tsx
- app/components/ConfirmModal.tsx
- app/components/CourseCard.tsx
- app/components/DonutChart.tsx
- app/components/EnrollmentCard.tsx
- app/components/FormInput.tsx
- app/components/Navbar.tsx
- app/components/PopularCoursesWidget.tsx
- app/components/QuickActions.tsx
- app/components/RevenueTrendChart.tsx
- app/components/RoleGuard.tsx
- app/components/StudentCard.tsx
- app/components/ToastContainer.tsx
- app/components/UpcomingTasks.tsx
- app/components/dashboard/CoursePopularityChart.tsx
- app/components/dashboard/EnrollmentDistribution.tsx
- app/components/dashboard/MonthlyActivityChart.tsx
- app/components/dashboard/RevenueChart.tsx
- app/components/sidebar.tsx
- app/components/ui/DashboardCard.tsx
- app/components/ui/ProgressRing.tsx
- app/components/ui/QuizTakingModal.tsx
- app/components/ui/StatCard.tsx
- app/components/ui/StatusBadge.tsx
- app/components/ui/UserAvatar.tsx
- app/context/AppContext.tsx
- app/context/AuthContext.tsx
- app/context/SettingsContext.tsx
- app/context/ToastContext.tsx
- app/courses/[id]/page.tsx
- app/courses/page.tsx
- app/dashboard/page.tsx
- app/data/store.ts
- app/data/types.ts
- app/enrollment/page.tsx
- app/favicon.ico
- app/globals.css
- app/layout.tsx
- app/lib/api.ts
- app/lib/schemas.ts
- app/lib/utils.ts
- app/login/page.tsx
- app/page.tsx
- app/profile/page.tsx
- app/quizzes/[id]/page.tsx
- app/quizzes/page.tsx
- app/settings/page.tsx
- app/students/[id]/page.tsx
- app/students/page.tsx
- backend/package-lock.json
- backend/package.json
- backend/schema.graphql
- backend/src/handlers/activities.js
- backend/src/handlers/assignments.js
- backend/src/handlers/courses.js
- backend/src/handlers/enrollments.js
- backend/src/handlers/lib/dynamo.js
- backend/src/handlers/lib/s3.js
- backend/src/handlers/profile.js
- backend/src/handlers/quizzes.js
- backend/src/handlers/students.js
- backend/template.yaml
- build_log.txt
- data/db.json
- e2e-tests/api-e2e.spec.ts
- e2e-tests/e2e.spec.ts
- eslint.config.mjs
- lib/aws/cognito.ts
- lib/aws/dynamo.ts
- lib/aws/mockDb.ts
- lib/aws/s3.ts
- lib/mail.ts
- lib/rbac.ts
- logGroupName.txt
- next-env.d.ts
- next.config.mjs
- next.config.ts
- out.html
- package-lock.json
- package.json
- playwright.config.ts
- policy.json
- postcss.config.mjs
- public/courses/devops.png
- public/courses/node.png
- public/courses/react.png
- public/courses/uiux.png
- public/file.svg
- public/globe.svg
- public/next.svg
- public/vercel.svg
- public/window.svg
- scripts/capture-before.js
- scripts/verify-users.js
- tsconfig.json
- tsconfig.tsbuildinfo

## 3. Excluded Files & Folders
- .git/ (Directory excluded by rules)
- .next/ (Directory excluded by rules)
- EduFlowLMS_Source_Snapshot.zip (File excluded by rules)
- __snapshot_temp/ (Directory excluded by rules)
- add-tutor.js (File excluded by rules)
- audit-auth.js (File excluded by rules)
- backend/.aws-sam/ (Directory excluded by rules)
- backend/node_modules/ (Directory excluded by rules)
- check-db.js (File excluded by rules)
- check-users.js (File excluded by rules)
- create_snapshot.js (File excluded by rules)
- fix.js (File excluded by rules)
- force-verify.js (File excluded by rules)
- node_modules/ (Directory excluded by rules)
- query.js (File excluded by rules)
- replace2.js (File excluded by rules)
- scratch/ (Directory excluded by rules)
- test-register.js (File excluded by rules)
- verify-test.js (File excluded by rules)

## 4. Sanitized Files
- .env
- .env.local

## 5. Skipped Files Explanation
The following items were explicitly excluded based on snapshot rules:
- `node_modules/`, `.next/`, `.aws-sam/`, `dist/`, `build/`, `coverage/`, `.git/`, `.vscode/`, `scratch/`: Build artifacts, cache, and external dependencies.
- `*.log`, `*.tmp`, `*.zip`: Temporary files and previous archives.
- Temporary verification scripts (e.g., `test-register.js`, `check-db.js`): Local testing scratchpads not part of the core source code.
