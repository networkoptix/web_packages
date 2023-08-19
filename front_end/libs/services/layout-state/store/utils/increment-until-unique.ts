export const incrementUntilUnique = (name: string, existingNames: string[]): string => {
    if (!existingNames.includes(name)) {
        return name;
    }

    const nameRegExp = new RegExp(`^${name} `);
    const lastVersion =
        existingNames
            .filter(existingName => nameRegExp.test(existingName))
            .map(existingName => existingName.replace(nameRegExp, ''))
            .filter(nameDiff => !nameDiff.includes(' '))
            .map(nameDiff => parseInt(nameDiff))
            .filter(nameDiff => !isNaN(nameDiff))
            .sort()
            .pop() || 1;

    return `${name} ${lastVersion + 1}`;
};
