/**
 * Njala University 5.0 Point Grading Policy Utility (Server-side)
 * Njala University Grading Scale (5.0 Scale):
 * - A: 70% - 100% (GP: 5.0, Classification: Distinction / First Class)
 * - B: 60% - 69%  (GP: 4.0, Classification: Credit / Second Class Upper)
 * - C: 50% - 59%  (GP: 3.0, Classification: Good / Second Class Lower)
 * - D: 45% - 49%  (GP: 2.0, Classification: Pass / Third Class)
 * - E: 40% - 44%  (GP: 1.0, Classification: Bare Pass)
 * - F: 0%  - 39%  (GP: 0.0, Classification: Fail)
 */

export function calculateGrade(score, maxScore) {
  if (score === null || score === undefined || maxScore <= 0) {
    return { letterGrade: 'N/A', gradePoint: 0.0, classification: 'Ungraded', percentage: 0 }
  }

  const percentage = Math.round((score / maxScore) * 100 * 10) / 10

  if (percentage >= 70) {
    return { letterGrade: 'A', gradePoint: 5.0, classification: 'Distinction', percentage }
  }
  if (percentage >= 60) {
    return { letterGrade: 'B', gradePoint: 4.0, classification: 'Credit', percentage }
  }
  if (percentage >= 50) {
    return { letterGrade: 'C', gradePoint: 3.0, classification: 'Good', percentage }
  }
  if (percentage >= 45) {
    return { letterGrade: 'D', gradePoint: 2.0, classification: 'Pass', percentage }
  }
  if (percentage >= 40) {
    return { letterGrade: 'E', gradePoint: 1.0, classification: 'Bare Pass', percentage }
  }
  return { letterGrade: 'F', gradePoint: 0.0, classification: 'Fail', percentage }
}
