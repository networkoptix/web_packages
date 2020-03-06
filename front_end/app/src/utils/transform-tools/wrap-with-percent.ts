export const wrapWithPercent = (
    numerator: number, denominator: number, wrappedValue: string | number, precision = 2
) => {
    const percentage = (numerator / denominator) * 100;
    return `${precision ? percentage.toPrecision(precision) : percentage}% (${wrappedValue})`;
};
