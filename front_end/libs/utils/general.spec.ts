import { expectOrder, generateRandom } from './general.spec.utils';

/**
 * New global sorting spec here:
 *
 * https://networkoptix.atlassian.net/wiki/spaces/FS/pages/3399843892/Global+sorting
 *
 * The test cases in the first section are based on the spec.
 */

describe('alphaNumericSort', () => {
    const describe = expectOrder;
    /**
     * Spec: https://networkoptix.atlassian.net/wiki/spaces/FS/pages/3399843892/Sorting+rules?focusedCommentId=3423240212#Mixed-alphanumeric-characters
     *
     * Implementation is consistent with the spec and thick client.
     */
    describe('Mixed alphanumeric characters', [
        'a0',
        'a1',
        'a1b',
        'a2',
        'a10',
        'a10b',
        'a20',
        'abc',
    ]);

    /**
     * Spec: https://networkoptix.atlassian.net/wiki/spaces/FS/pages/3399843892/Sorting+rules?focusedCommentId=3423240212#Leading-zeros
     *
     * Implementation is consistent with the spec and thick client.
     */
    describe('Leading zeros', ['0002', '02', '2', '002a', '02a', '2a', 'a0002', 'a02', 'a2']);

    /**
     * Spec: https://networkoptix.atlassian.net/wiki/spaces/FS/pages/3399843892/Sorting+rules?focusedCommentId=3423240212#Special-characters
     *
     * Implementation matches with the spec.
     *
     * Thick client doesn't seem to match the spec, at least on layouts sorting.
     */
    describe('Special Characters', [
        'file-',
        'file 2',
        'file!2',
        'file#2',
        'file@2',
        'file_2',
        'file1',
        'file-1',
        'file0002',
        'file002',
        'file02',
        'file2',
        'file-2',
        'file--2',
        'filea',
    ]);

    /**
     * Spec: https://networkoptix.atlassian.net/wiki/spaces/FS/pages/3399843892/Sorting+rules?focusedCommentId=3423240212#Different-alphabetic-parts
     *
     * Implementation matches spec and thick client.
     */
    describe('Different alphabetic parts', [
        'abc1edf',
        'Abc2',
        'Abc10',
        'abc10',
        'Abc10def',
        'abc20',
    ]);

    /**
     * Additional test cases
     */

    describe('Leading zeros with letters', ['a0002', 'a02', 'a2', 'a002a', 'a2a']);

    describe('Leading zeros without letters', ['0002', '02', '2']);

    describe('Leading zeros letters before and after', ['a0002a', 'a02a', 'a2a']);

    describe('Leading zeros identical sorted alphabetically', ['a0002', 'a02', 'a2']);

    describe('Leading dashes', ['2', '-2', '--2']);

    describe('Leading dashes letters before and after', ['a2a', 'a-2a', 'a--2a']);

    describe('Numeric strings', ['100', '2000', '5000', '200000', '10000000']);

    describe('Numeric string letters before and after', [
        'a100a',
        'a2000a',
        'a5000a',
        'a200000a',
        'a10000000a',
    ]);

    describe('Sorting ignores case unless strings match exactly then upper first', [
        'A',
        'a',
        'AA',
        'Aa',
        'AA1',
        'aa2',
        'Aa02a',
        'Aa2a',
        'aa02a',
    ]);

    describe('Sort spaces first', ['file 1', 'file 2, file1', 'file2']);

    describe('Special character unicode order', ['!', '#', '@', '_']);

    for (let i = 1; i <= 100; i++) {
        describe(`Generated tests: ${i}`, generateRandom(), 1);
    }
});
