import { z } from 'zod'

export const createCourseSchema = z.object({
  title: z.string().min(2, 'Course title is required'),
  code: z.string().min(2, 'Course code is required'),
  description: z.string().optional(),
  semester: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
  credits: z.number().int().positive().optional().default(3),
  schoolId: z.string().length(24, 'Invalid School ID').optional().nullable(),
  departmentId: z.string().length(24, 'Invalid Department ID').optional().nullable(),
})

export const createAssignmentSchema = z.object({
  title: z.string().min(2, 'Assignment title is required'),
  description: z.string().optional().default(''),
  dueDate: z.string().optional(),
  maxScore: z.number().positive('Max score must be greater than 0'),
})

export const createAnnouncementSchema = z.object({
  courseId: z.string().optional().default('global'),
  message: z.string().min(3, 'Announcement message must be at least 3 characters'),
})

export const updateUserRoleSchema = z.object({
  role: z.enum(['student', 'lecturer', 'dept_head', 'admin'], {
    errorMap: () => ({ message: 'Invalid role specified' }),
  }),
})
