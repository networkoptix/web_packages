import { TranslateService } from '@ngx-translate/core';
import { MockService } from 'ng-mocks';

import { TextTransformPipe } from './nx-split-text';

describe('TextTransformPipe', () => {
    const pipe = new TextTransformPipe(
        MockService(TranslateService, { instant: text => text })
    );

    it('should split exactly at a space', () => {
        expect(pipe.transform('Network Optix', 7)).toBe('Network<br/> Optix');
    });

    it('should split at closest previous space', () => {
        expect(pipe.transform('Network Optix', 10)).toBe('Network<br/> Optix');
    });
});
