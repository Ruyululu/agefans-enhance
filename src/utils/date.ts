/** 返回与当前日期最接近的同一周几的日期 */
export function closestSameDay(value: string | number) {
  if (typeof value === 'string') {
    const ret = value.match(/(\d+).*?(\d\d?).*?(\d\d?)/)
    if (!ret) throw new Error('Invalid date string')
    const [, y, m, d] = ret

    value = `${y}-${m}-${d ?? '01'}`

    if (new Date(value).toJSON().includes('Invalid Date')) {
      throw new Error('Invalid date string')
    }
  }

  let date = new Date()
  const target = new Date(value)
  while (target.getDay() !== date.getDay()) {
    date = new Date(date.getTime() - 24 * 60 * 60 * 1000)
  }
  return date
}
