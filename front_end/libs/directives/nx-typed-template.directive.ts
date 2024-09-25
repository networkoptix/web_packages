import { Directive, Input } from '@angular/core';

@Directive({ selector: 'ng-template[typedTemplate]', standalone: true })
export class NxTypedTemplateDirective<TypeToken> {
    @Input('typedTemplate')
    typeToken: TypeToken;

    static ngTemplateContextGuard<TypeToken>(
        _: NxTypedTemplateDirective<TypeToken>,
        ctx: unknown,
    ): ctx is TypeToken {
        return true;
    }
}
