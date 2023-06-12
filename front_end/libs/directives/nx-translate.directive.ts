import { ChangeDetectorRef, Directive, ElementRef } from '@angular/core';
import { TranslateDirective, TranslateService } from '@ngx-translate/core';
import { isObservable } from 'rxjs';

const isDefined = (value: unknown): boolean => typeof value !== 'undefined' && value !== null;

/**
 * This fixes an issue with the ngx-translate directive where the lastKey was never being set for
 * english or strings without translations.
 *
 * There's currently an open issue for this https://github.com/ngx-translate/core/issues/1416
 *
 * This is a copy of the original directive with modifications to updateValue. There's a chance
 * that updating the libary version could break this.
 */
@Directive({
    selector: '[translate]',
})
export class NxTranslateOverrideDirective extends TranslateDirective {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateValue(key: string, node: any, translations: any): void {
        if (key) {
            if (node.lastKey === key && this.lastParams === this.currentParams) {
                return;
            }

            this.lastParams = this.currentParams;

            const onTranslation = (res: unknown): void => {
                // IMPORTANT: This is the part that we modified from the original code.
                // The lastKey was never being set for english or strings without translations.
                if (res !== key || !node.lastKey) {
                    node.lastKey = key;
                }
                if (!node.originalContent) {
                    node.originalContent = this.getContent(node);
                }
                node.currentValue = isDefined(res) ? res : node.originalContent || key;
                // we replace in the original content to preserve spaces that we might have trimmed
                this.setContent(
                    node,
                    this.key
                        ? node.currentValue
                        : node.originalContent.replace(key, node.currentValue),
                );
                this.ref.markForCheck();
            };

            if (isDefined(translations)) {
                const res = this.translateLocalService.getParsedResult(
                    translations,
                    key,
                    this.currentParams,
                );
                if (isObservable(res)) {
                    res.subscribe({ next: onTranslation });
                } else {
                    onTranslation(res);
                }
            } else {
                this.translateLocalService.get(key, this.currentParams).subscribe(onTranslation);
            }
        }
    }

    constructor(
        private translateLocalService: TranslateService,
        element: ElementRef,
        private ref: ChangeDetectorRef,
    ) {
        super(translateLocalService, element, ref);
    }
}
