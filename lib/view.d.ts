import { Store as ReduxStore } from 'redux';
import { IIdentifier } from '.';
import { IType } from './type';
export interface IView {
    isViewComponent(value: any): boolean;
    getViewComponentType(component: any): IType;
    getViewComponentStore(component: any): ReduxStore<any>;
    getViewComponentId(component: any): IIdentifier;
}
export declare function registerView(config: IView): void;
export declare function isViewComponent(value: any): boolean;
export declare function getViewComponentType(component: any): IType;
export declare function getViewComponentStore(component: any): ReduxStore<any>;
export declare function getViewComponentId(component: any): string | number;
