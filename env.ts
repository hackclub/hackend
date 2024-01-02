import "dotenv/config";

const vars = {
    "SENDGRID_API_KEY": null,
    "JWK": "JWK is not set - follow the instructions in the README.md to set it",
    "PORT": null,
    "DB_PATH": null,
    "PROJECT_NAME": null
} as const;

const env = Object.fromEntries(Object.entries(vars).map(([name, err]) => {
    const value = process.env[name];
    if(!value) throw new Error(err ?? `${name} is not set in your .env`);
    return [name, value];
})) as Record<keyof typeof vars, string>;

export default env;