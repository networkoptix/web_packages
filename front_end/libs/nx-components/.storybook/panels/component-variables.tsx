import React, { useEffect, useState } from 'react';
import { AddonPanel, Spaced, H2, Table } from '@storybook/components';
import { Addon_BaseType } from '@storybook/types';

import {
    createComponentVariablesEvent,
    createComponentVariablesEventName,
} from '../../src/lib/theme-provider/events';
import { getStoryBookWindow } from './common';

export const ComponentVariables: Addon_BaseType['render'] = ({ active }) => {
    const [variables, setVariables] = useState<[string, [string, string]][]>([])
    useEffect(() => {
        const updateVariables = ({ detail }: ReturnType<typeof createComponentVariablesEvent>) => {
            setVariables(Object.entries(detail));
        };
        getStoryBookWindow()?.addEventListener(createComponentVariablesEventName, updateVariables);
        return () => getStoryBookWindow()?.removeEventListener(createComponentVariablesEventName, updateVariables);
    });

    return (
        <AddonPanel active={!!active}>
            <Spaced
                col={2}
                row={1}
                outer={1}
            >
                    <H2>Component Variables</H2>
                    <Table>
                        <tr>
                            <th>Name</th>
                            <th>Value</th>
                        </tr>
                        { variables.map(([name, [value, color]]) => <tr key={name}><td>{name}</td><td>{value}</td><td style={{background: color || 'transparent'}}></td></tr>) }
                    </Table>
            </Spaced>
        </AddonPanel>
    );
};
