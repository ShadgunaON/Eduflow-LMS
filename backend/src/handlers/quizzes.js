const { getItem, putItem, queryItems, scanByPKPrefix, scanItems } = require("./lib/dynamo");
const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");

// -----------------------------------------------------------------------------
// ZOD SCHEMAS
// -----------------------------------------------------------------------------
const quizSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  courseId: z.string().min(1, "Course ID is required"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  questionsCount: z.number().min(1, "Must have at least 1 question"),
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      options: z.array(z.string()),
      correctAnswer: z.number(),
    })
  ).optional(),
});

const quizAttemptSchema = z.object({
  quizId: z.string().min(1, "Quiz ID is required"),
  score: z.number().optional(),
  status: z.enum(["Not Started", "In Progress", "Completed"]).optional().default("In Progress"),
});

// -----------------------------------------------------------------------------
// RBAC
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

async function getQuizzes(claims) {
  const userEmail = claims?.email;
  const isStudent = !hasRole(claims, ["ADMIN", "INSTRUCTOR", "TUTOR"]);

  if (isStudent) {
    const enrollments = await queryItems(`USER#${userEmail}`, "ENROLL#");
    const flattened = [];

    for (const enr of enrollments) {
      const quizzes = await queryItems(`COURSE#${enr.courseId}`, "QUIZ#");
      for (const q of quizzes) {
        const attempt = await getItem(`USER#${userEmail}`, `ATTEMPT#${q.id}`);
        flattened.push({
          id: q.id,
          quizId: q.id,
          title: q.title,
          course: enr.courseName,
          duration: q.duration,
          questionsCount: q.questionsCount,
          questions: q.questions,
          status: attempt ? attempt.status : "Not Started",
          score: attempt ? attempt.score : null,
        });
      }
    }
    return flattened;
  } else {
    // Admin / Instructor / Tutor
    const allCourses = await scanByPKPrefix("COURSE#");
    const flattened = [];

    for (const c of allCourses) {
      const quizzes = await queryItems(c.PK, "QUIZ#");
      if (quizzes.length === 0) continue;

      const enrollments = await scanItems(`ENROLL#${c.id}`);

      for (const q of quizzes) {
        if (enrollments.length === 0) {
          flattened.push({
            id: q.id,
            quizId: q.id,
            title: q.title,
            course: c.name,
            duration: q.duration,
            questionsCount: q.questionsCount,
            questions: q.questions,
            status: "Not Started",
            score: null,
            studentId: null,
            studentName: "No students enrolled",
          });
          continue;
        }

        for (const enr of enrollments) {
          const attempt = await getItem(`USER#${enr.userId}`, `ATTEMPT#${q.id}`);
          flattened.push({
            id: `${q.id}_${enr.userId}`,
            quizId: q.id,
            title: q.title,
            course: c.name,
            duration: q.duration,
            questionsCount: q.questionsCount,
            questions: q.questions,
            status: attempt ? attempt.status : "Not Started",
            score: attempt ? attempt.score : null,
            studentId: enr.userId,
            studentName: enr.studentName || "Unknown Student",
          });
        }
      }
    }
    return flattened;
  }
}

async function createQuiz(input, claims) {
  if (!hasRole(claims, ["TUTOR"])) {
    const err = new Error("Unauthorized: Only Tutors can create quizzes");
    err.code = "FORBIDDEN";
    throw err;
  }

  const validated = quizSchema.parse(input);
  const newQuizId = uuidv4();
  const quiz = { PK: `COURSE#${validated.courseId}`, SK: `QUIZ#${newQuizId}`, id: newQuizId, quizId: newQuizId, ...validated, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await putItem(quiz);
  await putItem({ PK: "ACTIVITY", SK: `DATE#${new Date().toISOString()}`, type: "course", message: `New quiz added: ${quiz.title}`, icon: "📝", createdAt: new Date().toISOString() });
  return quiz;
}

async function submitQuizAttempt(input, claims) {
  const validated = quizAttemptSchema.parse(input);
  const userId = claims?.email;

  const isCompleted = validated.status === "Completed" || (validated.score !== undefined && validated.score > 0);
  const status = isCompleted ? "Completed" : "In Progress";
  const score = validated.score ?? 0;
  const completedAt = isCompleted ? new Date().toISOString() : null;

  const attempt = await getItem(`USER#${userId}`, `ATTEMPT#${validated.quizId}`) || {
    PK: `USER#${userId}`,
    SK: `ATTEMPT#${validated.quizId}`,
    quizId: validated.quizId,
    userId,
  };

  attempt.status = status;
  attempt.score = score;
  attempt.completedAt = completedAt;

  await putItem(attempt);

  return attempt;
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
        case "getQuizzes":
          return await getQuizzes(claims);
        case "createQuiz":
          return await createQuiz(event.arguments.input, claims);
        case "submitQuizAttempt":
          return await submitQuizAttempt(event.arguments.input, claims);
        default:
          throw new Error(`Unknown GraphQL field: ${fieldName}`);
      }
    }

    // 2. API Gateway REST Router
    const httpMethod = event.httpMethod;
    if (httpMethod) {
      if (httpMethod === "GET") {
        const result = await getQuizzes(claims);
        return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(result) };
      }

      if (httpMethod === "POST") {
        const path = event.path || "";
        const body = JSON.parse(event.body);

        if (path.endsWith("/attempt")) {
          const result = await submitQuizAttempt(body, claims);
          return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(result) };
        } else {
          const result = await createQuiz(body, claims);
          return { statusCode: 201, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(result) };
        }
      }

      return { statusCode: 405, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    throw new Error("Unrecognized event source");
  } catch (error) {
    console.error("Error in quizzes handler:", error);
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
