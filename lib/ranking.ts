import { prisma } from '@/lib/prisma'

// A rating counts as submitted once the leader has assigned a stage and rank
// (unrated placeholders use careerStage 0 / performanceRank 999)
export const isSubmittedRating = (rating: { careerStage: number; performanceRank: number }) =>
  rating.careerStage > 0 && rating.performanceRank < 999

// Rank a leader's submitted ratings by their relative order, so gaps left by
// deleted or unassigned employees never skew the result.
// Percentile uses the PERCENTRANK equivalent: ((Total - Rank + 1) - 1) / (Total - 1) * 100
export function rankLeaderRatings<T extends { careerStage: number; performanceRank: number }>(ratings: T[]) {
  const submitted = ratings
    .filter(isSubmittedRating)
    .sort((a, b) => a.performanceRank - b.performanceRank)
  const total = submitted.length

  return submitted.map((rating, index) => {
    const rank = index + 1
    const convertedRank = total - rank + 1
    const percentile = total > 1 ? ((convertedRank - 1) / (total - 1)) * 100 : 100
    return { rating, rank, convertedRank, percentile, total }
  })
}

// Renumber each leader's stored ranks to 1..N (preserving order) after
// employees or assignments have been removed
export async function compactAuditRanks(auditId: string) {
  const leaders = await prisma.auditLeader.findMany({
    where: { auditId },
    include: { ratings: true }
  })

  for (const leader of leaders) {
    for (const { rating, rank } of rankLeaderRatings(leader.ratings)) {
      if (rating.performanceRank !== rank) {
        await prisma.rating.update({
          where: { id: rating.id },
          data: { performanceRank: rank }
        })
      }
    }
  }
}
