const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const requiredSecret = () => {
  const secret = process.env.CLOUDBASE_AUTH_BRIDGE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('CLOUDBASE_AUTH_BRIDGE_SECRET is not configured');
  }
  return secret;
};

exports.main = async () => {
  const { OPENID, APPID } = cloud.getWXContext();
  if (!OPENID || !APPID) {
    throw new Error('WeChat caller identity is unavailable');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = `${OPENID}\n${APPID}\n${timestamp}\n${nonce}`;
  const signature = crypto
    .createHmac('sha256', requiredSecret())
    .update(message, 'utf8')
    .digest('hex');

  // This assertion is only meaningful to the configured backend: it is signed,
  // expires in five minutes, and carries no profile data.
  return { openid: OPENID, appid: APPID, timestamp, nonce, signature };
};
