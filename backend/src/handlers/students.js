// Cognito integration pending IAM & package.json approval
// const { CognitoIdentityProviderClient, SignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
// const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";
// const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || "us-east-1" });
const { scanByPKPrefix, putItem, getItem, queryItems, deleteItem } = require("./lib/dynamo");
const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");

const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// -----------------------------------------------------------------------------
// ZOD SCHEMAS (exact match from app/lib/schemas.ts)
// -----------------------------------------------------------------------------
const studentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  course: z.string().min(1, "Course is required").optional(),
});

// -----------------------------------------------------------------------------
// RBAC (exact match from courses.js)
// -----------------------------------------------------------------------------
function hasRole(claims, allowedRoles) {
  if (!claims) return false;
  const groups = claims['custom:role'] || claims['cognito:groups'];
  if (!groups) return false;
  const userGroups = Array.isArray(groups) ? groups : groups.split(",");
  return allowedRoles.some((role) => userGroups.includes(role));
}

// -----------------------------------------------------------------------------
// SHARED BUSINESS LOGIC
// -----------------------------------------------------------------------------

async function getStudents(pageStr = "1", limitStr = "50") {
  const page = parseInt(pageStr || "1");
  const limit = parseInt(limitStr || "50");
  const skip = (page - 1) * limit;

  const allUsers = await scanByPKPrefix("USER#", "PROFILE");
  const students = allUsers.filter((u) => u.role === "STUDENT");

  students.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const total = students.length;
  const paginatedStudents = students.slice(skip, skip + limit);

  const result = await Promise.all(
    paginatedStudents.map(async (s) => {
      const enrollments = await queryItems(`USER#${s.email}`, "ENROLL#");
      return {
        id: s.email,
        name: s.name,
        email: s.email,
        course:
          enrollments.length > 0 ? enrollments[0].courseName : "Not Enrolled",
      };
    })
  );

  return { data: result, total, page, totalPages: Math.ceil(total / limit) };
}

async function createStudent(input, claims) {
  if (!hasRole(claims, ["ADMIN", "INSTRUCTOR", "TUTOR"])) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const validated = studentSchema.parse(input);

  // Create in Cognito (exact match from app/api/students/route.ts POST)
  // Cognito creation logic temporarily commented out pending IAM/package.json approval
  // const tempPassword = `Temp@${uuidv4().slice(0, 8)}`;
  // const signUpCommand = new SignUpCommand({
  //   ClientId: CLIENT_ID, Username: validated.email, Password: tempPassword,
  //   UserAttributes: [{ Name: "email", Value: validated.email }, { Name: "name", Value: validated.name }],
  // });
  // await cognitoClient.send(signUpCommand);

  // Save user profile to DynamoDB
  const newUser = {
    PK: `USER#${validated.email}`,
    SK: "PROFILE",
    email: validated.email,
    name: validated.name,
    role: "STUDENT",
    createdAt: new Date().toISOString(),
  };
  await putItem(newUser);

  // Log activity
  await putItem({
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "student",
    message: `${newUser.name} registered as a new student`,
    icon: "🎓",
    createdAt: new Date().toISOString(),
  });

  return {
    id: newUser.email,
    name: newUser.name,
    email: newUser.email,
    course: "Not Enrolled",
  };
}

async function updateStudent(id, input, claims) {
  if (!hasRole(claims, ["ADMIN", "INSTRUCTOR", "TUTOR"])) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const validated = studentSchema.partial().parse(input);
  const { course, ...userData } = validated;

  const user = await getItem(`USER#${id}`, "PROFILE");
  if (!user) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const updatedUser = { ...user, ...userData };
  await putItem(updatedUser);

  const enrollments = await queryItems(`USER#${id}`, "ENROLL#");

  await putItem({
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "student",
    message: `${updatedUser.name}'s profile updated`,
    icon: "✏️",
    createdAt: new Date().toISOString(),
  });

  return {
    id: updatedUser.email,
    name: updatedUser.name,
    email: updatedUser.email,
    course: enrollments[0]?.courseName || "No Course",
  };
}

async function deleteStudent(id, claims) {
  if (!hasRole(claims, ["ADMIN", "INSTRUCTOR", "TUTOR"])) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const user = await getItem(`USER#${id}`, "PROFILE");
  if (!user) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  // Cascade delete all items under USER#{id}
  const items = await queryItems(`USER#${id}`);
  for (const item of items) {
    await deleteItem(item.PK, item.SK);
  }

  await putItem({
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "student",
    message: `${user.name} was removed`,
    icon: "🗑️",
    createdAt: new Date().toISOString(),
  });

  return { success: true };
}

// -----------------------------------------------------------------------------
// MAIN HANDLER (Dual-Router: AppSync + API Gateway)
// -----------------------------------------------------------------------------
exports.handler = async (event) => {
  try {
    // 1. AppSync GraphQL Router
    if (event.info && event.info.fieldName) {
      const fieldName = event.info.fieldName;
      const claims = event.identity?.claims;
      switch (fieldName) {
        case "getStudents": {
          const page = event.arguments.page ? String(event.arguments.page) : "1";
          const limit = event.arguments.limit ? String(event.arguments.limit) : "50";
          return await getStudents(page, limit);
        }
        case "createStudent":
          return await createStudent(event.arguments.input, claims);
        case "updateStudent":
          return await updateStudent(event.arguments.id, event.arguments.input, claims);
        case "deleteStudent":
          return await deleteStudent(event.arguments.id, claims);
        default:
          throw new Error(`Unknown GraphQL field: ${fieldName}`);
      }
    }

    // 2. API Gateway REST Router
    const httpMethod = event.httpMethod;
    if (httpMethod) {
      if (httpMethod === "GET") {
        const page = event.queryStringParameters?.page;
        const limit = event.queryStringParameters?.limit;
        const result = await getStudents(page, limit);
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify(result),
        };
      }

      if (httpMethod === "POST") {
        const claims = event.requestContext?.authorizer?.claims;
        const body = JSON.parse(event.body);
        const result = await createStudent(body, claims);
        return {
          statusCode: 201,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify(result),
        };
      }

      return {
        statusCode: 405,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    throw new Error("Unrecognized event source");
  } catch (error) {
    console.error("Error in students handler:", error);

    if (event.info && event.info.fieldName) {
      if (error.name === "ZodError") {
        throw new Error(`[ValidationError] ${JSON.stringify(error.errors)}`);
      }
      throw error;
    }

    if (error.code === "UNAUTHORIZED") {
      return {
        statusCode: 403,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }
    if (error.code === "NOT_FOUND") {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: error.message }),
      };
    }
    if (error.name === "ZodError") {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Validation Failed", issues: error.errors }),
      };
    }
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.message || "Failed to process request" }),
    };
  }
};
