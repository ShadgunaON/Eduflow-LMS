import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getMockDb, saveMockDb } from "./mockDb";

const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "";
const IS_MOCK_MODE = !CLIENT_ID || !USER_POOL_ID;

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export const cognitoSignIn = async (email: string, password: string) => {
  if (IS_MOCK_MODE) {
    const db = getMockDb();
    const user = db.users[email];
    if (user && user.password === password) {
      return { AccessToken: "mock-jwt-token-12345" };
    }
    throw new Error("Invalid credentials (Mock Mode)");
  }

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });
  const response = await client.send(command);
  return response.AuthenticationResult;
};

export const cognitoSignUp = async (email: string, password: string, name: string, role: string = "STUDENT") => {
  if (IS_MOCK_MODE) {
    const db = getMockDb();
    if (db.users[email]) throw new Error("User already exists (Mock Mode)");
    db.users[email] = { email, password, name, role };
    saveMockDb(db);
    return true;
  }

  const command = new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "name", Value: name },
    ],
  });
  const response = await client.send(command);
  return response.UserConfirmed;
};

export const cognitoForgotPassword = async (email: string) => {
  if (IS_MOCK_MODE) {
    const db = getMockDb();
    if (!db.users[email]) throw new Error("User not found (Mock Mode)");
    // Set a mock reset token
    db.users[email].resetToken = "123456";
    saveMockDb(db);
    console.log(`[MOCK MODE] Reset code for ${email} is 123456`);
    return;
  }

  const command = new ForgotPasswordCommand({
    ClientId: CLIENT_ID,
    Username: email,
  });
  await client.send(command);
};

export const cognitoConfirmForgotPassword = async (email: string, code: string, newPassword: string) => {
  if (IS_MOCK_MODE) {
    const db = getMockDb();
    const user = db.users[email];
    if (!user || user.resetToken !== code) {
      throw new Error("Invalid confirmation code (Mock Mode)");
    }
    user.password = newPassword;
    delete user.resetToken;
    saveMockDb(db);
    return;
  }

  const command = new ConfirmForgotPasswordCommand({
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });
  await client.send(command);
};

