export const incrementUntilUnique = (name: string, existingNames: string[]): string => {
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
