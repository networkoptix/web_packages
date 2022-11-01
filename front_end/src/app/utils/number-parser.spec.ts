import { NumberParser } from './number-parser';

describe('NumberParser', () => {
    it('parses ar-EG', () => {
        expect(new NumberParser('ar-EG').parse('١٬٢٣٤٫٥٦'))
            .toEqual(1234.56);
    });

    it('parses zh-Hans-CN-u-nu-hanidec', () => {
        expect(new NumberParser('zh-Hans-CN-u-nu-hanidec').parse('一,二三四.五六'))
            .toEqual(1234.56);
    });

    it('parses en', () => {
        expect(new NumberParser('en').parse('12,345,678.90'))
            .toEqual(12345678.9);
    });

    it('parses de', () => {
        expect(new NumberParser('de').parse('12.345.678,9'))
            .toEqual(12345678.9);
    });

    it('parses en-IN', () => {
        expect(new NumberParser('en-IN').parse('1,23,45,678.9'))
            .toEqual(12345678.9);
    });
});
