import type { IRequest } from 'itty-router';

export interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    id_token: string;
}

export interface UserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
}

export interface OAuthConfiguration {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    tokenVerificationEndpoint: string;
    userInfoEndpoint: string;
    authEndpoint: string;
    tokenEndpoint: string;
    callbackEndpoint: string;
    scope: string,    
    getUserInfo: (accessToken: string) => Promise<UserInfo>;
}

export interface AuthenticatedRequest extends IRequest {
    authenticationInfo?: AuthenticationInfo|AuthenticationError;
}


export enum AuthenticationErrorCode {
    CsrfTokenMissing = 1,
    CsrfTokenMismatch = 2,
    InvalidAuthorizationCode = 3,
    MissingBearer = 4,
    authenticationInternalError = 5,
    TokenExchangeFailed = 6,
    TokenVerificationFailed = 7,
}

export interface AuthenticationError {
    isError: boolean;
    error: AuthenticationErrorCode;
    message: string;
}

export interface AuthenticationInfo {
    isError: boolean;
    isAuthenticated: boolean;    
    token: string;
    user?: UserInfo
}

/**
 * Middleware to verify JWT token and extract user information
 */

export function redirectToAuthProvider(authConfig: OAuthConfiguration): Response {
    
    const authUrl = new URL(authConfig.authEndpoint);
    authUrl.searchParams.set('client_id', authConfig.clientId);
    authUrl.searchParams.set('redirect_uri', authConfig.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', authConfig.scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'select_account');    // Force account selection
    return Response.redirect(authUrl.toString(), 302);
}

export function withAuthGeneric<T>(authConfigBuilder: (env: T) => OAuthConfiguration): (request: AuthenticatedRequest, env: T) => Promise<void | Response> {
    
    const callback = async function (request: AuthenticatedRequest, env: T): Promise<void | Response> {
        try {
            const url = new URL(request.url);
            const code = url.searchParams.get('code');
        
            if (!code) {
                var err = {
                    isError: true,
                    error: AuthenticationErrorCode.InvalidAuthorizationCode,
                    message: 'OAuth callback - Invalid or missing authorization code'
                }
                request.authenticationInfo = err;
                return;
            }
            var authConfig = authConfigBuilder(env);
            const tokens = await exchangeCodeForTokens(env, code, authConfigBuilder);
            // Get user info
            const userInfo = await authConfig.getUserInfo(tokens.access_token);
            // Save user to database

            const ok: AuthenticationInfo = {
                isError: false,
                isAuthenticated: true,
                user: userInfo,
                token: tokens.id_token
            };
            request.authenticationInfo = ok;
            return;
        }
        catch (error: Error | any) {
            request.authenticationInfo = {
                isError: true,
                error: AuthenticationErrorCode.authenticationInternalError,
                message: `OAuth callback - Error during authentication process: ${error.message}`
            }
        }
    }
    

    const middleware = async function withAuth(request: AuthenticatedRequest, env: T): Promise<void | Response> {
        
        const authConfig = authConfigBuilder(env);
        if (request.url.includes(authConfig.callbackEndpoint)) {
            return await callback(request, env);
        }

    const authHeader = request.headers.get('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {                    
        request.authenticationInfo = {
            error: AuthenticationErrorCode.MissingBearer,
            message: 'Missing or invalid authorization header',
            isError: true
        }        
        return;
    }

    const token = authHeader.substring(7);
    
    try {        
        // Verify the ID token 
        const url = `${authConfig.tokenVerificationEndpoint}${token}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const body = await response.text();
            const error: AuthenticationError = {
                isError: true,
                error: AuthenticationErrorCode.TokenVerificationFailed,
                message: `withAuthGeneric - token verification error : ${response.status} - ${response.statusText} : ${body}`,                
            }; 
            request.authenticationInfo = error; 
            return;
        }

        const tokenInfo = await response.json() as { sub: string; email: string; email_verified: string; name: string; picture: string, given_name: string, family_name: string };
        const user: UserInfo = {
            id : tokenInfo.sub,
            email: tokenInfo.email,            
            name: tokenInfo.name,            
            picture: tokenInfo.picture,
            locale: '',
            verified_email: tokenInfo.email_verified === 'true',
            given_name: tokenInfo.given_name,
            family_name: tokenInfo.family_name
        }
        // Attach user info to request
        request.authenticationInfo = {
            isError: false,
            isAuthenticated: true,
            user: user,
            token: token
        };
        return;
        
    } catch (error: Error | any) {
        request.authenticationInfo = { 
            isError: true,
            error: AuthenticationErrorCode.authenticationInternalError,
            message: `withAuthGeneric - error occurred during authentication process : ${error.message}`
        };
        return;       
    }
    }
    return middleware;
}



/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens<T>(
    env: T,
    code: string,
    authConfigBuilder: (env: T) => OAuthConfiguration
): Promise<TokenResponse> {
    const authConfig = authConfigBuilder(env);
    const tokenEndpoint = authConfig.tokenEndpoint;
    
    const params = new URLSearchParams({
        code,
        client_id: authConfig.clientId,
        client_secret: authConfig.clientSecret,
        redirect_uri: authConfig.redirectUri,
        grant_type: 'authorization_code'
    });


    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
    });

    if (!response.ok) {
        const errorBody = await response.text();
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
    }

    return await response.json() as TokenResponse;
}


