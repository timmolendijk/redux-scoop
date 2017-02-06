import { Store as ReduxStore } from 'redux';
export declare function getPending(store: ReduxStore<any>): Promise<any> | void;
declare const decorator: MethodDecorator;
export { decorator as pending };
