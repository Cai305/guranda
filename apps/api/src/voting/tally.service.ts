import { Injectable } from '@nestjs/common';

type Candidate = { id: string; name: string; slateName: string | null };
type PositionForTally = { votingType: string; seats: number; candidates: Candidate[] };
type VoteForTally = { selection: any };

export type TallyResult = {
  votingType: string;
  totalVotes: number;
  candidates: Array<{ id: string; name: string; slateName: string | null; count: number; pct: number }>;
  winners: string[];
  rounds?: Array<{ counts: Record<string, number>; eliminated: string | null }>;
};

// Pure tally functions — one per voting mechanic. No DB access, so these
// are trivial to unit test and safe to call from a public /results route.
@Injectable()
export class TallyService {
  tally(position: PositionForTally, votes: VoteForTally[]): TallyResult {
    switch (position.votingType) {
      case 'SINGLE_CHOICE':
        return this.tallyChoice(position, votes, (s) => (s.candidateId ? [s.candidateId] : []));
      case 'MULTI_SELECT':
        return this.tallyChoice(position, votes, (s) => (Array.isArray(s.candidateIds) ? s.candidateIds : []));
      case 'WEIGHTED':
        return this.tallyWeighted(position, votes);
      case 'RANKED_CHOICE':
        return this.tallyRanked(position, votes);
      default:
        throw new Error(`Unknown voting type: ${position.votingType}`);
    }
  }

  private tallyChoice(
    position: PositionForTally,
    votes: VoteForTally[],
    pick: (selection: any) => string[],
  ): TallyResult {
    const counts: Record<string, number> = Object.fromEntries(position.candidates.map((c) => [c.id, 0]));
    for (const vote of votes) {
      for (const candidateId of pick(vote.selection)) {
        if (candidateId in counts) counts[candidateId]++;
      }
    }
    const totalVotes = votes.length;
    const candidates = position.candidates
      .map((c) => ({
        id: c.id,
        name: c.name,
        slateName: c.slateName,
        count: counts[c.id],
        pct: totalVotes > 0 ? Math.round((counts[c.id] / totalVotes) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
    const topCount = candidates[0]?.count ?? 0;
    const winners =
      topCount > 0
        ? candidates.filter((c) => c.count === topCount).slice(0, position.seats).map((c) => c.id)
        : [];
    return { votingType: position.votingType, totalVotes, candidates, winners };
  }

  private tallyWeighted(position: PositionForTally, votes: VoteForTally[]): TallyResult {
    const weights: Record<string, number> = Object.fromEntries(position.candidates.map((c) => [c.id, 0]));
    for (const vote of votes) {
      const allocations = vote.selection?.allocations ?? {};
      for (const [candidateId, amount] of Object.entries(allocations)) {
        if (candidateId in weights && typeof amount === 'number' && amount > 0) {
          weights[candidateId] += amount;
        }
      }
    }
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const candidates = position.candidates
      .map((c) => ({
        id: c.id,
        name: c.name,
        slateName: c.slateName,
        count: weights[c.id],
        pct: totalWeight > 0 ? Math.round((weights[c.id] / totalWeight) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
    const winners = candidates.filter((c) => c.count > 0).slice(0, position.seats).map((c) => c.id);
    return { votingType: position.votingType, totalVotes: votes.length, candidates, winners };
  }

  // Instant-runoff: repeatedly count each ballot's highest-ranked
  // still-standing candidate; a majority wins outright; otherwise the
  // last-place candidate is eliminated and ballots redistribute to their
  // next preference. Ballots that run out of ranked preferences simply
  // stop contributing (exhausted ballot), same as a real IRV count.
  private tallyRanked(position: PositionForTally, votes: VoteForTally[]): TallyResult {
    const ballots: string[][] = votes.map((v) => {
      const ranked = Array.isArray(v.selection?.rankedCandidateIds) ? v.selection.rankedCandidateIds : [];
      const validIds = new Set(position.candidates.map((c) => c.id));
      return ranked.filter((id: string) => validIds.has(id));
    });

    let remaining = new Set(position.candidates.map((c) => c.id));
    const rounds: TallyResult['rounds'] = [];
    let winner: string | null = null;

    while (remaining.size > 0 && !winner) {
      const counts: Record<string, number> = Object.fromEntries([...remaining].map((id) => [id, 0]));
      let ballotsCounted = 0;
      for (const ballot of ballots) {
        const choice = ballot.find((id) => remaining.has(id));
        if (choice) {
          counts[choice]++;
          ballotsCounted++;
        }
      }

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const [leaderId, leaderCount] = sorted[0] ?? [null, 0];
      if (leaderId && ballotsCounted > 0 && leaderCount / ballotsCounted > 0.5) {
        winner = leaderId;
        rounds.push({ counts, eliminated: null });
        break;
      }
      if (remaining.size <= 1) {
        winner = leaderId;
        rounds.push({ counts, eliminated: null });
        break;
      }

      const lowestCount = sorted[sorted.length - 1][1];
      const eliminated = sorted.filter(([, c]) => c === lowestCount).map(([id]) => id).pop()!;
      remaining.delete(eliminated);
      rounds.push({ counts, eliminated });
    }

    const finalCounts = rounds[rounds.length - 1]?.counts ?? {};
    const totalVotes = votes.length;
    const candidates = position.candidates
      .map((c) => ({
        id: c.id,
        name: c.name,
        slateName: c.slateName,
        count: finalCounts[c.id] ?? 0,
        pct: totalVotes > 0 ? Math.round(((finalCounts[c.id] ?? 0) / totalVotes) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return { votingType: position.votingType, totalVotes, candidates, winners: winner ? [winner] : [], rounds };
  }
}
