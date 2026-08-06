import { createContext, useContext } from "react";
export type AppLanguage="en"|"fil";
export interface LanguageContextValue { language:AppLanguage; setLanguage:(language:AppLanguage)=>void; t:(key:string,fallback?:string)=>string; }
export const LanguageContext=createContext<LanguageContextValue|null>(null);
export function useLanguage():LanguageContextValue { const context=useContext(LanguageContext); if(!context) throw new Error("useLanguage must be used inside LanguageProvider."); return context; }
