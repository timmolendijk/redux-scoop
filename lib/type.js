"use strict";
const types = new Map();
function registerType(Type) {
    if (hasType(Type))
        return;
    const typeName = Type.displayName || Type.name;
    if (typeName in types)
        throw new Error(`Type name '${typeName}' already in use`);
    types.set(typeName, Type);
}
exports.registerType = registerType;
function hasType(Type) {
    return [...types.values()].indexOf(Type) !== -1;
}
exports.hasType = hasType;
function getTypeOfKey(key) {
    return types.get(key);
}
exports.getTypeOfKey = getTypeOfKey;
function getKeyOfType(Type) {
    for (const [key, T] of types)
        if (Type === T)
            return key;
}
exports.getKeyOfType = getKeyOfType;
