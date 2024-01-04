import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import * as jose from "jose";
import { jwk } from "./auth.js";

export async function check_token(token: string): Promise<false | { uid: string }> {
    try {
        return (await jose.jwtVerify(token, jwk)).payload as { uid: string };
    } catch(err) {
        return false;
    }
}

@Injectable()
export class AuthGuard implements CanActivate {
    constructor() {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = /^Bearer (.+)$/.exec(request.headers.authorization)?.[1];
        if(!token) throw new UnauthorizedException("Missing authorization header");
        const payload = await check_token(token);
        if(!payload) throw new UnauthorizedException("Invalid token");
        if(!payload.uid) throw new UnauthorizedException("Token missing uid");
        request.uid = payload.uid;
        return true;
    }
}

export type AuthRequest = { uid: string };