/**
 * Sierra Leone Tertiary Grading Policy Helper (Client-side)
 * Standard Sierra Leone Grading Scale:
 * - A: 70% - 100% (GP: 4.0, Distinction)
 * - B: 60% - 69%  (GP: 3.0, Credit)
 * - C: 50% - 59%  (GP: 2.0, Good)
 * - D: 45% - 49%  (GP: 1.0, Pass)
 * - F: 0%  - 44%  (GP: 0.0, Fail)
 */

export function calculateGrade(score, maxScore) {
  if (score === null || score === undefined || score === '' || !maxScore || maxScore <= 0) {
    return {
      letterGrade: 'N/A',
      gradePoint: 0.0,
      classification: 'Pending',
      percentage: 0,
      badgeColor: 'bg-[#f0eded] text-[#44474f] border-[#c4c6d0]',
    }
  }

  const numericScore = Number(score)
  if (isNaN(numericScore)) {
    return {
      letterGrade: 'N/A',
      gradePoint: 0.0,
      classification: 'Invalid',
      percentage: 0,
      badgeColor: 'bg-[#f0eded] text-[#44474f] border-[#c4c6d0]',
    }
  }

  const percentage = Math.round((numericScore / maxScore) * 100 * 10) / 10

  if (percentage >= 70) {
    return {
      letterGrade: 'A',
      gradePoint: 4.0,
      classification: 'Distinction',
      percentage,
      badgeColor: 'bg-[#a0f3d4] text-[#00513e] border-[#086b53]',
    }
  }
  if (percentage >= 60) {
    return {
      letterGrade: 'B',
      gradePoint: 3.0,
      classification: 'Credit',
      percentage,
      badgeColor: 'bg-[#d8e2ff] text-[#001a41] border-[#1f3864]',
    }
  }
  if (percentage >= 50) {
    return {
      letterGrade: 'C',
      gradePoint: 2.0,
      classification: 'Good',
      percentage,
      badgeColor: 'bg-[#ffdcbb] text-[#543100] border-[#dd9235]',
    }
  }
  if (percentage >= 45) {
    return {
      letterGrade: 'D',
      gradePoint: 1.0,
      classification: 'Pass',
      percentage,
      badgeColor: 'bg-[#f0eded] text-[#303030] border-[#747780]',
    }
  }
  return {
    letterGrade: 'F',
    gradePoint: 0.0,
    classification: 'Fail',
    percentage,
    badgeColor: 'bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]',
  }
}
