import * as util from './increment-until-unique';

jest.mock('@services/layout-state/layout-state.service', () => ({}));

const getTranslation = (name: string, number?: string): string =>
    number ? `${name} (copy ${number})` : `${name} (copy)`;

describe('incrementUntilUnique', () => {
    beforeEach(() => {
        jest.spyOn(util, 'getTranslatedCopy').mockImplementation(getTranslation);
    });

    it('should return the original name if it is unique', () => {
        const name = 'uniqueName';
        const existingNames: string[] = [];

        const result = util.incrementUntilUnique(name, existingNames);

        expect(result).toBe(name);
    });

    it('should increment the name if it already exists', () => {
        const name = 'duplicateName';
        const existingNames: string[] = ['duplicateName'];

        const result = util.incrementUntilUnique(name, existingNames);

        expect(result).toBe('duplicateName 1');
    });

    it('should handle names with special characters', () => {
        const name = 'name_with_special_chars!@#';
        const existingNames: string[] = ['name_with_special_chars!@#'];

        const result = util.incrementUntilUnique(name, existingNames);

        expect(result).toBe('name_with_special_chars!@# 1');
    });

    it('should handle names with existing versions and skip missing version', () => {
        const name = 'versionedName';
        const existingNames: string[] = ['versionedName', 'versionedName 1', 'versionedName 3'];

        const result = util.incrementUntilUnique(name, existingNames);

        expect(result).toBe('versionedName 4');
    });

    it('should handle names with copy string', () => {
        const name = 'versionedName';
        const existingNames: string[] = ['versionedName', 'versionedName 1', 'versionedName 3'];

        const result = util.incrementUntilUnique(name, existingNames);

        expect(result).toBe('versionedName 4');
    });
});

describe('incrementUntilUniqueCopy', () => {
    beforeEach(() => {
        jest.spyOn(util, 'getTranslatedCopy').mockImplementation(getTranslation);
    });

    it('should handle first unique name', () => {
        const name = 'versionedName';
        const existingNames: string[] = [];

        const result = util.incrementUntilUniqueCopy(name, existingNames);

        expect(result).toBe('versionedName');
    });

    it('should handle second name', () => {
        const name = 'versionedName';
        const existingNames: string[] = ['versionedName'];

        const result = util.incrementUntilUniqueCopy(name, existingNames);

        expect(result).toBe('versionedName (copy)');
    });

    it('should handle names with (copy)', () => {
        const name = 'versionedName';
        const existingNames: string[] = ['versionedName (copy)'];

        const result = util.incrementUntilUniqueCopy(name, existingNames);

        expect(result).toBe('versionedName (copy 2)');
    });

    it('should handle multiple names with (copy 2)', () => {
        const name = 'versionedName';
        const existingNames: string[] = ['versionedName (copy 2)'];

        const result = util.incrementUntilUniqueCopy(name, existingNames);

        expect(result).toBe('versionedName (copy 3)');
    });

    it('should handle names with (copy), (copy 2) string', () => {
        const name = 'versionedName (copy)';
        const existingNames: string[] = [
            'versionedName',
            'versionedName (copy)',
            'versionedName (copy 2)',
        ];

        const result = util.incrementUntilUniqueCopy(name, existingNames);

        expect(result).toBe('versionedName (copy 3)');
    });

    it('should handle different names with (copy), (copy 2) string', () => {
        const name = 'versionedName (copy)';
        const existingNames: string[] = [
            'versioned1Name',
            'versionedName (copy)',
            'versioned1Name (copy 2)',
        ];

        const result = util.incrementUntilUniqueCopy(name, existingNames);

        expect(result).toBe('versionedName (copy 2)');
    });
});
