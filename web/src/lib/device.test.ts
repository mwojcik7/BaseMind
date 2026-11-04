import { describe, expect, it } from 'vitest'
import { describeDevice } from '@/lib/device'

describe('describeDevice', () => {
  it.each([
    [
      'Mozilla/5.0 (Linux; Android 15; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36',
      'Chrome, Android',
    ],
    [
      'Mozilla/5.0 (Linux; Android 15; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0 Mobile Safari/537.36',
      'Samsung Internet, Android',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36 Edg/142.0',
      'Edge, Windows',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'Safari, iPhone',
    ],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0', 'Firefox, Linux'],
  ])('recognizes %s', (userAgent, expected) => {
    expect(describeDevice(userAgent)).toBe(expected)
  })

  it('returns null when nothing is known', () => {
    expect(describeDevice(null)).toBeNull()
    expect(describeDevice('curl/8.0')).toBeNull()
  })
})
