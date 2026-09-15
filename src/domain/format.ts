const NBSP = '\u00A0'

const numberFormat = new Intl.NumberFormat('ru-RU')

export function formatHeadcount(value: number) {
  return numberFormat.format(value)
}

export function formatBudget(value: number) {
  const amount = numberFormat.format(value).replace(/\s/g, NBSP)
  return `${amount}${NBSP}руб.`
}

export function formatPerformance(value: number) {
  return `${Math.round(value)}%`
}

export function formatLevel(level: number) {
  if (level === 0) return 'Дивизион'
  if (level === 1) return 'Отдел'
  if (level === 2) return 'Команда'
  return String(level)
}
