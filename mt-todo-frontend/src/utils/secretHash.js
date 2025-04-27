import CryptoJS from 'crypto-js'

export function generateSecretHash(username, clientId, clientSecret) {
  const message = username + clientId
  const hash = CryptoJS.HmacSHA256(message, clientSecret)
  const base64 = CryptoJS.enc.Base64.stringify(hash)
  return base64
}
