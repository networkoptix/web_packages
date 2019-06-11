import { Directive, ElementRef, HostListener, Input }              from '@angular/core';
import { FormControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';

@Directive({
    selector : '[checkComplexity]',
    providers:
            [
                {
                    provide : NG_VALIDATORS,
                    useValue:
                    CheckComplexityValidator,
                    multi   : true
                }
            ]
})

export class CheckComplexityValidator implements Validator {

    public validate(c: FormControl) {
        debugger;
        const classes = [
            '[0-9]+',
            '[a-z]+',
            '[A-Z]+',
            '[\\W_]+'
        ];

        let classesCount = 0;

        for (const classRegex of classes) {
            if (new RegExp(classRegex).test(c.value)) {
                classesCount++;
            }
        }

        if (classesCount >= 2) {
            return null;
        } else {
            return { weak: true };
        }
    }
}
