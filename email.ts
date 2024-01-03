import { compile } from "html-to-text";
import env from "./env.js";
import sendgrid from "@sendgrid/mail";
import { users } from "./db/schema.js";
import { eq } from "drizzle-orm";
import { db } from "./db/client.js";

sendgrid.setApiKey(env.SENDGRID_API_KEY);

const email_from = "auth@hackclub.com";
type MessageContent = { subject: string, html: string, text: string };
export const mail = async (to: string, msg: MessageContent) =>
    await sendgrid.send({ ...msg, to, from: email_from });

export const mail_user = async (uid: string, msg: MessageContent) => {
    const user = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    if(user.length !== 1) throw new Error(`User with id ${uid} not found`);
    return await mail(user[0].email, msg);
}

const convert = compile({});

// memoize html to text conversion for perf
const t = <T extends (...args: string[]) => Omit<MessageContent, "text">>(f: T): ((...args: Parameters<T>) => MessageContent) => {
    const placeholders = Array.from(f as { length: number }, (_, i) => `{{${i}}}`);
    const { html } = f(...placeholders);
    const c = convert(html);
    return (...args: string[]) => ({
        ...f(...args),
        text: placeholders.reduce((acc, cur, i) => acc.replaceAll(cur, args[i]), c)
    })
};

export const login_code = t((code: string) => ({
    subject: `${env.PROJECT_NAME} Login Code: ${code}`,
    html: `<p>Here's your ${env.PROJECT_NAME} login code:</p><h1>${code}</h1><p><small>(Not you? You can safely ignore this email.)</small></p>`
}));

export const change_email = t((code: string, old_email: string, new_email: string) => ({
    subject: `${env.PROJECT_NAME} Change Email Verification`,
    html: `<p>Hi,</p>
<p>We received a request to change the email on your ${env.PROJECT_NAME} account from ${old_email} to ${new_email}. To confirm this, enter the code <strong>${code}</strong>.</p>
<p>If this wasn't you, you can safely ignore this email.</p>`
}))