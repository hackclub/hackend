import * as jose from "jose";

void async function() {
    const s = await jose.generateSecret("HS256");
    const jwk = await jose.exportJWK(s);
    console.log("JWK=" + JSON.stringify(jwk));
}();