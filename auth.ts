import { Controller, HttpCode, HttpStatus, Post, Body } from "@nestjs/common";
import * as jose from "jose";

const jwk_str = process.env.JWK;
if(!jwk_str) throw new Error("JWK is not set - run `yarn generate_jwk` then add that to your .env");
const jwk = await jose.importJWK(JSON.parse(jwk_str));

@Controller("auth")
export class AuthController {
    @HttpCode(HttpStatus.OK)
    @Post("/login")
    async login(@Body() body: Record<string, any> /* TODO */) {
        // validate code
        console.log(body);
        // TODO fix this!! this is bad this just lets everyone log in
        return await new jose.SignJWT({ "email": body.email })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("4w")
            .sign(jwk);
    }
}