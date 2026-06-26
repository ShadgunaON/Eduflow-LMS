const { getItem, putItem, queryItems, scanByPKPrefix, scanItems } = require("./lib/dynamo");
const { getPresignedUrl } = require("./lib/s3");
const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");

// -----------------------------------------------------------------------------
// ZOD SCHEMAS
// -----------------------------------------------------------------------------
const assignmentSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  courseId: z.string().min(1, "Course ID is required"),
  dueDate: z.string().min(1, "Due date is required"),
});

// -----------------------------------------------------------------------------
// RBAC
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

async function getAssignments(claims) {
  const userEmail = claims?.email;
  const isStudent = !hasRole(claims, ["ADMIN", "INSTRUCTOR", "TUTOR"]);

  if (isStudent) {
    const enrollments = await queryItems(`USER#${userEmail}`, "ENROLL#");
    const flattened = [];

    for (const enr of enrollments) {
      const assignments = await queryItems(`COURSE#${enr.courseId}`, "ASSIGN#");
      for (const a of assignments) {
        const sub = await getItem(`USER#${userEmail}`, `SUB#${a.id}`);
        let status = "Pending";
        let score = null;
        let fileUrl = null;
        let textResponse = null;

        if (sub) {
          status = sub.status;
          score = sub.score;
          fileUrl = sub.fileUrl ? await getPresignedUrl(sub.fileUrl) : null;
          textResponse = sub.textResponse;
        } else if (new Date(a.dueDate) < new Date()) {
          status = "Overdue";
        }

        flattened.push({
          id: a.id,
          assignmentId: a.id,
          title: a.title,
          course: enr.courseName,
          dueDate: a.dueDate,
          status,
          score,
          fileUrl,
          textResponse,
        });
      }
    }
    return flattened;
  } else {
    // Admin / Instructor
    const allCourses = await scanByPKPrefix("COURSE#");
    const flattened = [];

    for (const c of allCourses) {
      const assignments = await queryItems(c.PK, "ASSIGN#");
      if (assignments.length === 0) continue;

      const enrollments = await scanItems(`ENROLL#${c.id}`);

      for (const a of assignments) {
        if (enrollments.length === 0) {
          flattened.push({
            id: a.id,
            assignmentId: a.id,
            title: a.title,
            course: c.name,
            dueDate: a.dueDate,
            status: "Pending",
            score: null,
            fileUrl: null,
            textResponse: null,
            studentId: null,
            studentName: "No students enrolled",
          });
          continue;
        }

        for (const enr of enrollments) {
          const sub = await getItem(`USER#${enr.userId}`, `SUB#${a.id}`);
          let status = "Pending";
          let score = null;
          let fileUrl = null;
          let textResponse = null;

          if (sub) {
            status = sub.status;
            score = sub.score;
            fileUrl = sub.fileUrl ? await getPresignedUrl(sub.fileUrl) : null;
            textResponse = sub.textResponse;
          } else if (new Date(a.dueDate) < new Date()) {
            status = "Overdue";
          }

          flattened.push({
            id: `${a.id}_${enr.userId}`,
            assignmentId: a.id,
            title: a.title,
            course: c.name,
            dueDate: a.dueDate,
            status,
            score,
            fileUrl,
            textResponse,
            studentId: enr.userId,
            studentName: enr.studentName || "Unknown Student",
          });
        }
      }
    }
    return flattened;
  }
}

async function createAssignment(input, claims) {
  if (!hasRole(claims, ["ADMIN", "INSTRUCTOR", "TUTOR"])) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const validated = assignmentSchema.parse(input);
  const newAssignmentId = uuidv4();
  const assignment = { PK: `COURSE#${validated.courseId}`, SK: `ASSIGN#${newAssignmentId}`, id: newAssignmentId, assignmentId: newAssignmentId, title: validated.title, courseId: validated.courseId, dueDate: new Date(validated.dueDate).toISOString() };
  await putItem(assignment);
  await putItem({ PK: "ACTIVITY", SK: `DATE#${new Date().toISOString()}`, type: "course", message: `New assignment added: ${assignment.title}`, icon: "📝", createdAt: new Date().toISOString() });
  return assignment;
}

async function submitAssignment(input, claims) {
  const isStudent = !hasRole(claims, ["ADMIN", "INSTRUCTOR", "TUTOR"]);
  if (!isStudent) {
    const err = new Error("Only students can submit.");
    err.code = "FORBIDDEN";
    throw err;
  }

  const userId = claims?.email;
  const { assignmentId, textResponse } = input;

  const sub = await getItem(`USER#${userId}`, `SUB#${assignmentId}`) || {
    PK: `USER#${userId}`,
    SK: `SUB#${assignmentId}`,
    assignmentId,
    userId,
  };

  sub.status = "Submitted";
  if (textResponse) sub.textResponse = textResponse;
  sub.submittedAt = new Date().toISOString();

  await putItem(sub);

  await putItem({
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "assignment",
    message: `Assignment submitted`,
    icon: "✅",
    createdAt: new Date().toISOString(),
  });

  return { ...sub, fileUrl: sub.fileUrl ? await getPresignedUrl(sub.fileUrl) : null };
}

async function gradeAssignment(input, claims) {
  const isStudent = !hasRole(claims, ["ADMIN", "INSTRUCTOR", "TUTOR"]);
  if (isStudent) {
    const err = new Error("Students cannot grade.");
    err.code = "FORBIDDEN";
    throw err;
  }

  const { assignmentId, studentId, score } = input;

  const sub = await getItem(`USER#${studentId}`, `SUB#${assignmentId}`);
  if (!sub) {
    const err = new Error("Submission not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  sub.status = "Graded";
  sub.score = score;
  await putItem(sub);

  await putItem({
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "assignment",
    message: `Assignment graded`,
    icon: "✅",
    createdAt: new Date().toISOString(),
  });

  return sub;
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
        case "getAssignments":
          return await getAssignments(claims);
        case "createAssignment":
          return await createAssignment(event.arguments.input, claims);
        case "submitAssignment":
          return await submitAssignment(event.arguments.input, claims);
        case "gradeAssignment":
          return await gradeAssignment(event.arguments.input, claims);
        default:
          throw new Error(`Unknown GraphQL field: ${fieldName}`);
      }
    }

    // 2. API Gateway REST Router
    const httpMethod = event.httpMethod;
    if (httpMethod) {
      if (httpMethod === "GET") {
        const result = await getAssignments(claims);
        return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(result) };
      }

      if (httpMethod === "POST") {
        const path = event.path || "";
        const body = JSON.parse(event.body);

        if (path.endsWith("/submit")) {
          const isStudent = !hasRole(claims, ["ADMIN", "INSTRUCTOR", "TUTOR"]);
          if (isStudent) {
            return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Students must use multipart form upload." }) };
          }
          const result = await gradeAssignment(body, claims);
          return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(result) };
        } else {
          const result = await createAssignment(body, claims);
          return { statusCode: 201, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(result) };
        }
      }

      return { statusCode: 405, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    throw new Error("Unrecognized event source");
  } catch (error) {
    console.error("Error in assignments handler:", error);
    if (event.info && event.info.fieldName) {
      if (error.name === "ZodError") throw new Error(`[ValidationError] ${JSON.stringify(error.errors)}`);
      throw error;
    }
    if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") return { statusCode: 403, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message }) };
    if (error.code === "NOT_FOUND") return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message }) };
    if (error.name === "ZodError") return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Validation Failed", issues: error.errors }) };
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message || "Failed to process request" }) };
  }
};
