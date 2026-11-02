import type { InputProps } from '../Input/Input.types'

export type PasswordInputProps = Omit<InputProps, 'type' | 'trailing'>
