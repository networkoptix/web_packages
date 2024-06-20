import { getIcon } from '../';

import { nxIconBackupPlaceholder } from './generated';

describe('getIcon', () => {
    it('should dynamically import icon', async () => {
        const icon = getIcon('BackupPlaceholder');
        expect(icon).toBeInstanceOf(Promise);
        expect(await icon).toEqual(nxIconBackupPlaceholder);
    });
});
