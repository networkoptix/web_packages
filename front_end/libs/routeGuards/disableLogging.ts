import { ActivatedRouteSnapshot, Route, Routes } from '@angular/router';

const setLogging = (logging: boolean, path?: string) => (route?: ActivatedRouteSnapshot) => {
    if (!logging) {
        console.info(
            `[setLogging]: Disabling logging while route ${path} is activated. Use window.disableConsole = false; to turn it back on`,
        );
    }
    window.disableConsole = !logging;

    if (logging) {
        console.info(`[setLogging]: Re-enabling logging since route ${path} is deactivated`);
    }

    return true;
};
const disableLogging = ({ canActivate = [], canDeactivate = [], ...route }: Route): Route => ({
    ...route,
    canActivate: [...canActivate, setLogging(false, route.path)],
    canDeactivate: [...canDeactivate, setLogging(true, route.path)],
});

export const disableLoggingHandler = (routes: Routes): Routes =>
    routes.map(route => {
        const disabled =
            !!route.data && 'disableLogging' in route.data && !!route.data.disableLogging;

        if (disabled) {
            return disableLogging(route);
        }

        return {
            ...route,
            children: route.children && disableLoggingHandler(route.children),
        };
    });
