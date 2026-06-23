import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { getItem } from "./lib/aws/dynamo";
import { cognitoSignIn } from "./lib/aws/cognito";
import { authConfig } from "./auth.config";
import { CredentialsSignin } from "next-auth";

class DebugAuthError extends CredentialsSignin {
  constructor(errorName: string) {
    super();
    this.code = errorName;
  }
}

class UnverifiedEmailError extends CredentialsSignin {
  code = "Email not verified. Please check your inbox for the verification link.";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
           console.error("[AUTH_TRACE] Zod validation failed for email. Returning null.");
           return null;
        }

        const { email, password } = parsedCredentials.data;
        
        try {
          console.error("[AUTH_TRACE] Phase 1: Calling cognitoSignIn...");
          const authResult = await cognitoSignIn(email, password);
          
          if (authResult?.AccessToken) {
            console.error("[AUTH_TRACE] Phase 2: Cognito SUCCESS. Calling DynamoDB getItem...");
            const user = await getItem(`USER#${email}`, "PROFILE");
            
            if (user) {
              return { id: email, email: user.email, name: user.name, role: user.role };
            }
            return { id: email, email, role: "STUDENT" };
          }
          
          console.error("[AUTH_TRACE] Phase X: Cognito returned empty AccessToken without throwing. Returning null.");
        } catch (error: any) {
          console.error("[AUTH_TRACE] CRITICAL CRASH CAUGHT:", error.name, error.message, error.stack);
          throw new DebugAuthError(error.name || "UnknownBackendError");
        }
        
        console.error("[AUTH_TRACE] Fallthrough. Returning null.");
        return null;
      },
    }),
  ],
});
