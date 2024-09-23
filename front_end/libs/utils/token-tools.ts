type RawJWTToken = [
    {
        typ: string; // "JWT"
        alg: string; // "RS256"
        kid: string; // "Unique ID"
    },
    {
        aud: string; // "https://qa.cloud.hdw.mx/ cloudSystemId=*"
        client_id: string;
        exp: number;
        iat: number;
        iss: string; // "cdb"
        pwdTime: number;
        sid: string;
        sub: string; // "email"
        jti?: string; // "JWT
        typ?: string; // "authCode"
    },
];

type JWTToken = {
    tokenType: string;
    algorithm: string;
    keyId: string;
    audience: string;
    clientId: string;
    expiration: number;
    issuedAt: number;
    issuer: string;
    passwordTime: number;
    sessionId: string;
    email: string;
    jwtId?: string;
    type?: string;
};

export const parseJWTToken = (token: string): JWTToken => {
    const rawToken = token
        .replace('nxcdb-', '')
        .split('.')
        .slice(0, 2)
        .map(chunk => JSON.parse(atob(chunk))) as RawJWTToken;
    return {
        tokenType: rawToken[0].typ,
        algorithm: rawToken[0].alg,
        keyId: rawToken[0].kid,
        audience: rawToken[1].aud,
        clientId: rawToken[1].client_id,
        expiration: rawToken[1].exp,
        issuedAt: rawToken[1].iat,
        issuer: rawToken[1].iss,
        passwordTime: rawToken[1].pwdTime,
        sessionId: rawToken[1].sid,
        email: rawToken[1].sub,
        jwtId: rawToken[1].jti,
        type: rawToken[1].typ,
    };
};
