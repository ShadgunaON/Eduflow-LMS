import { Student, Course, Enrollment, Activity } from "../data/types";
import { fetchAuthSession } from "aws-amplify/auth";

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  // Only add Content-Type if we aren't explicitly unsetting it (like we do for FormData)
  if ((options?.headers as any)?.["Content-Type"] !== undefined) {
     headers["Content-Type"] = "application/json";
  } else {
     delete headers["Content-Type"];
  }

  // Inject Cognito JWT Token
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (e) {
    console.error("Auth session not available for API call");
  }

  // Re-wire to API Gateway (except upload routes)
  const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "https://lsbvzcesa2.execute-api.us-east-1.amazonaws.com/Prod";
  let finalUrl = url;
  if (url.startsWith("/api") && !url.includes("/upload")) {
    finalUrl = url.replace("/api", API_GATEWAY_URL);
  }

  const res = await fetch(finalUrl, {
    cache: "no-store",
    ...options,
    headers,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "An API error occurred");
  }
  
  // If the API returns a paginated structure { data: [...], total, page }, return the inner data array to prevent breaking existing components
  if (data && typeof data === 'object' && Array.isArray(data.data) && 'total' in data && 'page' in data) {
    return data.data as unknown as T;
  }
  
  return data;
}

export const StudentService = {
  getStudents: () => fetchApi<Student[]>("/api/students"),
  addStudent: (data: Omit<Student, "id">) => fetchApi<Student>("/api/students", { method: "POST", body: JSON.stringify(data) }),
  updateStudent: (id: string, data: Partial<Student>) => fetchApi<Student>(`/api/students/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteStudent: (id: string) => fetchApi<{ success: boolean }>(`/api/students/${id}`, { method: "DELETE" }),
};

export const CourseService = {
  getCourses: () => fetchApi<Course[]>("/api/courses"),
  addCourse: (data: Omit<Course, "id">) => fetchApi<Course>("/api/courses", { method: "POST", body: JSON.stringify(data) }),
  updateCourse: (id: string, data: Partial<Course>) => fetchApi<Course>(`/api/courses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCourse: (id: string) => fetchApi<{ success: boolean }>(`/api/courses/${id}`, { method: "DELETE" }),
};

export const EnrollmentService = {
  getEnrollments: () => fetchApi<Enrollment[]>("/api/enrollments"),
  addEnrollment: (data: Omit<Enrollment, "id">) => fetchApi<Enrollment>("/api/enrollments", { method: "POST", body: JSON.stringify(data) }),
  updateEnrollment: (id: string, data: Partial<Enrollment>) => fetchApi<Enrollment>(`/api/enrollments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEnrollment: (id: string) => fetchApi<{ success: boolean }>(`/api/enrollments/${id}`, { method: "DELETE" }),
};

export const ActivityService = {
  getActivities: () => fetchApi<Activity[]>("/api/activities"),
  addActivity: (data: Omit<Activity, "id">) => fetchApi<Activity>("/api/activities", { method: "POST", body: JSON.stringify(data) }),
};

export const AssignmentService = {
  getAssignments: () => fetchApi<any[]>("/api/assignments"),
  addAssignment: (data: any) => fetchApi<any>("/api/assignments", { method: "POST", body: JSON.stringify(data) }),
  submitAssignment: (formData: FormData) => fetchApi<any>("/api/assignments/submit", { 
    method: "POST", 
    body: formData,
    // Note: don't set Content-Type header when sending FormData, browser sets it with boundary
    headers: { "Content-Type": undefined } as any
  }),
  gradeAssignment: (data: { assignmentId: string, studentId: string, score: string }) => 
    fetchApi<any>("/api/assignments/submit", { method: "POST", body: JSON.stringify(data) }),
};

export const QuizService = {
  getQuizzes: () => fetchApi<any[]>("/api/quizzes"),
  addQuiz: (data: any) => fetchApi<any>("/api/quizzes", { method: "POST", body: JSON.stringify(data) }),
  attemptQuiz: (data: { quizId: string, score?: number, status?: string }) => fetchApi<any>("/api/quizzes/attempt", { method: "POST", body: JSON.stringify(data) }),
};

export const ProfileService = {
  getProfile: () => fetchApi<any>("/api/profile"),
  updateProfile: (data: any) => fetchApi<any>("/api/profile", { method: "PUT", body: JSON.stringify(data) }),
};
