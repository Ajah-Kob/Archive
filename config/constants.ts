export const APP_NAME = 'Archive'
export const APP_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://bsis-archive.vercel.app'
    : 'http://localhost:3000'

export const SCHOOL_NAME = 'Bulacan State University'
export const SMTP_FROM_NAME = 'Archive'
export const SMTP_FROM_EMAIL = 'archive@domain.com'
export const USERS_PER_PAGE = 5
export const ADVISER_CAP = 8
