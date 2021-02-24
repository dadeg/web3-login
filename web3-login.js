import * as crypto from "crypto";
import ethers from "ethers";
const { utils, Contract, providers } = ethers;

/**
 * generates random string of characters i.e salt
 */
function randomString(length){
  return crypto.randomBytes(Math.ceil(length/2))
          .toString('hex') /** convert to hexadecimal format */
          .slice(0,length);   /** return required number of characters */
};

/**
 * hash password with sha512.
 */
function sha512(password, salt, timestamp){
  var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  hash.update(timestamp);
  var value = hash.digest('hex');
  return value;
};

function createHash(password, salt, timestamp) {
  const hash = sha512(password, salt, timestamp);
  return `${hash}:${salt}:${timestamp}`;
}

// this creates secrets for users to sign
export function createSecret(appSecret) {
  const salt = randomString(16);
  const timestamp = Date.now().toString();
  return createHash(appSecret, salt, timestamp);
}

// this validates that the secret came from us
// timeElapsedLimit is milliseconds
export function validateSecret(userProvidedSecret, appSecret, timeElapsedLimit) {
  const parts = userProvidedSecret.split(":");
  const timestamp = parseInt(parts[2]);
  const salt = parts[1];
  const hash = parts[0];

  if (Date.now() - timestamp > timeElapsedLimit) {
    return false;
  }

  if (sha512(appSecret, salt, parts[2]) !== hash) {
    return false;
  }

  return true;
}

// this gets the address that signed the message
export function extractAddress(originalMessage, signedMessage) {
  return utils.verifyMessage(originalMessage, signedMessage);
}

