const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "EduflowLMS";
const S3_BUCKET = process.env.S3_BUCKET_NAME || "eduflow-lms-storage-use1-siddhi-2026"; // Matches original bucket

const courseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  duration: z.string().min(1, "Duration is required"),
  fee: z.string().min(1, "Fee is required"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().nullable().optional(),
});

function hasRole(claims, allowedRoles) {
  if (!claims) return false;
  const groups = claims['custom:role'] || claims['cognito:groups'];
  if (!groups) return false;
  const userGroups = Array.isArray(groups) ? groups : groups.split(',');
  return allowedRoles.some((role) => userGroups.includes(role));
}

// -----------------------------------------------------------------------------
// SHARED BUSINESS LOGIC
// -----------------------------------------------------------------------------

async function getCourses(pageStr = "1", limitStr = "50") {
  const page = parseInt(pageStr || "1");
  const limit = parseInt(limitStr || "50");
  const skip = (page - 1) * limit;

  const scanCommand = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
    ExpressionAttributeValues: {
      ":prefix": "COURSE#",
      ":sk": "METADATA",
    },
  });
  const response = await docClient.send(scanCommand);
  let allCourses = response.Items || [];

  allCourses.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const total = allCourses.length;
  const paginatedCourses = allCourses.slice(skip, skip + limit);

  const result = await Promise.all(paginatedCourses.map(async (c) => {
    let signedImageUrl = c.imageUrl;
    if (c.imageUrl && !c.imageUrl.startsWith("http")) {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: c.imageUrl,
      });
      signedImageUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }
    return {
      id: c.id,
      name: c.name,
      duration: c.duration,
      fee: c.fee,
      category: c.category,
      imageUrl: signedImageUrl,
    };
  }));

  return {
    data: result,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

async function createCourse(input, claims) {
  if (!hasRole(claims, ["ADMIN", "TUTOR"])) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const validated = courseSchema.parse(input);

  const newCourseId = uuidv4();
  const newCourse = {
    PK: `COURSE#${newCourseId}`,
    SK: "METADATA",
    id: newCourseId,
    ...validated,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const activityItem = {
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "course",
    message: `${newCourse.name} course added to catalog`,
    icon: "📚",
    createdAt: new Date().toISOString(),
  };

  await Promise.all([
    docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: newCourse })),
    docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: activityItem }))
  ]);

  return {
    id: newCourse.id,
    name: newCourse.name,
    duration: newCourse.duration,
    fee: newCourse.fee,
    category: newCourse.category,
    imageUrl: newCourse.imageUrl,
    createdAt: newCourse.createdAt,
    updatedAt: newCourse.updatedAt
  };
}

// -----------------------------------------------------------------------------
// MAIN HANDLER
// -----------------------------------------------------------------------------
async function updateCourse(id, input, claims) {
  if (!hasRole(claims, ["ADMIN", "TUTOR"])) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const validated = courseSchema.partial().parse(input);

  const getCmd = new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `COURSE#${id}`, SK: "METADATA" }
  });
  const existing = await docClient.send(getCmd);
  
  if (!existing.Item) {
    const err = new Error("Course not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const updatedCourse = {
    ...existing.Item,
    ...validated,
    updatedAt: new Date().toISOString(),
  };

  const activityItem = {
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "course",
    message: `${updatedCourse.name} course updated`,
    icon: "✏️",
    createdAt: new Date().toISOString(),
  };

  await Promise.all([
    docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedCourse })),
    docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: activityItem }))
  ]);

  return {
    id: updatedCourse.id,
    name: updatedCourse.name,
    duration: updatedCourse.duration,
    fee: updatedCourse.fee,
    category: updatedCourse.category,
    imageUrl: updatedCourse.imageUrl,
    createdAt: updatedCourse.createdAt,
    updatedAt: updatedCourse.updatedAt
  };
}

async function deleteCourse(id, claims) {
  if (!hasRole(claims, ["ADMIN", "TUTOR"])) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const getCmd = new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `COURSE#${id}`, SK: "METADATA" }
  });
  const existing = await docClient.send(getCmd);
  
  if (!existing.Item) {
    const err = new Error("Course not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");

  const activityItem = {
    PK: "ACTIVITY",
    SK: `DATE#${new Date().toISOString()}`,
    type: "course",
    message: `${existing.Item.name} course deleted`,
    icon: "🗑️",
    createdAt: new Date().toISOString(),
  };

  await Promise.all([
    docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: `COURSE#${id}`, SK: "METADATA" } })),
    docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: activityItem }))
  ]);

  return { success: true };
}

// -----------------------------------------------------------------------------
// MAIN HANDLER
// -----------------------------------------------------------------------------
exports.handler = async (event) => {
  try {
    // 1. AppSync GraphQL Router
    if (event.info && event.info.fieldName) {
      const fieldName = event.info.fieldName;
      switch (fieldName) {
        case "getCourses": {
          const page = event.arguments.page ? String(event.arguments.page) : "1";
          const limit = event.arguments.limit ? String(event.arguments.limit) : "50";
          return await getCourses(page, limit);
        }
        case "createCourse": {
          return await createCourse(event.arguments.input, event.identity?.claims);
        }
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
        const result = await getCourses(page, limit);
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify(result),
        };
      }

      if (httpMethod === "POST") {
        const claims = event.requestContext?.authorizer?.claims;
        const body = JSON.parse(event.body);
        const result = await createCourse(body, claims);
        return {
          statusCode: 201,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify(result),
        };
      }

      if (httpMethod === "PATCH" || httpMethod === "PUT") {
        const claims = event.requestContext?.authorizer?.claims;
        const body = JSON.parse(event.body);
        const id = event.pathParameters?.id;
        if (!id) throw new Error("Missing course ID");
        const result = await updateCourse(id, body, claims);
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify(result),
        };
      }

      if (httpMethod === "DELETE") {
        const claims = event.requestContext?.authorizer?.claims;
        const id = event.pathParameters?.id;
        if (!id) throw new Error("Missing course ID");
        const result = await deleteCourse(id, claims);
        return {
          statusCode: 200,
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
    console.error("Error in courses handler:", error);
    
    // GraphQL Error Formatting
    if (event.info && event.info.fieldName) {
      if (error.name === 'ZodError') {
        throw new Error(`[ValidationError] ${JSON.stringify(error.errors)}`);
      }
      throw error; // Let AppSync wrap the native error automatically
    }

    // REST Error Formatting
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
        body: JSON.stringify({ error: "Not Found" }),
      };
    }
    if (error.name === 'ZodError') {
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
