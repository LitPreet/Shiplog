// Per-account caps: a cheap guard against abuse (someone scripting thousands
// of projects). On a paid plan these would come from the subscription.
export const MAX_PROJECTS = 5;
export const MAX_ORIGINS = 10;
