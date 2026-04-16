import { useState } from 'react'

interface CompanyAvatarProps {
  company: string
  logoUrl?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Deterministic avatar color palette — excludes red/green to avoid
 * conflicting with status badge meanings.
 */
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-sky-500',
]

const SIZE_CLASSES: Record<NonNullable<CompanyAvatarProps['size']>, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
}

/**
 * Derives up to 2 initials from a company name.
 * "Acme Corp" → "AC", "Google" → "G"
 */
function getInitials(company: string): string {
  return company
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Renders a company logo image if `logoUrl` is provided, with an automatic
 * fallback to a colored initials circle on image load error.
 * Never shows a broken image — uses onError to swap to the initials fallback.
 */
export function CompanyAvatar({
  company,
  logoUrl,
  size = 'md',
}: CompanyAvatarProps) {
  const [imgError, setImgError] = useState(false)

  const sizeClass = SIZE_CLASSES[size]
  const initials = getInitials(company)
  const colorClass =
    AVATAR_COLORS[company.charCodeAt(0) % AVATAR_COLORS.length]

  const initialsAvatar = (
    <div
      className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      aria-label={company}
      role="img"
    >
      {initials}
    </div>
  )

  if (!logoUrl || imgError) {
    return initialsAvatar
  }

  return (
    <img
      src={logoUrl}
      alt={`${company} logo`}
      className={`${sizeClass} rounded-full object-cover shrink-0`}
      onError={() => setImgError(true)}
    />
  )
}
