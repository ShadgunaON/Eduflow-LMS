"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

import type { Student, Course, Enrollment, Activity } from "../data/types";
import { StudentService, CourseService, EnrollmentService, ActivityService, AssignmentService, QuizService } from "../lib/api";
import { useToast } from "./ToastContext";
import { useAuth } from "./AuthContext";

interface AppContextType {
  students: Student[];
  courses: Course[];
  enrollments: Enrollment[];
  activities: Activity[];
  assignments: any[];
  quizzes: any[];
  hydrated: boolean;

  addStudent: (s: Omit<Student, "id">) => Promise<void>;
  updateStudent: (id: string, s: Omit<Student, "id">) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;

  addCourse: (c: Omit<Course, "id">) => Promise<void>;
  updateCourse: (id: string, c: Omit<Course, "id">) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;

  addEnrollment: (e: Omit<Enrollment, "id">) => Promise<void>;
  updateEnrollment: (id: string, e: Omit<Enrollment, "id">) => Promise<void>;
  deleteEnrollment: (id: string) => Promise<void>;

  addActivity: (type: Activity["type"], message: string, icon: string) => Promise<void>;
  
  reloadAssignments: () => Promise<void>;
  reloadQuizzes: () => Promise<void>;
  
  resetAll: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setHydrated(true);
      return;
    }

    async function loadData() {
      try {
        const [sData, cData, eData, aData, asgData, qData] = await Promise.all([
          StudentService.getStudents().catch(() => []),
          CourseService.getCourses().catch(() => []),
          EnrollmentService.getEnrollments().catch(() => []),
          ActivityService.getActivities().catch(() => []),
          AssignmentService.getAssignments().catch(() => []),
          QuizService.getQuizzes().catch(() => [])
        ]);
        setStudents(sData);
        setCourses(cData);
        setEnrollments(eData);
        setActivities(aData);
        setAssignments(asgData);
        setQuizzes(qData);
      } catch (err: unknown) {
        if (err instanceof Error) {
          addToast(err.message, "error");
        } else {
          addToast("Failed to load data", "error");
        }
      } finally {
        setHydrated(true);
      }
    }

    loadData();
  }, [addToast, loading, user]);

  const reloadStudents = async () => setStudents(await StudentService.getStudents().catch(() => []));
  const reloadCourses = async () => setCourses(await CourseService.getCourses().catch(() => []));
  const reloadEnrollments = async () => setEnrollments(await EnrollmentService.getEnrollments().catch(() => []));
  const reloadActivities = async () => setActivities(await ActivityService.getActivities().catch(() => []));
  const reloadAssignments = async () => setAssignments(await AssignmentService.getAssignments().catch(() => []));
  const reloadQuizzes = async () => setQuizzes(await QuizService.getQuizzes().catch(() => []));

  async function addStudent(data: Omit<Student, "id">) {
    await StudentService.addStudent(data);
    await Promise.all([reloadStudents(), reloadActivities()]);
  }

  async function updateStudent(id: string, data: Omit<Student, "id">) {
    await StudentService.updateStudent(id, data);
    await Promise.all([reloadStudents(), reloadActivities()]);
  }

  async function deleteStudent(id: string) {
    await StudentService.deleteStudent(id);
    await Promise.all([reloadStudents(), reloadActivities(), reloadEnrollments()]);
  }

  async function addCourse(data: Omit<Course, "id">) {
    await CourseService.addCourse(data);
    await Promise.all([reloadCourses(), reloadActivities()]);
  }

  async function updateCourse(id: string, data: Omit<Course, "id">) {
    await CourseService.updateCourse(id, data);
    await Promise.all([reloadCourses(), reloadActivities(), reloadEnrollments(), reloadStudents()]);
  }

  async function deleteCourse(id: string) {
    await CourseService.deleteCourse(id);
    await Promise.all([reloadCourses(), reloadActivities(), reloadEnrollments(), reloadStudents()]);
  }

  async function addEnrollment(data: Omit<Enrollment, "id">) {
    await EnrollmentService.addEnrollment(data);
    await Promise.all([reloadEnrollments(), reloadStudents(), reloadActivities()]);
  }

  async function updateEnrollment(id: string, data: Omit<Enrollment, "id">) {
    await EnrollmentService.updateEnrollment(id, data);
    await Promise.all([reloadEnrollments(), reloadStudents(), reloadActivities()]);
  }

  async function deleteEnrollment(id: string) {
    await EnrollmentService.deleteEnrollment(id);
    await Promise.all([reloadEnrollments(), reloadStudents(), reloadActivities()]);
  }

  async function addActivity(type: Activity["type"], message: string, icon: string) {
    await ActivityService.addActivity({ type, message, timestamp: new Date().toISOString(), icon });
    await reloadActivities();
  }

  function resetAll() {
    // Only for mock purposes; practically you would do this on the backend
  }

  const value: AppContextType = {
    students,
    courses,
    enrollments,
    activities,
    assignments,
    quizzes,
    hydrated,
    addStudent,
    updateStudent,
    deleteStudent,
    addCourse,
    updateCourse,
    deleteCourse,
    addEnrollment,
    updateEnrollment,
    deleteEnrollment,
    addActivity,
    reloadAssignments,
    reloadQuizzes,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp() must be used inside <AppProvider>");
  return ctx;
}
