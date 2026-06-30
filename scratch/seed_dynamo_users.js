const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "EduFlow-LMS-Data-USE1";

const users = [
  {
    email: "admin@eduflow.com",
    name: "Admin User",
    role: "ADMIN"
  },
  {
    email: "yhshadgunasiddhi@gmail.com",
    name: "Tutor User",
    role: "TUTOR"
  },
  {
    email: "harshavardhahyper@gmail.com",
    name: "Student User",
    role: "STUDENT"
  }
];

async function seed() {
  for (const user of users) {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${user.email}`,
        SK: "PROFILE",
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: new Date().toISOString()
      }
    };
    
    try {
      await ddbDocClient.send(new PutCommand(params));
      console.log(`Successfully seeded ${user.email} in DynamoDB`);
    } catch (err) {
      console.error(`Failed to seed ${user.email}`, err);
    }
  }
}

seed();
