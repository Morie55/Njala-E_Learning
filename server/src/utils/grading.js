/**
 * Sierra Leone University Grading Policy Utility
 * Standard Sierra Leone Tertiary Grading Scale:
 * - A: 70% - 100% (GP: 4.0, Classification: Excellent / Distinction)
 * - B: 60% - 69%  (GP: 3.0, Classification: Very Good / Credit)
 * - C: 50% - 59%  (GP: 2.0, Classification: Satisfactory / Good)
 * - D: 45% - 49%  (GP: 1.0, Classification: Pass)
 * - F: 0%  - 44%  (GP: 0.0, Classification: Fail)
 */

export function calculateGrade(score, maxScore) {
  if (score === null || score === undefined || maxScore <= 0) {
    return { letterGrade: 'N/A', gradePoint: 0.0, classification: 'Ungraded', percentage: 0 }
  }

  const percentage = Math.round((score / maxScore) * 100 * 10) / 10

  if (percentage >= 70) {
    return { letterGrade: 'A', gradePoint: 4.0, classification: 'Distinction', percentage }
  }
  if (percentage >= 60) {
    return { letterGrade: 'B', gradePoint: 3.0, classification: 'Credit', percentage }
  }
  if (percentage >= 50) {
    return { letterGrade: 'C', gradePoint: 2.0, classification: 'Good', percentage }
  }
  if (percentage >= 45) {
    return { letterGrade: 'D', gradePoint: 1.0, classification: 'Pass', percentage }
  }
  return { letterGrade: 'F', gradePoint: 0.0, classification: 'Fail', percentage }
}
