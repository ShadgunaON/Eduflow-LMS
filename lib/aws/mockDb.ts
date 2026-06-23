import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '.mock-db.json');

export interface MockData {
  users: Record<string, any>;
  dynamo: Record<string, any>;
}

export const getMockDb = (): MockData => {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to read .mock-db.json", e);
    }
  }
  return { users: {}, dynamo: {} };
};

export const saveMockDb = (data: MockData) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
};
