import { createContext, useContext } from 'react'
import type { CardPadding } from './Card.types'

export interface CardContextValue {
  padding: CardPadding
  /** The id a CardTitle takes, so the section can point aria-labelledby at it */
  titleId: string
  /** CardTitle reports itself, so the section only references a title that exists */
  setHasTitle: (hasTitle: boolean) => void
}

export const CardContext = createContext<CardContextValue | null>(null)

export function useCardContext() {
  const card = useContext(CardContext)
  if (!card) throw new Error('Card parts must be used inside a Card')
  return card
}
