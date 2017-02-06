import { Store as ReduxStore } from 'redux';
import { IIdentifier } from '.';
import Instance from './instance';
export interface IRef {
    readonly '@@scoop': 'ref';
    readonly type: string;
    readonly id: IIdentifier | null;
}
export interface IExternalState {
    readonly '@@scoop': IState;
    [external: string]: any;
}
export interface IStateTypeInstance {
    [field: string]: boolean | string | number | IRef;
}
export interface IStateTypeInstanceEntries {
    [id: string]: IStateTypeInstance;
}
export declare type IStateTypeInstances = {
    readonly '@@scoop': 'instances';
} & IStateTypeInstanceEntries;
export interface IState {
    [type: string]: IStateTypeInstance | IStateTypeInstances;
}
export declare function resetRender(store: ReduxStore<IExternalState>): void;
export declare const storeEnhancer: (createStore: any) => (externalReducer: any, preloadedState: any) => any;
export default class Store {
    private readonly wrapped;
    static get(wrapped: ReduxStore<IExternalState>): Store;
    protected constructor(wrapped: ReduxStore<IExternalState>);
    private previousState;
    private currentState;
    private readonly instances;
    hasInstance(type: string, id: IIdentifier): boolean;
    hasInstance(ref: IRef): boolean;
    private getInstance(ref);
    private setInstance(ref, instance);
    deleteViewInstances(): void;
    private isRef(ref);
    private getRef(instance);
    getFieldValue(instance: Instance, name: string): any;
    setFieldValue(instance: Instance, name: string, value: any): void;
    onFields(instance: Instance, listener: any): void;
    private hydrate(data);
    private dehydrate(data);
    getPending(): Promise<any[]>;
}
