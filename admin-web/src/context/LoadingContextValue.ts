import { createContext, useContext } from "react";
export interface LoadingContextValue { isLoading:boolean; showLoading:(minimumDuration?:number)=>void; hideLoading:()=>void; }
export const LoadingContext=createContext<LoadingContextValue|null>(null);
export function useLoading():LoadingContextValue { const context=useContext(LoadingContext); if(!context) throw new Error("useLoading must be used inside LoadingProvider."); return context; }
