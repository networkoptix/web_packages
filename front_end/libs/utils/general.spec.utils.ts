import { log } from 'console';

import { identity, shuffle, zip } from 'lodash-es';

import { alphaNumericSort } from './general';

const logStates = false;

const logWithLabel =
    (label: string) =>
    <T>(val: T): T => {
        if (!logStates) {
            return val;
        }

        log(`${label}: `, JSON.stringify(val, null, 4));
        if (label === 'Expected') {
            log('---');
        }
        return val;
    };
const logExpected = logWithLabel('Expected');
const logActual = logWithLabel('Actual');
const logInput = logWithLabel('Input');
export const expectOrder = (
    label: string,
    expectedOrder: string[],
    initialOrderOrTestRunQty: string[] | number = 10,
    testOrdering: 'ascending' | 'descending' | 'both' = 'both',
): void => {
    const prepare = Array.isArray(initialOrderOrTestRunQty)
        ? () => initialOrderOrTestRunQty
        : shuffle;
    const testRunQty = typeof initialOrderOrTestRunQty === 'number' ? initialOrderOrTestRunQty : 1;
    describe(label, () => {
        const ascendingRuns = ['ascending', 'both'].includes(testOrdering) ? testRunQty : 0;
        for (let i = 0; i < ascendingRuns; i++) {
            const input = prepare(expectedOrder);
            it(`should handle ascending ${JSON.stringify(input)}`, () => {
                expect(logActual(logInput(input).sort(alphaNumericSort(identity)))).toEqual(
                    logExpected(expectedOrder),
                );
            });
        }

        const descendingRuns = ['descending', 'both'].includes(testOrdering) ? testRunQty : 0;
        for (let i = 0; i < descendingRuns; i++) {
            const input = prepare(expectedOrder);
            it(`should handle descending ${JSON.stringify(input)}`, () => {
                expect(logActual(logInput(input).sort(alphaNumericSort(identity, false)))).toEqual(
                    logExpected([...expectedOrder].reverse()),
                );
            });
        }
    });
};
export const generateRandom = (): string[] => {
    const size = 10;
    const charactersFrom = (start: number, qty = size): string[] =>
        Array(qty)
            .fill(start)
            .map((start, index) => String.fromCharCode(start + index));
    const specialCharacters = charactersFrom(33);
    const alphabeticalCharacters = charactersFrom(65);

    const orderedNumbers = Array(size / 5)
        .fill(Math.ceil(Math.random() * 100))
        .map((randomInt, index) => index + randomInt)
        .flatMap(integer => {
            return [`${integer}`, `0${integer}`, `00${integer}`, `000${integer}`, `0000${integer}`];
        });
    const createCopies = (value: string[]): string[] =>
        Array(Math.ceil(Math.random() * 10)).fill(value);
    const segments = zip(
        ...shuffle([
            ...createCopies(specialCharacters),
            ...createCopies(specialCharacters.map(char => char.toUpperCase())),
            ...createCopies(alphabeticalCharacters),
            orderedNumbers,
        ]),
    );
    return segments.map(segment => segment.join(' '));
};
