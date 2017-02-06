import { IIdentifier } from '.';
import Store from './store';
import { IType } from './type';
export default class Instance {
    private readonly wrapped;
    static get(wrapped: Object): Instance;
    protected constructor(wrapped: Object);
    readonly value: Object;
    readonly Type: IType;
    id: IIdentifier;
    private store;
    setStore(store: Store, id?: IIdentifier): void;
    private readonly fields;
    private updateFields(fields);
    getFields(): {};
    getFieldValue(name: any): any;
    setFieldValue(name: any, value: any): void;
    private readonly listeners;
    private notifyOnFieldValue(name, value);
    onFieldValue(name: any, listener: any): void;
    private readonly pendings;
    registerPending(pending: Promise<any>): void;
    getPending(): Promise<ReadonlyArray<any>> | void;
}
