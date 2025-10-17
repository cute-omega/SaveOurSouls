import { totp, authenticator } from 'otplib'

export function generateSecret() {
    return authenticator.generateSecret()
}

export function currentCode(secret) {
    if (!secret) return ''
    totp.options = { step: 30, digits: 6 }
    return totp.generate(secret)
}

export function verifyCode(code, secret) {
    if (!secret) return false
    totp.options = { step: 30, digits: 6 }
    return totp.check(code, secret)
}
