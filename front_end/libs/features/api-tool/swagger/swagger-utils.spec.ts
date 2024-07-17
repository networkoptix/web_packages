import { sanitizeCurl } from './swagger-utils';

describe('sanitizeCurl', () => {
    it('should sanitize curl', () => {
        // Arrange
        const initial = `'curl -X 'POST' \\\n  'https://endpoint' \\\n  -H 'accept: */*' \\\n  -H 'Content-Type: application/json' \\\n  -H 'auth' \\\n  -d '{"normalValue":true,"escapedJson":"{\\"allUsers\\": false, \\"authType\\" :\\"authBasicAndDigest\\"}"}'`;
        const expected = `'curl -X 'POST' 'https://endpoint' -H 'accept: */*' -H 'Content-Type: application/json' -H 'auth' -d '{"normalValue":true,"escapedJson":"{\\"allUsers\\": false, \\"authType\\" :\\"authBasicAndDigest\\"}"}'`;

        // Act
        const result = sanitizeCurl(initial);

        // Assert
        expect(result).toEqual(expected);
    });
});
