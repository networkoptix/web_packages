import { Input } from '@angular/core';

import { IBool, CoercedBoolInput } from './ibool';

class TestHostComponent {
    @IBool() @Input() booleanProperty: CoercedBoolInput;
}

describe('@IBool()', () => {
    let component: TestHostComponent;

    beforeEach(() => {
        component = new TestHostComponent();
    });

    it('should not assign a default value', () => {
        expect(component.booleanProperty).toBeUndefined();
    });

    it('should coerce emtpy string to true', () => {
        component.booleanProperty = '';
        expect(component.booleanProperty).toBeTrue();
    });

    it('should let boolean true pass through', () => {
        component.booleanProperty = true;
        expect(component.booleanProperty).toBeTrue();
    });

    it('should let boolean false pass through', () => {
        component.booleanProperty = false;
        expect(component.booleanProperty).toBeFalse();
    });
});
