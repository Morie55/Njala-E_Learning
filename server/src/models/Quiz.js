import mongoose from 'mongoose'

const optionSchema = new mongoose.Schema({
  text:      { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
}, { _id: true })

const questionSchema = new mongoose.Schema(
  {
    quizId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    /** mcq | truefalse | short_answer | essay */
    type:    { type: String, enum: ['mcq', 'truefalse', 'short_answer', 'essay'], required: true },
    text:    { type: String, required: true, trim: true },
    /** For MCQ: 2-6 options */
    options: { type: [optionSchema], default: [] },
    /** For truefalse: "true" | "false". For short_answer: expected answer. null for essay. */
    correctAnswer: { type: String, default: null },
    points:  { type: Number, required: true, min: 1, default: 1 },
    /** Display order within quiz */
    order:   { type: Number, default: 0 },
    explanation: { type: String, default: '' },
  },
  { timestamps: true }
)

export const Question = mongoose.models.Question || mongoose.model('Question', questionSchema)

const quizSchema = new mongoose.Schema(
  {
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    /** Duration in minutes. null = untimed */
    duration:    { type: Number, default: null, min: 1 },
    /** Maximum attempts allowed per student. null = unlimited */
    maxAttempts: { type: Number, default: 1, min: 1 },
    /** Passing mark as percentage (0-100) */
    passMark:    { type: Number, default: 50, min: 0, max: 100 },
    /** 'sequential' | 'random' */
    questionOrder: { type: String, enum: ['sequential', 'random'], default: 'sequential' },
    /** When quiz becomes available */
    startAt:     { type: Date, default: null },
    /** When quiz closes */
    endAt:       { type: Date, default: null },
    /** 'draft' | 'published' | 'closed' */
    status:      { type: String, enum: ['draft', 'published', 'closed'], default: 'draft', index: true },
    /** Show correct answers to student after submission */
    showAnswers: { type: Boolean, default: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

quizSchema.index({ courseId: 1, status: 1 })

export const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema)

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** { questionId: string, answer: string } */
    answers:   { type: mongoose.Schema.Types.Mixed, default: {} },
    score:     { type: Number, default: null },
    maxScore:  { type: Number, default: 0 },
    /** Percentage score */
    pct:       { type: Number, default: null },
    passed:    { type: Boolean, default: null },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    timeTaken:   { type: Number, default: null },  // seconds
    /** 'in_progress' | 'submitted' | 'graded' */
    status:    { type: String, enum: ['in_progress', 'submitted', 'graded'], default: 'in_progress' },
    /** Manual grading notes for short_answer/essay */
    gradingNotes: { type: String, default: '' },
  },
  { timestamps: true }
)

quizAttemptSchema.index({ quizId: 1, studentId: 1 })

export const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', quizAttemptSchema)
