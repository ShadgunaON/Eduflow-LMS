# AWS Amplify & DynamoDB Authentication Failure Report

This report summarizes the root cause of the `CredentialsSignin` failures occurring in the AWS Amplify SSR deployment for the **EduFlow-LMS** application (`aws-phase2-cognito` branch). 

## 1. Executive Summary

The authentication failures are **not** caused by NextAuth (Auth.js) or user credential mismatches. The failures occur exclusively because the Next.js SSR container lacks the required IAM permissions to read user profiles from the external DynamoDB table.

Because the Amplify App is currently bound to a default logging role rather than a backend service role, the container starts without valid AWS credentials, causing the AWS SDK to crash when attempting to fetch the user's profile immediately after a successful Cognito login.

---

## 2. Evidence of Failure Point

Diagnostic `[AUTH_TRACE]` logging was deployed to `auth.ts` to trace the exact sequence of the authentication failure.

### AUTH_TRACE Sequence
```text
[AUTH_TRACE] Phase 1: Calling cognitoSignIn...
[AUTH_TRACE] Phase 2: Cognito SUCCESS. Calling DynamoDB getItem...
[AUTH_TRACE] CRITICAL CRASH CAUGHT: CredentialsProviderError Could not load credentials from any providers
```

### Cognito Login Success
As shown in the trace, `cognitoSignIn()` completes successfully. AWS Cognito accepts the password and returns a valid `AccessToken`. This proves the frontend, Auth.js configuration, and Cognito User Pool are all functioning perfectly.

### CredentialsProviderError Context
The crash occurs the exact millisecond that `getItem()` is invoked via `@aws-sdk/client-dynamodb`. 
*   Unlike Cognito's `InitiateAuth` (which uses unsigned public HTTP requests), DynamoDB requires SigV4 signed requests using AWS credentials.
*   Because the SSR Lambda container lacks an IAM role with external API permissions, the AWS SDK's default credential provider chain fails to find temporary credentials, resulting in `Could not load credentials from any providers`.

---

## 3. Current IAM Configuration (The Root Cause)

AWS CLI inspection of the Amplify App (`d4gl27knqvyrm`) in `us-east-1` confirms the following configuration:

*   **Current Amplify Runtime Role:** `arn:aws:iam::230937596130:role/service-role/AmplifySSRLoggingRole-00467e05-45fd-4ec0-b2ac-33b39249aef9`
*   **Current Attached Policy:** `AmplifySSRLoggingPolicy-00467e05-45fd-4ec0-b2ac-33b39249aef9`

### Policy Summary
The attached policy only grants CloudWatch logging permissions:
```json
"Action": [
    "logs:CreateLogStream",
    "logs:PutLogEvents",
    "logs:CreateLogGroup",
    "logs:DescribeLogGroups"
]
```
There are **zero permissions** granting access to DynamoDB. Without a bound service role that requires API access, the Amplify managed compute environment strips IAM keys from the Node.js runtime, triggering the SDK crash.

---

## 4. Minimum Required Fix for Administrator

To permanently resolve the backend crashes, the AWS Administrator must explicitly grant the Amplify SSR runtime permission to interact with the DynamoDB table.

### Administrator Action Items:
1. Open the IAM Console and locate the current role: `AmplifySSRLoggingRole-00467e05-45fd-4ec0-b2ac-33b39249aef9` (or create a dedicated `EduFlowAmplifyRuntimeRole` with a trust relationship for `amplify.amazonaws.com`).
2. Attach an inline IAM policy granting the following minimum DynamoDB actions targeting the specific table.

### Minimum Required IAM Policy
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": "arn:aws:dynamodb:us-east-1:230937596130:table/EduFlow-LMS-Data-USE1"
        }
    ]
}
```

Once this policy is attached, Amplify will automatically inject the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` into the Next.js SSR environment on the next boot. The `@aws-sdk/client-dynamodb` will successfully authenticate, and the application login flow will complete successfully.
