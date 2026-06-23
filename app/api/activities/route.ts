import { NextResponse } from "next/server";
import { putItem, queryItems } from "../../../lib/aws/dynamo";
import { auth } from "../../../auth";
import { z } from "zod";

const activitySchema = z.object({
  type: z.string().min(1, "Type is required"),
  message: z.string().min(1, "Message is required"),
  timestamp: z.string().optional(),
  icon: z.string().optional(),
});

// GET /api/activities — Fetch all activities (most recent first)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activities = await queryItems("ACTIVITY");

    activities.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.SK.replace("DATE#", "")).getTime();
      const dateB = new Date(b.createdAt || b.SK.replace("DATE#", "")).getTime();
      return dateB - dateA;
    });

    const recentActivities = activities.slice(0, 100);

    // Map to match the frontend Activity interface (timestamp as ISO string)
    const result = recentActivities.map((a: any) => ({
      id: a.SK,
      type: a.type,
      message: a.message,
      timestamp: a.createdAt || a.SK.replace("DATE#", ""),
      icon: a.icon,
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch activities";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/activities — Create a new activity
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = activitySchema.parse(body);

    const timestamp = validated.timestamp ? new Date(validated.timestamp).toISOString() : new Date().toISOString();
    const newActivity = {
      PK: "ACTIVITY",
      SK: `DATE#${timestamp}`,
      type: validated.type,
      message: validated.message,
      createdAt: timestamp,
      icon: validated.icon || "🔔",
    };

    await putItem(newActivity);

    return NextResponse.json(
      {
        id: newActivity.SK,
        type: newActivity.type,
        message: newActivity.message,
        timestamp: newActivity.createdAt,
        icon: newActivity.icon,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create activity";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
