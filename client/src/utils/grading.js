/**
 * Njala University 5.0 Point Grading Scale Policy Helper (Client-side)
 * Njala University Grading Scale (5.0 Scale):
 * - A: 70% - 100% (GP: 5.0, Distinction / First Class)
 * - B: 60% - 69%  (GP: 4.0, Credit / Second Class Upper)
 * - C: 50% - 59%  (GP: 3.0, Good / Second Class Lower)
 * - D: 45% - 49%  (GP: 2.0, Pass / Third Class)
 * - E: 40% - 44%  (GP: 1.0, Pass / Bare Pass)
 * - F: 0%  - 39%  (GP: 0.0, Fail)
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
      gradePoint: 5.0,
      classification: 'Distinction',
      percentage,
      badgeColor: 'bg-[#a0f3d4] text-[#00513e] border-[#086b53]',
    }
  }
  if (percentage >= 60) {
    return {
      letterGrade: 'B',
      gradePoint: 4.0,
      classification: 'Credit',
      percentage,
      badgeColor: 'bg-[#d8e2ff] text-[#001a41] border-[#1f3864]',
    }
  }
  if (percentage >= 50) {
    return {
      letterGrade: 'C',
      gradePoint: 3.0,
      classification: 'Good',
      percentage,
      badgeColor: 'bg-[#ffdcbb] text-[#543100] border-[#dd9235]',
    }
  }
  if (percentage >= 45) {
    return {
      letterGrade: 'D',
      gradePoint: 2.0,
      classification: 'Pass',
      percentage,
      badgeColor: 'bg-[#f0eded] text-[#303030] border-[#747780]',
    }
  }
  if (percentage >= 40) {
    return {
      letterGrade: 'E',
      gradePoint: 1.0,
      classification: 'Bare Pass',
      percentage,
      badgeColor: 'bg-[#f6f3f2] text-[#44474f] border-[#c4c6d0]',
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
