const { scanItems, scanByPKPrefix, putItem, deleteItem } = require("./lib/dynamo");
const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");

// -----------------------------------------------------------------------------
// ZOD SCHEMAS (exact match from app/lib/schemas.ts)
// -----------------------------------------------------------------------------
const enrollmentSchema = z.object({
  studentName: z.string().min(1, "Student is required"),
  courseName: z.string().min(1, "Course is required"),
  enrolledDate: z.string().min(1, "Date is required"),
  status: z.enum(["Active", "Pending", "Completed", "Dropped"]).optional().default("Active"),
});

// -----------------------------------------------------------------------------
// RBAC (exact match from courses.js)
// -----------------------------------------------------------------------------
function hasRole(claims, allowedRoles) {
  if (!claims) return false;
  const groups = claims["cognito:groups"];
  if (!groups) return false;
  const userGroups = Array.isArray(groups) ? groups : groups.split(",");
  return allowedRoles.some((role) => userGroups.includes(role));
}

// -----------------------------------------------------------------------------
// SHARED BUSINESS LOGIC
// -----------------------------------------------------------------------------

async function getEnrollments(pageStr = "1", limitStr = "50") {
  const page = parseInt(pageStr || "1");
  const limit = parseInt(limitStr || "50");
  const skip = (page - 1) * limit;

  const allEnrollments = await scanItems("ENROLL#");

  allEnrollments.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const total = allEnrollments.length;
  const paginatedEnrollments = allEnrollments.slice(skip, skip + limit);

  const result = paginatedEnrollments.map((e) => ({
    id: e.id,
    userId: e.userId,
    courseId: e.courseId,
    studentName: e.studentName,
    courseName: e.courseName,
    enrolledDate: e.enrolledDate,
    status: e.status,
  }));

  return { data: result, total, page, totalPages: Math.ceil(total / limit) };
}

async function createEnrollment(input, claims) {
  if (!hasRole(claims, ["ADMIN", "INSTRUCTOR"])) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const validated = enrollmentSchema.parse(input);

  const allUsers = await scanByPKPrefix("USER#", "PROFILE");
  const user = allUsers.find(
    (u) => u.name === validated.studentName && u.role === "STUDENT"
  );

  const allCourses = await scanByPKPrefix("COURSE#");
  const course = allCourses.find((c) => c.name === validated.courseName);

  if (!user) {
    const err = new Error("Student not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (!course) {
    const err = new Error("Course not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const newEnrollmentId = uuidv4();
  const newEnrollment = {
    PK: `USER#${user.email}`,
    SK: `ENROLL#${course.id}`,
    id: newEnrollmentId,
    userId: user.email,
    courseId: course.id,
    studentName: user.name,
    courseName: course.name,
    enrolledDate: validated.enrolledDate,
    status: validated.status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await putItem(newEnrollment);

  await putItem({
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "enrollment",
    message: `${user.name} enrolled in ${course.name}`,
    icon: "📋",
    createdAt: new Date().toISOString(),
  });

  return {
    id: newEnrollment.id,
    userId: newEnrollment.userId,
    courseId: newEnrollment.courseId,
    studentName: newEnrollment.studentName,
    courseName: newEnrollment.courseName,
    enrolledDate: newEnrollment.enrolledDate,
    status: newEnrollment.status,
  };
}

async function updateEnrollment(id, input, claims) {
  if (!hasRole(claims, ["ADMIN", "INSTRUCTOR"])) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const validated = enrollmentSchema.partial().parse(input);

  const enrollments = await scanItems("ENROLL#");
  const enrollment = enrollments.find((e) => e.id === id);

  if (!enrollment) {
    const err = new Error("Enrollment not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const { courseName, studentName, ...dataToUpdate } = validated;
  const updated = { ...enrollment, ...dataToUpdate, updatedAt: new Date().toISOString() };
  await putItem(updated);

  await putItem({
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "enrollment",
    message: `Enrollment for ${updated.studentName} updated`,
    icon: "✏️",
    createdAt: new Date().toISOString(),
  });

  return {
    id: updated.id,
    userId: updated.userId,
    courseId: updated.courseId,
    studentName: updated.studentName,
    courseName: updated.courseName,
    enrolledDate: updated.enrolledDate,
    status: updated.status,
  };
}

async function deleteEnrollment(id, claims) {
  if (!hasRole(claims, ["ADMIN", "INSTRUCTOR"])) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const enrollments = await scanItems("ENROLL#");
  const enrollment = enrollments.find((e) => e.id === id);

  if (!enrollment) {
    const err = new Error("Enrollment not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  await deleteItem(enrollment.PK, enrollment.SK);

  await putItem({
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "enrollment",
    message: `${enrollment.studentName}'s enrollment removed`,
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
        case "getEnrollments": {
          const page = event.arguments.page ? String(event.arguments.page) : "1";
          const limit = event.arguments.limit ? String(event.arguments.limit) : "50";
          return await getEnrollments(page, limit);
        }
        case "createEnrollment":
          return await createEnrollment(event.arguments.input, claims);
        case "updateEnrollment":
          return await updateEnrollment(event.arguments.id, event.arguments.input, claims);
        case "deleteEnrollment":
          return await deleteEnrollment(event.arguments.id, claims);
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
        const result = await getEnrollments(page, limit);
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify(result),
        };
      }

      if (httpMethod === "POST") {
        const claims = event.requestContext?.authorizer?.claims;
        const body = JSON.parse(event.body);
        const result = await createEnrollment(body, claims);
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
    console.error("Error in enrollments handler:", error);

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
