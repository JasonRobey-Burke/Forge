import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import JwksRsa from 'jwks-rsa';

declare global {
  namespace Express {
    interface Request {
      user?: {
        oid: string;
        name: string;
        email: string;
        roles: string[];
      };
    }
  }
}

const unauthorizedResponse = {
  data: null,
  error: { message: 'Unauthorized', code: 'AUTH_REQUIRED' },
  meta: null,
};

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (process.env.BYPASS_AUTH === 'true') {
    req.user = {
      oid: 'dev-user',
      name: 'Dev User',
      email: 'dev@local',
      roles: ['Admin'],
    };
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(unauthorizedResponse);
    return;
  }

  const token = authHeader.slice(7);
  const tenantId = process.env.ENTRA_TENANT_ID;
  const audience = process.env.ENTRA_AUDIENCE;

  if (!tenantId || !audience) {
    res.status(401).json(unauthorizedResponse);
    return;
  }

  const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
  const client = JwksRsa({ jwksUri, cache: true, rateLimit: true });

  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header?.kid) {
      res.status(401).json(unauthorizedResponse);
      return;
    }

    const signingKey = await client.getSigningKey(decoded.header.kid);
    const publicKey = signingKey.getPublicKey();

    const payload = jwt.verify(token, publicKey, {
      audience,
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      algorithms: ['RS256'],
    }) as jwt.JwtPayload;

    req.user = {
      oid: payload['oid'] as string,
      name: payload['name'] as string,
      email: payload['preferred_username'] as string,
      roles: (payload['roles'] as string[]) ?? [],
    };

    next();
  } catch {
    res.status(401).json(unauthorizedResponse);
  }
}
