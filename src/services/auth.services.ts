import bcrypt from "bcrypt";

const bcrypt_options={
    saltRounds:12
} as const 
export async function hashPassword(password:string): Promise<string>{
    const hashed= await bcrypt.hash(password, bcrypt_options.saltRounds)

    return hashed;
}

export async function checkHash(password:string,hashed:string): Promise<boolean>{
    const matches= await bcrypt.compare(password,hashed)

    return matches
}