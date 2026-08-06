import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
export type UserRole = "admin" | "worker" | "customer";
export interface UserProfile { id:string; role:UserRole; status:string|null; first_name?:string|null; middle_name?:string|null; last_name?:string|null; email?:string|null; }
export interface AuthContextType { user:User|null; profile:UserProfile|null; loading:boolean; error:string|null; role:UserRole|null; status:string|null; refreshProfile:()=>Promise<void>; signOut:()=>Promise<void>; }
export const AuthContext=createContext<AuthContextType|null>(null);
export function useAuth():AuthContextType { const context=useContext(AuthContext); if(!context) throw new Error("useAuth must be used inside AuthProvider."); return context; }
