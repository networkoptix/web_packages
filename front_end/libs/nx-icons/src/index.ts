import { memoize } from 'lodash-es';

import type { NxIconsBase, NxIconNames } from './types';

export const getIcon = memoize(
    <IconName extends NxIconNames>(name: IconName): Promise<NxIconsBase[`nxIcon${IconName}`]> =>
        import('./lib/generated').then(m => m[`nxIcon${name}`]),
);

export const extractAllColors = memoize(async (): Promise<string[]> => {
    const allIcons = await import('./lib/generated');
    const allSvgData = Object.values(allIcons)
        .map(({ data }) => data)
        .join('');
    const tempElement = document.createElement('div');
    tempElement.innerHTML = allSvgData;
    const colors = new Set<string>();
    tempElement.querySelectorAll('[fill], [stroke]').forEach(el => {
        const fill = el.getAttribute('fill');
        const stroke = el.getAttribute('stroke');
        if (fill) {
            colors.add(fill);
        }

        if (stroke) {
            colors.add(stroke);
        }
    });
    return [...colors];
});

export const removeInlineStyles = memoize((svg: string): string =>
    svg.replace(/fill="[^"]*"/g, 'applyFill').replace(/stroke="[^"]*"/g, 'applyStroke'),
);

export const normalizeClassNames = memoize((svg: string): string =>
    svg
        .replace('primary', 'Primary')
        .replace('secondary', 'Secondary')
        .replace('third', 'Third')
        .replace('Vector', 'Primary')
        .replace('Union', 'Primary')
        .replace('Rectangle', 'Primary'),
);

export const removeClass = memoize((svg: string): string => svg.replace(/class="[^"]*"/g, ''));

export const fullWidth = memoize((svg: string): string =>
    svg.replace(/width="[^"]*"/g, 'width="100%"'),
);
export const fullHeight = memoize((svg: string): string =>
    svg.replace(/height="[^"]*"/g, 'height="100%"'),
);

export * from './types';
