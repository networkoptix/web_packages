import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import staticLang from '@language_static';
import { LayoutStateService } from '@services/layout-state/layout-state.service';

export const incrementUntilUnique = (name: string, existingNames: string[]): string => {
    const translate = LayoutStateService.runInInjectionContext(() => inject(TranslateService));
    const copyString = translate.instant(staticLang.layouts.layoutCopy, { name: '' }).trim();
    const segments = name.split(' ');
    const firstCopySegmentIndex = segments.indexOf(copyString);

    if (firstCopySegmentIndex !== -1) {
        name = segments
            .filter((segment, index) => segment !== copyString || index === firstCopySegmentIndex)
            .join(' ');
    }
    if (!existingNames.includes(name)) {
        return name;
    }

    const escapedName = name.replace(/([!@#$%^&*()_+])/g, '\\$1');
    const nameRegExp = new RegExp(`^${escapedName} `);
    const lastVersion =
        existingNames
            .filter(existingName => nameRegExp.test(existingName))
            .map(existingName => existingName.replace(nameRegExp, ''))
            .filter(nameDiff => !nameDiff.includes(' '))
            .map(nameDiff => parseInt(nameDiff))
            .filter(nameDiff => !isNaN(nameDiff))
            .sort((a, b) => a - b)
            .pop() || 0;

    return `${name} ${lastVersion + 1}`;
};
