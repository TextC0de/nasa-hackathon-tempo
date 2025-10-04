
type EnumValuesAsTuple<E> = [E[keyof E]];

export const constEnumToDrizzleEnum = <
    E extends Record<string, unknown>,
>(
    enumObject: E,
) => {
    return Object.values(enumObject) as EnumValuesAsTuple<E>;
};
