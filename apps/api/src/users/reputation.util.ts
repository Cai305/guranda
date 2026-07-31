// Shared between UsersService (live activity formula) and the usernames
// module (reputation-snapshot mechanic) — kept standalone so neither module
// needs to import the other just for this lookup table.
export function levelForSubscribers(subscribers: number): string {
  return subscribers >= 100000
    ? 'Mega Influencer'
    : subscribers >= 10000
      ? 'Macro'
      : subscribers >= 1000
        ? 'Midtier'
        : subscribers >= 100
          ? 'Micro'
          : 'Nano';
}
