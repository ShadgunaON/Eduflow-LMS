const { getItem, putItem } = require("./lib/dynamo");
const { getPresignedUrl } = require("./lib/s3");
const { z } = require("zod");

// -----------------------------------------------------------------------------
// ZOD SCHEMAS
// -----------------------------------------------------------------------------
const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
});

// -----------------------------------------------------------------------------
// SHARED BUSINESS LOGIC
// -----------------------------------------------------------------------------

async function getProfile(claims) {
  const userEmail = claims?.email;
  if (!userEmail) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const user = await getItem(`USER#${userEmail}`, "PROFILE");

  if (!user) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (user.image) {
    user.image = await getPresignedUrl(user.image);
  }

  return { ...user, id: user.email };
}

async function updateProfile(input, claims) {
  const userEmail = claims?.email;
  if (!userEmail) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  // Password changes handled by Cognito directly
  if (input.type === "password") {
    const err = new Error("Password changes must be done via Cognito Forgot Password flow.");
    err.code = "BAD_REQUEST";
    throw err;
  }

  const validated = profileUpdateSchema.parse(input);
  const { name } = validated;

  const userToUpdate = await getItem(`USER#${userEmail}`, "PROFILE");
  if (!userToUpdate) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const updatedUser = {
    ...userToUpdate,
    name,
  };

  await putItem(updatedUser);

  await putItem({
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "student",
    message: `${name} updated their profile information`,
    icon: "✏️",
    createdAt: new Date().toISOString(),
  });

  return {
    id: updatedUser.email,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    image: updatedUser.image ? await getPresignedUrl(updatedUser.image) : null,
  };
}

// -----------------------------------------------------------------------------
// MAIN HANDLER
// -----------------------------------------------------------------------------
exports.handler = async (event) => {
  try {
    const claims = event.identity?.claims || event.requestContext?.authorizer?.claims;

    // 1. AppSync GraphQL Router
    if (event.info && event.info.fieldName) {
      const fieldName = event.info.fieldName;
      switch (fieldName) {
        case "getProfile":
          return await getProfile(claims);
        case "updateProfile":
          return await updateProfile(event.arguments.input, claims);
        default:
          throw new Error(`Unknown GraphQL field: ${fieldName}`);
      }
    }

    // 2. API Gateway REST Router
    const httpMethod = event.httpMethod;
    if (httpMethod) {
      if (httpMethod === "GET") {
        const result = await getProfile(claims);
        return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(result) };
      }

      if (httpMethod === "PUT") {
        const body = JSON.parse(event.body);
        const result = await updateProfile(body, claims);
        return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(result) };
      }

      return { statusCode: 405, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    throw new Error("Unrecognized event source");
  } catch (error) {
    console.error("Error in profile handler:", error);
    if (event.info && event.info.fieldName) {
      if (error.name === "ZodError") throw new Error(`[ValidationError] ${JSON.stringify(error.errors)}`);
      throw error;
    }
    if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") return { statusCode: 401, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message }) };
    if (error.code === "NOT_FOUND") return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message }) };
    if (error.code === "BAD_REQUEST") return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message }) };
    if (error.name === "ZodError") return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Validation Failed", issues: error.errors }) };
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message || "Failed to process request" }) };
  }
};
