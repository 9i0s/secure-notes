import speakeasy from "speakeasy";
import qrcode from "qrcode";
import crypto from "crypto";

const APP_NAME = "SecureNotes";

export function generateTotpSecret(email) {
  return speakeasy.generateSecret({
    name: `${APP_NAME} (${email})`,
    length: 20,
  });
}

export async function totpQrDataUrl(otpauthUrl) {
  return qrcode.toDataURL(otpauthUrl);
}

export function verifyTotp(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });
}

export function generateNumericCode(digits = 6) {
  const max = 10 ** digits;
  const buf = crypto.randomBytes(4).readUInt32BE(0);
  return String(buf % max).padStart(digits, "0");
}