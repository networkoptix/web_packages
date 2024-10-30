import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import staticLang from '@language_static';
import { LayoutStateService } from '@services/layout-state/layout-state.service';

export const getTranslatedCopy = (name: string, number?: string): string => {
    const translate = LayoutStateService.runInInjectionContext(() => inject(TranslateService));

    if (number) {
        return translate.instant(staticLang.layouts.layoutCopyN, { name, number }).trim();
    }
    return translate.instant(staticLang.layouts.layoutCopy, { name }).trim();
};

export const regexSafe = (name: string): string => name.replace(/([!@#$%^&*()_+])/g, '\\$1');

export const incrementUntilUnique = (name: string, existingNames: string[]): string => {
    if (!existingNames.includes(name)) {
        return name;
    }

    const nameRegExp = new RegExp(`^${regexSafe(name)} `);
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

export const incrementUntilUniqueCopy = (name: string, existingNames: string[]): string => {
    if (!existingNames.length) {
        return name;
    }

    const copyFirstReg = regexSafe(getTranslatedCopy('', '0')).replace(/ 0|0 /, '(?<noNumber>)');
    const copyNthReg = regexSafe(getTranslatedCopy('', '0')).replace('0', '(?<number>.*?[0-9])');
    const copyRegEx = `${copyFirstReg}$|${copyNthReg}$`;

    const cleanName = name.replace(new RegExp(copyRegEx), '').trim();

    const nameRegExp = new RegExp(`${regexSafe(cleanName)}.*(${copyRegEx})`);
    const lastVersion =
        existingNames
            .map(existingName => nameRegExp.exec(existingName))
            .map(match => {
                if (match?.groups) {
                    if (match?.groups.noNumber !== undefined) {
                        return 1;
                    } else {
                        return parseInt(match?.groups.number);
                    }
                }
                return 0;
            })
            .filter(number => !isNaN(number))
            .sort((a, b) => a - b)
            .pop() || 0;

    if (lastVersion > 0) {
        return getTranslatedCopy(cleanName, (lastVersion + 1).toString());
    } else {
        return getTranslatedCopy(cleanName);
    }
};
