import { z } from 'zod'

/** Sign-up and the Settings page both ask for at least this many characters */
export const MIN_PASSWORD_LENGTH = 8

// zod skips an object's refinements while any of its fields fails, so both password rules live
// in one superRefine over plain strings: the mismatch shows even while another field is empty
/** A new password typed twice: `password` and `confirmPassword` */
export const passwordPair = z
  .object({ password: z.string(), confirmPassword: z.string() })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Enter a password' })
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` })
    }
    if (confirmPassword.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Enter your password again' })
    } else if (confirmPassword !== password) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords don’t match.' })
    }
  })
