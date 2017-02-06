export declare type IType = ObjectConstructor | Function;
export declare function registerType(Type: IType): void;
export declare function hasType(Type: IType): boolean;
export declare function getTypeOfKey(key: string): IType;
export declare function getKeyOfType(Type: IType): string;
