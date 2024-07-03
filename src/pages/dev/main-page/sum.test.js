// sum.test.js
import { expect, test } from 'vitest'
import { sum } from './sum'

test('file works', () => {
  expect(sum(1, 2)).toBe(3)
})