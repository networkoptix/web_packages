/**
 * This is a readonly tuple of all system versions. Mostly will be used for initial system refactoring before we start narrowing types for system modules.
 */
export const AllSystemVersions = [0, 5.0, 5.1, 5.2] as const;

export type SystemVersion = Readonly<typeof AllSystemVersions>[number];
