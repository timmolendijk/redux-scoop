// TODO(tim): What we really want here is `ObjectConstructor & Function` but it
// won't let us.
export type IType = ObjectConstructor | Function;

const types = new Map<string, IType>();

export function registerType(Type: IType) {
  if (hasType(Type))
    return;
  
  const typeName = (Type as any).displayName || Type.name;

  if (typeName in types)
    throw new Error(`Type name '${typeName}' already in use`);
  
  types.set(typeName, Type);
}

export function hasType(Type: IType): boolean {
  return [...types.values()].indexOf(Type) !== -1;
}

export function getTypeOfKey(key: string): IType {
  return types.get(key);
}

export function getKeyOfType(Type: IType): string {
  for (const [key, T] of types)
    if (Type === T)
      return key;
}
