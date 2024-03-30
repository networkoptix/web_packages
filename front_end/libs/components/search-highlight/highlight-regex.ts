import { escapeRegExp } from 'lodash-es';

/** Generate space-separated case insensitive highlighting regex for `<nx-search-highlight>` */
export function highlightRegex(search: string): RegExp | null {
    search = search.trim();
    if (!search) {
        return null;
    }
    const searches = search
        .split(' ')
        .filter(Boolean)
        .map(s => `(?:${escapeRegExp(s)})`)
        .join('|');
    return new RegExp(`(${searches})`, 'i');
}
