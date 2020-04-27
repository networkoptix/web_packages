/**
 * Compares to semver strings, returns 1 if versionA is newer than versionB, -1 if inverse is true, and 0 if they're the same.
 * @param versionA
 * @param versionB
 */
export const compareSemver =  (versionA: string, versionB: string) => {
    const [parsedA, parsedB] = [versionA, versionB].map(version => version.split('.').map(numStr => parseInt(numStr)));
    for (let i = 0; i < 3; i++) {
        const a = parsedA[i];
        const b = parsedB[i];
        if (a > b || !isNaN(a) && isNaN(b)) return 1;
        if (b > a || isNaN(a) && !isNaN(b)) return -1;
    }
    return 0;
}