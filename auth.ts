import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "./app/lib/prisma";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cognitoSignIn } from "./lib/aws/cognito";
import { authConfig } from "./auth.config";
import { CredentialsSignin } from "next-auth";

class UnverifiedEmailError extends CredentialsSignin {
  code = "Email not verified. Please check your inbox for the verification link.";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
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
           console.log("LOGIN ATTEMPT", credentials?.email, "- Zod validation failed");
           return null;
        }

        const { email, password } = parsedCredentials.data;
        console.log("LOGIN ATTEMPT", email);
        

        try {
          // Attempt AWS Cognito authentication
          const authResult = await cognitoSignIn(email, password);
          
          if (authResult?.AccessToken) {
            console.log("COGNITO AUTH SUCCESS");
            const user = await prisma.user.findUnique({ where: { email } });
            if (user) return user;
            return null;
          }
        } catch (error: any) {
          console.log("COGNITO AUTH FAILED:", error.name || error.message);
          
          // Fallback to local database authentication during migration
          const user = await prisma.user.findUnique({ where: { email } });
          if (user && user.password) {
            const passwordsMatch = await bcrypt.compare(password, user.password);
            if (passwordsMatch) {
              console.log("FALLBACK LOCAL AUTH SUCCESS");
              return user;
            }
          }
        }
        
        return null;
      },
    }),
  ],
});
