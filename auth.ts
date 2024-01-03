import { Controller, HttpCode, HttpStatus, Post, Body, UnauthorizedException } from "@nestjs/common";
import * as jose from "jose";
import * as crypto from "crypto";
import { db } from "./db/client.js";
import { action, email_codes, users } from "./db/schema.js";
import { and, eq, sql } from "drizzle-orm";
import env from "./env.js";
import { login_code, mail } from "./email.js";
import { IsEmail, IsNotEmpty } from "class-validator";

const jwk = await jose.importJWK(JSON.parse(env.JWK));

async function generateCode(uid: string) {
    let h = async () : Promise<string> => {
        // secure random generate code
        const code = crypto.randomInt(1_000_000).toString().padStart(6, "0");
        // check if code exists
        const result = await db.select().from(email_codes)
            .where(and(eq(email_codes.uid, uid), eq(email_codes.code, code)))
            .limit(1);
        return result.length > 0 ? await h() : code;
    }; return await h();
}

class SendLoginCodeDto { @IsNotEmpty() @IsEmail() email: string; }
class LoginDto { @IsNotEmpty() uid: string; @IsNotEmpty() code: string; }

async function clean_login_codes() {
    await db.delete(email_codes).where(sql`expires < unixepoch('now')`);
    setTimeout(clean_login_codes, 1000 * 60 * 60);
}

// noinspection JSIgnoredPromiseFromCall
clean_login_codes();

@Controller("auth")
export class AuthController {
    @HttpCode(HttpStatus.CREATED)
    @Post("/send_login_code")
    async send_login_code(@Body() { email }: SendLoginCodeDto) {
        // create user if they don't exist
        await db.insert(users).values({ email }).onConflictDoNothing();
        const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if(userResult.length !== 1) throw new Error("Failed to find user");
        const { id: uid } = userResult[0];
        // delete old login codes
        await db.delete(email_codes).where(and(eq(email_codes.uid, uid), eq(email_codes.action_data, action({ type: "login" }))));
        const code = await generateCode(uid);
        const result = await db.insert(email_codes).values({
            uid,
            code,
            action_data: action({ type: "login" })
        });
        if(result.changes !== 1) throw new Error("Failed to insert code");
        await mail(email, login_code(code));
        return uid;
    }

    @HttpCode(HttpStatus.OK)
    @Post("/login")
    async login(@Body() { uid, code }: LoginDto) {
        // validate code
        const result = await db.select().from(email_codes)
            .where(and(
                eq(email_codes.uid, uid),
                eq(email_codes.code, code),
                sql`expires > unixepoch('now')`
            ))
            .limit(1);

        if(result.length !== 1) throw new UnauthorizedException("Invalid code");

        // delete the code
        await db.delete(email_codes).where(and(eq(email_codes.uid, uid), eq(email_codes.code, code)));

        return await new jose.SignJWT({ "uid": uid })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("4w")
            .sign(jwk);
    }
}
