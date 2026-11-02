// Calendar dates as ISO strings (YYYY-MM-DD), the format the API uses for `date_applied`.
// They have no time or zone, and they sort and compare as plain strings.
export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')

// setFullYear, unlike the Date constructor, doesn't read years 0–99 as 1900–1999
function makeDate(year: number, monthIndex: number, day: number): Date {
  const date = new Date(2000, 0, 1)
  date.setFullYear(year, monthIndex, day)
  return date
}

function validDate(year: number, monthIndex: number, day: number): ISODate | null {
  const date = makeDate(year, monthIndex, day)
  const valid =
    date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day
  return valid ? toISODate(date) : null
}

export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromISODate(iso: ISODate): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return makeDate(year, month - 1, day)
}

export function todayISO(): ISODate {
  return toISODate(new Date())
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = fromISODate(iso)
  return toISODate(makeDate(date.getFullYear(), date.getMonth(), date.getDate() + days))
}

/** Keeps the day of the month where it can: Jan 31 plus one month is Feb 28 (or 29) */
export function addMonths(iso: ISODate, months: number): ISODate {
  const date = fromISODate(iso)
  const lastDay = makeDate(date.getFullYear(), date.getMonth() + months + 1, 0).getDate()
  return toISODate(
    makeDate(date.getFullYear(), date.getMonth() + months, Math.min(date.getDate(), lastDay)),
  )
}

/** 0 is Sunday. From the locale where the browser knows it (Intl week info), else Sunday. */
export function weekStartForLocale(locale = navigator.language): number {
  try {
    // getWeekInfo (and the older weekInfo getter) aren't in TypeScript's lib yet
    const info = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay
    return firstDay ? firstDay % 7 : 0
  } catch {
    return 0
  }
}

/** Days from `day` back to the start of its week */
export function daysIntoWeek(iso: ISODate, weekStart: number): number {
  return (fromISODate(iso).getDay() - weekStart + 7) % 7
}

/** Always 6 weeks (42 days), so the calendar never changes height */
export function monthGrid(monthStart: ISODate, weekStart: number): ISODate[] {
  const first = addDays(monthStart, -daysIntoWeek(monthStart, weekStart))
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

/** The first of the month that holds `iso` */
export function startOfMonth(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`
}

const formatters = {
  display: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  long: new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
  month: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }),
  short: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }),
}

/** "Oct 2" in the current year, "Oct 2, 2025" otherwise; for list meta lines */
export const formatShortDate = (iso: ISODate, today: ISODate = todayISO()) =>
  iso.slice(0, 4) === today.slice(0, 4) ? formatters.short.format(fromISODate(iso)) : formatDisplayDate(iso)

/** "Oct 21, 2026" */
export const formatDisplayDate = (iso: ISODate) => formatters.display.format(fromISODate(iso))
/** "Wednesday, October 21, 2026", for day buttons */
export const formatLongDate = (iso: ISODate) => formatters.long.format(fromISODate(iso))
/** "October 2026" */
export const formatMonth = (iso: ISODate) => formatters.month.format(fromISODate(iso))

const monthNames = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

/**
 * Reads a typed date: "Oct 21", "October 21, 2026", "10/21", "10/21/26", "10/21/2026" or
 * "2026-10-21". Numbers are month first, as in the US. Without a year, the reference date's
 * year is used. Returns null when the text isn't a real date.
 */
export function parseDateInput(text: string, reference: ISODate = todayISO()): ISODate | null {
  const input = text.trim().toLowerCase()
  const referenceYear = Number(reference.slice(0, 4))
  const year = (typed: string | undefined) => {
    if (!typed) return referenceYear
    return typed.length === 2 ? 2000 + Number(typed) : Number(typed)
  }

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input)
  if (iso) return validDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))

  const numeric = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/.exec(input)
  if (numeric) return validDate(year(numeric[3]), Number(numeric[1]) - 1, Number(numeric[2]))

  const named = /^([a-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/.exec(input)
  if (named) {
    const monthIndex = monthNames.findIndex((name) => name.startsWith(named[1]))
    if (monthIndex < 0) return null
    return validDate(year(named[3]), monthIndex, Number(named[2]))
  }

  return null
}
