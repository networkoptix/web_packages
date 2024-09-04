This library project might be temporary. Currently works for running lint and test targets; build
target will probably need to be handled by making each component into a library which would be
a lot of changes in the file structures which we probably want to avoid for now as not to clutter
git history.

---
# DIALOGS

Dialogs are handled by the `NxDialogsService` and the [Angular CDK](https://material.angular.io/cdk/dialog/overview).

## General behavior

1. If enabled input(s) are present, focus the first one on dialog open
2. There are three ways for a user to close the dialog, all of which can be removed

    a. Clicking outside the dialog or pressing <kbd>Esc</kbd> ("quick close")

    b. The X button in the header

    c. The "Cancel" button in the footer

3. If a dialog has multiple stages, disable quick close after the first stage

4. When an asynchronous action is initiated with the action button in the footer, the dialog should enter a busy state

    a. The three ways of closing the dialog above should be disabled

    b. All inputs should be disabled

5. If the action errors and there is only one input, focus it if that does not block errors

## Creating a new dialog

Example: a new dialog to reset a camera

**1\. Add the input/output types for the dialog** in `dialogs.types.ts` under the apppropriate section.

```ts
export type ResetCamera = DialogType<NxCamera, boolean>;

/* What DialogType will create
interface ResetCamera {
    data: NxCamera;
    return: boolean;
} */
```

**2\. Create the dialog component**

```ts
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
...
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import type { ResetCamera as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
...

@Component({ ... })
export class NxResetCameraModalContent extends ModalBase<DT['return']> {
    // What will happen when the action button is clicked (see create-async-action.ts)
    resetCameraAction = createAsyncAction({
        action: () => { ... },
        success: res => { ... },
    });

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) camera: DT['data'],
    ) {
        super(dialogRef);
    }

    ...
}
```

`ModalBase` provides properties and methods for managing dialogs:

- `closable` to determine when the dialog can be closed with the X button
- `busy` and `busy$$` to track the busy state of the dialog
- An `effect` which syncs `busy$$` to `dialogRef.disbleClose` (the property that controls quick close)
- `lock()` and `unlock()` for manual state management
- `close()` to close the dialog

```html
<div class="nx-modal__header">
    <h1
        class="nx-modal__header-title"
        translate
    >
        Reset Camera
    </h1>
    @if (closable) {
        <button
            type="button"
            class="nx-modal__header-close-btn"
            data-dismiss="modal"
            aria-label="Close"
            (click)="close()"
        ></button>
    }
</div>
<!-- <form> is required for the action button to fire on Enter key -->
<form class="nx-modal__content">
    <div class="nx-modal__body">
        <!-- Body content here -->
    </div>
    <!-- Buttons should be right-aligned by default, with the action button on the right -->
    <div class="nx-modal__footer">
        <!-- type="button" is required on non-submit buttons to prevent
        "Form submission canceled because the form is not connected" warnings -->
        <button
            type="button"
            class="btn btn-default"
            [disabled]="busy"
            (click)="close()"
        >
            Cancel
        </button>
        <!-- If the dialog action isn't async and doesn't require validation
        a normal <button> can be used here instead -->
        <nx-async-action-button
            [action]="resetCameraAction"
            [(busy)]="busy"
        >
            <span translate>Reset</span>
        </nx-async-action-button>
    </div>
</form>
```

```scss
@use '../nx-modal'; // Default styling for modals
```

**3\. Add the method to open the dialog**

If you don't require any special behavior (which will usually be the case), use the `dialogV2Factory`, which will create the method for you.

```ts
...
import * as Dt from './dialogs.types';
...

export class NxDialogsService {
    ...
    resetCamera = this.dialogV2Factory<Dt.ResetCamera>(
        () =>
            import('./reset-camera/reset-camera.component').then(
                m => m.NxResetCameraModalContent,
            ),
        { /* Normal config options here */ },
    );
    ...
}
```

If you do require special behavior for whatever reason, you can use `openV2` directly

```ts
    ...
    async resetCamera(camera: Dt.ResetCamera['data']): Promise<Dt.ResetCamera['return']> {
        const component = await import('./reset-camera/reset-camera.component').then(
            m => m.NxResetCameraModalContent,
        );
        /* Do custom config stuff here, after import and before open  */
        const dialogConfig: DialogConfig<Dt.ResetCamera['data']> = {
            width: camera.maxFps > 60 ? '300px' : '200px'
            data: camera,
        };
        /* */
        return this.openV2(component, dialogConfig);
    }
    ...
```

The config options for the Angular CDK are specified [here](https://material.angular.io/cdk/dialog/api#DialogConfig). The most used:

- `autoFocus`: A CSS selector for what to focus when the dialog opens. This will fail if the target is behind a `*ngIf`/`@if`

- `disableClose`: Whether to disable quick close

- `height` / `width`: Dimensions for the dialog. Max/min are also available
