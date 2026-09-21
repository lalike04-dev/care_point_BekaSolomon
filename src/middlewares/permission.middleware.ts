import { Request, Response, NextFunction } from "express";
import type {Role,Permission} from "../schemas/auth.schema.js"
import {prisma} from "../lib/prisma.js"
import {Prisma} from "@prisma/client"

export async function requireAuthorization(role:Role){
    return async(req:Request,res:Response, next:NextFunction) =>{
        if(!req.user){ 
            return res.status(401).json({message:"Authentication required!"})
        }
        const rolecheck=req.user
        const roleid=await prisma.role.findFirst({
            where:{name:role}
        })
        if(!roleid){
            return res.status(404).json({message:"Role doesnt exist!"})
        }
        if(rolecheck.roleId!==roleid.id){
            return res.status(403).json({message:"Access Fobidden!"})
        }

        return next();
    }
}

export async function requirePermission(permission:Permission){
    return async(req:Request,res:Response, next:NextFunction) =>{
        if(!req.user){
            return res.status(401).json({message:"Authorization required!"})
        }
        const user=req.user
        const permissions=await prisma.permission.findFirst({
            where:{
                action:permission
            }
        })
        if(!permissions){
            return res.status(404).json({message:"Permission not found!"})
        }
        const allowed=await prisma.rolePermission.findUnique({
            where:{roleId:user.roleId,
                permissionId:permissions.id
            }
        })
        if(!allowed){
            return res.status(403).json({message:"Access Forbidden!"})
        }
        return next();
    }
}