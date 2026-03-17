import crypto from 'crypto';

const encodeBase64Url = (value) => Buffer.from(value).toString('base64url');

const decodeBase64Url = (value) => Buffer.from(value, 'base64url').toString('utf8');

const signPayload = (payload, secret) => {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
};

export const createAuthToken = (payload, secret, expiresInSeconds) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(tokenPayload));
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
};

export const verifyAuthToken = (token, secret) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  if (signature.length !== expectedSignature.length) {
    return null;
  }

  const isValidSignature = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!isValidSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload));
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < nowSeconds) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
};
