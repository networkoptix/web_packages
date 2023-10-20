/**
 * Used in Array.filter to allow only defined or true or non empty objects to pass the filter
 * The same as [].filter(Boolean) but passes the TS type check which would include false and null
 * Added to simplify ts check
 */
export function isDefinedOrTrue<T>(argument: T | never): argument is T {
    return Boolean(argument);
}
