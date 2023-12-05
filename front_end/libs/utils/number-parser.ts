/**
 *
 * A helper class to parse international formatted numbers into en-US.
 *
 * Source: https://observablehq.com/@mbostock/localized-number-parsing
 */
export class NumberParser {
    private group: RegExp;
    private decimal: RegExp;
    private numeral: RegExp;
    private index: (d: string) => string;

    constructor(locale: string) {
        const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
        const numerals = [
            ...new Intl.NumberFormat(locale, { useGrouping: false }).format(9876543210),
        ].reverse();
        const index = new Map(numerals.map((d, i) => [d, String(i)]));
        this.group = new RegExp(`[${parts.find(d => d.type === 'group').value}]`, 'g');
        this.decimal = new RegExp(`[${parts.find(d => d.type === 'decimal').value}]`);
        this.numeral = new RegExp(`[${numerals.join('')}]`, 'g');
        this.index = d => index.get(d);
    }

    parse(numStr: string): number {
        const parsed = numStr
            .trim()
            .replace(this.group, '')
            .replace(this.decimal, '.')
            .replace(this.numeral, this.index);
        return parsed ? Number(parsed) : NaN;
    }
}
