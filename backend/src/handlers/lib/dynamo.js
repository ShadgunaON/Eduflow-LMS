const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "EduflowLMS";

const putItem = async (item) => {
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
};

const getItem = async (pk, sk) => {
  const response = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: sk } })
  );
  return response.Item || null;
};

const deleteItem = async (pk, sk) => {
  await docClient.send(
    new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: sk } })
  );
};

const queryItems = async (pk, skPrefix) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: skPrefix
      ? "PK = :pk AND begins_with(SK, :skPrefix)"
      : "PK = :pk",
    ExpressionAttributeValues: skPrefix
      ? { ":pk": pk, ":skPrefix": skPrefix }
      : { ":pk": pk },
  };
  const response = await docClient.send(new QueryCommand(params));
  return response.Items || [];
};

const scanItems = async (skPrefix) => {
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: { ":skPrefix": skPrefix },
  });
  const response = await docClient.send(command);
  return response.Items || [];
};

const scanByPKPrefix = async (pkPrefix, sk = "METADATA") => {
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "begins_with(PK, :pkPrefix) AND SK = :sk",
    ExpressionAttributeValues: { ":pkPrefix": pkPrefix, ":sk": sk },
  });
  const response = await docClient.send(command);
  return response.Items || [];
};

module.exports = {
  docClient,
  TABLE_NAME,
  putItem,
  getItem,
  deleteItem,
  queryItems,
  scanItems,
  scanByPKPrefix,
};
