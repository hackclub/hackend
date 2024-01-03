import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import * as jose from "jose";
import { jwk } from "./auth.js";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor() {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = /^Bearer (.+)$/.exec(request.headers.authorization)?.[1];
        if(!token) throw new UnauthorizedException("Missing authorization header");
        let payload;
        try {
            payload = (await jose.jwtVerify(token, jwk)).payload;
        } catch(err) {
            throw new UnauthorizedException("Invalid token");
        }
        if(!payload.uid) throw new UnauthorizedException("Token missing uid");
        request.uid = payload.uid;
        return true;
    }
}

export type AuthRequest = { uid: string };