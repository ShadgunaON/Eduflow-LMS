const { queryItems, putItem } = require("./lib/dynamo");
const { z } = require("zod");

// -----------------------------------------------------------------------------
// ZOD SCHEMAS (exact match from app/lib/schemas.ts)
// -----------------------------------------------------------------------------
const activitySchema = z.object({
  type: z.string().min(1, "Type is required"),
  message: z.string().min(1, "Message is required"),
  timestamp: z.string().optional(),
  icon: z.string().optional(),
});

// -----------------------------------------------------------------------------
// SHARED BUSINESS LOGIC
// -----------------------------------------------------------------------------

async function getActivities() {
  const activities = await queryItems("ACTIVITY");

  activities.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.SK.replace("DATE#", "")).getTime();
    const dateB = new Date(b.createdAt || b.SK.replace("DATE#", "")).getTime();
    return dateB - dateA;
  });

  const recentActivities = activities.slice(0, 100);

  return recentActivities.map((a) => ({
    id: a.SK,
    type: a.type,
    message: a.message,
    timestamp: a.createdAt || a.SK.replace("DATE#", ""),
    icon: a.icon,
  }));
}

async function createActivity(input) {
  const validated = activitySchema.parse(input);

  const timestamp = validated.timestamp
    ? new Date(validated.timestamp).toISOString()
    : new Date().toISOString();

  const newActivity = {
    PK: "ACTIVITY",
    SK: `DATE#${timestamp}`,
    type: validated.type,
    message: validated.message,
    createdAt: timestamp,
    icon: validated.icon || "🔔",
  };

  await putItem(newActivity);

  return {
    id: newActivity.SK,
    type: newActivity.type,
    message: newActivity.message,
    timestamp: newActivity.createdAt,
    icon: newActivity.icon,
  };
}

// -----------------------------------------------------------------------------
// MAIN HANDLER (Dual-Router: AppSync + API Gateway)
// -----------------------------------------------------------------------------
exports.handler = async (event) => {
  try {
    // 1. AppSync GraphQL Router
    if (event.info && event.info.fieldName) {
      const fieldName = event.info.fieldName;
      switch (fieldName) {
        case "getActivities":
          return await getActivities();
        case "createActivity":
          return await createActivity(event.arguments.input);
        default:
          throw new Error(`Unknown GraphQL field: ${fieldName}`);
      }
    }

    // 2. API Gateway REST Router
    const httpMethod = event.httpMethod;
    if (httpMethod) {
      if (httpMethod === "GET") {
        const result = await getActivities();
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify(result),
        };
      }

      if (httpMethod === "POST") {
        const body = JSON.parse(event.body);
        const result = await createActivity(body);
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
    console.error("Error in activities handler:", error);

    // GraphQL Error Formatting
    if (event.info && event.info.fieldName) {
      if (error.name === "ZodError") {
        throw new Error(`[ValidationError] ${JSON.stringify(error.errors)}`);
      }
      throw error;
    }

    // REST Error Formatting
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
