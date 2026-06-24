import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { getMockDb, saveMockDb } from "./mockDb";

const AWS_REGION = process.env.AWS_REGION;
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const IS_MOCK_MODE = !AWS_REGION || !DYNAMODB_TABLE_NAME;

console.error("[AUTH_TRACE] AWS_ACCESS_KEY_ID exists:", !!process.env.AWS_ACCESS_KEY_ID);
console.error("[AUTH_TRACE] AWS_SECRET_ACCESS_KEY exists:", !!process.env.AWS_SECRET_ACCESS_KEY);
console.error("[AUTH_TRACE] AWS_SESSION_TOKEN exists:", !!process.env.AWS_SESSION_TOKEN);
console.error("[AUTH_TRACE] process.env.AWS_REGION:", process.env.AWS_REGION);

defaultProvider()().then(
  () => console.error("[AUTH_TRACE] SDK Node Provider Resolution: SUCCESS"),
  (err) => {
    console.error("[AUTH_TRACE] SDK Node Provider Resolution: FAILED");
    console.error("[AUTH_TRACE] Error Name:", err.name);
    console.error("[AUTH_TRACE] Error Message:", err.message);
  }
);

const client = new DynamoDBClient({ region: AWS_REGION || "us-east-1" });
export const docClient = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = DYNAMODB_TABLE_NAME || "EduflowLMS";

export const putItem = async (item: Record<string, any>) => {
  if (IS_MOCK_MODE) {
    const db = getMockDb();
    if (!db.dynamo) db.dynamo = {};
    const key = `${item.PK}::${item.SK}`;
    db.dynamo[key] = { ...item };
    saveMockDb(db);
    return;
  }
  const command = new PutCommand({ TableName: TABLE_NAME, Item: item });
  return docClient.send(command);
};

export const getItem = async (pk: string, sk: string) => {
  if (IS_MOCK_MODE) {
    const db = getMockDb();
    const key = `${pk}::${sk}`;
    return db.dynamo?.[key] || null;
  }
  const command = new GetCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: sk } });
  const response = await docClient.send(command);
  return response.Item;
};

export const queryItems = async (pk: string, skPrefix?: string) => {
  if (IS_MOCK_MODE) {
    const db = getMockDb();
    if (!db.dynamo) return [];
    return Object.values(db.dynamo).filter((item: any) => {
      if (item.PK !== pk) return false;
      if (skPrefix && !item.SK.startsWith(skPrefix)) return false;
      return true;
    });
  }
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: skPrefix ? "PK = :pk AND begins_with(SK, :skPrefix)" : "PK = :pk",
    ExpressionAttributeValues: skPrefix ? { ":pk": pk, ":skPrefix": skPrefix } : { ":pk": pk },
  });
  const response = await docClient.send(command);
  return response.Items || [];
};

export const deleteItem = async (pk: string, sk: string) => {
  if (IS_MOCK_MODE) {
    const db = getMockDb();
    const key = `${pk}::${sk}`;
    if (db.dynamo && db.dynamo[key]) {
      delete db.dynamo[key];
      saveMockDb(db);
    }
    return;
  }
  const command = new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: sk } });
  return docClient.send(command);
};

export const scanItems = async (skPrefix: string) => {
  if (IS_MOCK_MODE) {
    const db = getMockDb();
    if (!db.dynamo) return [];
    return Object.values(db.dynamo).filter((item: any) => item.SK && item.SK.startsWith(skPrefix));
  }
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: { ":skPrefix": skPrefix },
  });
  const response = await docClient.send(command);
  return response.Items || [];
};

export const scanByPKPrefix = async (pkPrefix: string, sk: string = "METADATA") => {
  if (IS_MOCK_MODE) {
    const db = getMockDb();
    if (!db.dynamo) return [];
    return Object.values(db.dynamo).filter((item: any) => item.PK && item.PK.startsWith(pkPrefix) && item.SK === sk);
  }
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "begins_with(PK, :pkPrefix) AND SK = :sk",
    ExpressionAttributeValues: { ":pkPrefix": pkPrefix, ":sk": sk },
  });
  const response = await docClient.send(command);
  return response.Items || [];
};
