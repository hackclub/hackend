import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Post,
    Request,
    UnauthorizedException,
    UseGuards
} from "@nestjs/common";
import * as jose from "jose";
import * as crypto from "crypto";
import { db } from "./db/client.js";
import { Action, action, email_codes, projects, users } from "./db/schema.js";
import { and, eq, sql } from "drizzle-orm";
import env from "./env.js";
import { change_email, login_code, mail } from "./email.js";
import { IsEmail, IsNotEmpty } from "class-validator";
import { AuthGuard, AuthRequest } from "./auth_guard.js";
import { HackendJWTPayload } from "./types.js";

export const jwk = await jose.importJWK(JSON.parse(env.JWK));

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
class SendChangeEmailCodeDto { @IsNotEmpty() @IsEmail() new_email: string; }
class ChangeEmailDto { @IsNotEmpty() code: string; }

async function clean_login_codes() {
    await db.delete(email_codes).where(sql`expires < unixepoch('now')`);
    setTimeout(clean_login_codes, 1000 * 60 * 60);
}

// noinspection JSIgnoredPromiseFromCall
clean_login_codes();

async function validate_code<T extends Action["type"]>(uid: string, code: string, type: T) {
    const result = await db.select().from(email_codes)
        .where(and(
            eq(email_codes.uid, uid),
            eq(email_codes.code, code),
            sql`expires > unixepoch('now')`
        ))
        .limit(1);

    if(result.length !== 1) throw new UnauthorizedException("Invalid code");

    const action = JSON.parse(result[0].action_data) as Action;
    if(action.type !== type) throw new UnauthorizedException("Invalid code");

    // delete the code
    await db.delete(email_codes).where(and(eq(email_codes.uid, uid), eq(email_codes.code, code)));

    return action as Action & { type: T };
}

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
        await validate_code(uid, code, "login");

        // get the email to put in the jwt, for convenience of the frontend
        // we don't actually want to rely on it in the backend
        const result = await db.select().from(users).where(eq(users.id, uid));

        const payload: HackendJWTPayload = { uid, email: result[0].email };
        return await new jose.SignJWT(payload)
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("4w")
            .sign(jwk);
    }

    // TODO test
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post("/send_change_email_code")
    async send_change_email_code(@Request() { uid }: AuthRequest, @Body() { new_email }: SendChangeEmailCodeDto) {
        const userResult = await db.select().from(users).where(eq(users.id, uid)).limit(1);
        if(userResult.length !== 1) throw new NotFoundException("Failed to find user");
        const { email: old_email } = userResult[0];
        const code = await generateCode(uid);
        const result = await db.insert(email_codes).values({
            uid,
            code,
            action_data: action({ type: "change_email", new_email })
        });
        if(result.changes !== 1) throw new Error("Failed to insert code");
        await mail(new_email, change_email(code, old_email, new_email));
        return "OK";
    }

    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post("/change_email")
    async change_email(@Request() { uid }: AuthRequest, @Body() { code }: ChangeEmailDto) {
        const { new_email } = await validate_code(uid, code, "change_email");
        const newUserResult = await db.select().from(users).where(eq(users.email, new_email)).limit(1);
        if(newUserResult.length !== 0) {
            // move the projects of the old account
            const new_uid = newUserResult[0].id;
            await db.update(projects).set({ uid: new_uid }).where(eq(projects.uid, uid));
            // delete the old account
            await db.delete(users).where(eq(users.id, uid));
        } else {
            // update the email of the user
            await db.update(users).set({ email: new_email }).where(eq(users.id, uid));
        }
        return "OK";
    }
}
