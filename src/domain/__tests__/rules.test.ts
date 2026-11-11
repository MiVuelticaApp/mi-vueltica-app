import {
  anonymizeOnDelete, applyPoints, canModerate, decideNew, decideReported, isMinorityVote, isPublishablePrice, isVisibleTo,
  levelForPoints, needsReview, outcomeOfVerifications, pinOpacity, reportsHide, reputationFor, tierForPrice, voteWeight, votesNeeded,
} from '../rules';

describe('price tiers', () => {
  it.each([
    [0, 'gratis'],
    [1, 'hasta2500'],
    [2500, 'hasta2500'],
    [2501, 'hasta5000'],
    [5000, 'hasta5000'],
    [5001, null],
    [-1, null],
  ])('tierForPrice(%s) = %s', (price, tier) => {
    expect(tierForPrice(price)).toBe(tier);
  });
  it('rejects prices over 5.000 at submit', () => {
    expect(isPublishablePrice(5000)).toBe(true);
    expect(isPublishablePrice(5001)).toBe(false);
  });
  it('fades pins by tier but never when selected', () => {
    expect(pinOpacity('gratis', false)).toBe(1);
    expect(pinOpacity('hasta2500', false)).toBe(0.75);
    expect(pinOpacity('hasta5000', false)).toBe(0.5);
    expect(pinOpacity('hasta5000', true)).toBe(1);
  });
});

describe('votes and moderation', () => {
  it('needs 5 votes below level 3 and 3 at level 3+', () => {
    expect(votesNeeded(1)).toBe(5);
    expect(votesNeeded(2)).toBe(5);
    expect(votesNeeded(3)).toBe(3);
    expect(votesNeeded(5)).toBe(3);
  });
  it('lets level 3+ moderate; level 5 counts double', () => {
    expect(canModerate(2)).toBe(false);
    expect(canModerate(3)).toBe(true);
    expect(voteWeight(4)).toBe(1);
    expect(voteWeight(5)).toBe(2);
  });
  it('decides by majority once enough votes are in', () => {
    expect(decideNew({ votesFor: 2, votesAgainst: 0, votesNeeded: 3 })).toBe('pending');
    expect(decideNew({ votesFor: 3, votesAgainst: 0, votesNeeded: 3 })).toBe('publish');
    expect(decideNew({ votesFor: 1, votesAgainst: 2, votesNeeded: 3 })).toBe('reject');
    expect(decideNew({ votesFor: 3, votesAgainst: 2, votesNeeded: 5 })).toBe('publish');
    expect(decideReported({ votesFor: 2, votesAgainst: 1, votesNeeded: 3 })).toBe('hide');
    expect(decideReported({ votesFor: 1, votesAgainst: 2, votesNeeded: 3 })).toBe('keep');
  });
  it('detects votes against the majority', () => {
    expect(isMinorityVote('against', { votesFor: 3, votesAgainst: 1 })).toBe(true);
    expect(isMinorityVote('for', { votesFor: 3, votesAgainst: 1 })).toBe(false);
    expect(isMinorityVote('for', { votesFor: 1, votesAgainst: 1 })).toBe(false);
  });
});

describe('verification and reports', () => {
  it('updates the tier after 3 matching verifications', () => {
    const v = (pricePaid: any) => ({ stillHappening: 'si' as const, pricePaid });
    expect(outcomeOfVerifications([v('menos2500'), v('menos2500')])).toEqual({});
    expect(outcomeOfVerifications([v('menos2500'), v('menos2500'), v('menos2500')])).toEqual({ priceTier: 'hasta2500' });
  });
  it('hides when 3 verifications report more than 5.000 or that it is gone', () => {
    const v = (pricePaid: any) => ({ stillHappening: 'si' as const, pricePaid });
    expect(outcomeOfVerifications([v('mas5000'), v('mas5000'), v('mas5000')]).hidden).toBe(true);
    const gone = { stillHappening: 'no' as const };
    expect(outcomeOfVerifications([gone, gone, gone]).hidden).toBe(true);
    expect(outcomeOfVerifications([gone, gone]).hidden).toBeUndefined();
  });
  it('hides after 3 matching reports only', () => {
    expect(reportsHide([{ reason: 'spam' }, { reason: 'spam' }]).hide).toBe(false);
    expect(reportsHide([{ reason: 'spam' }, { reason: 'otro' }, { reason: 'spam' }]).hide).toBe(false);
    const r = reportsHide([{ reason: 'noGratis' }, { reason: 'noGratis' }, { reason: 'noGratis' }]);
    expect(r.hide).toBe(true);
    expect(r.topReason).toBe('noGratis');
  });
  it('flags needs-review after 72 hours', () => {
    const now = new Date('2026-10-20T10:00:00-06:00');
    expect(needsReview('2026-10-18T10:00:00-06:00', now)).toBe(false);
    expect(needsReview('2026-10-16T10:00:00-06:00', now)).toBe(true);
    expect(needsReview(undefined, now)).toBe(false);
  });
});

describe('levels and points', () => {
  it('maps points to levels', () => {
    expect(levelForPoints(0).number).toBe(1);
    expect(levelForPoints(49).number).toBe(1);
    expect(levelForPoints(50).number).toBe(2);
    expect(levelForPoints(172).number).toBe(3);
    expect(levelForPoints(200).number).toBe(4);
    expect(levelForPoints(999).number).toBe(5);
  });
  it('reports 28 points to go for 172 points (design sample)', () => {
    const r = reputationFor(172);
    expect(r.level.name).toBe('De confianza');
    expect(r.pointsToNext).toBe(28);
    expect(r.nextLevel?.name).toBe('Guía local');
  });
  it('never drops under zero', () => {
    expect(applyPoints(5, -10)).toBe(0);
    expect(applyPoints(5, 10)).toBe(15);
  });
});

describe('visibility and account deletion', () => {
  it('shows pending only to the author and moderators', () => {
    const v = { status: 'pendiente' as const, authorId: 'u1' };
    expect(isVisibleTo(v, null, 1)).toBe(false);
    expect(isVisibleTo(v, 'u2', 1)).toBe(false);
    expect(isVisibleTo(v, 'u1', 1)).toBe(true);
    expect(isVisibleTo(v, 'u2', 3)).toBe(true);
    expect(isVisibleTo({ status: 'publicada', authorId: 'u1' }, null, 1)).toBe(true);
  });
  it('credits published vuelticas to Anónimo on account deletion', () => {
    expect(anonymizeOnDelete({ authorId: 'u1', authorName: 'Ana' }, 'u1')).toEqual({ authorId: null, authorName: 'Anónimo' });
    expect(anonymizeOnDelete({ authorId: 'u2', authorName: 'Luis' }, 'u1').authorName).toBe('Luis');
  });
});
