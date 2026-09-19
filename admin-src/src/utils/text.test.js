import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeMultiline } from './text.js'

test('keeps a single newline as an in-paragraph break', () => {
  assert.equal(normalizeMultiline('第一行\n第二行'), '第一行\n第二行')
})

test('collapses three or more newlines into one blank line', () => {
  assert.equal(normalizeMultiline('第一段\n\n\n\n第二段'), '第一段\n\n第二段')
})

test('normalizes CRLF, CR and unicode line separators', () => {
  assert.equal(normalizeMultiline('第一段\r\n\r\n第二段'), '第一段\n\n第二段')
  assert.equal(normalizeMultiline('第一段\r第二段'), '第一段\n第二段')
  assert.equal(normalizeMultiline('第一段\u2028第二段'), '第一段\n第二段')
})

test('strips per-line whitespace including full-width spaces', () => {
  assert.equal(normalizeMultiline('  第一段  \n\u3000第二段\u3000'), '第一段\n第二段')
})

test('removes leading and trailing blank lines', () => {
  assert.equal(normalizeMultiline('\n\n第一段\n\n'), '第一段')
})

test('returns empty string for nullish input', () => {
  assert.equal(normalizeMultiline(null), '')
  assert.equal(normalizeMultiline(undefined), '')
})
