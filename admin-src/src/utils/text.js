// 多行文本（课程介绍 / 教学简介 / 驳回原因等）的展示规范化。
//
// 与小程序端 miniprogram/utils/text.js 保持同一套约定，避免两端展示不一致：
//   - 单个换行 = 段内换行，保留
//   - 两个及以上换行 = 段落分隔，统一压缩为一个空行（即 "\n\n"）
//   - 行首行尾空白（含全角空格）去掉
//   - 首尾空行去掉
//
// 视图侧配合 white-space: pre-wrap 渲染，段落之间就会稳定地出现一个空行。
export function normalizeMultiline(value) {
  if (value == null) return ''
  return String(value)
    // 统一换行符：\r\n / \r / \u2028 / \u2029 -> \n
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n')
    // 去掉每行首尾的空白（含全角空格、制表符），避免出现「看不见的空行」
    .split('\n')
    .map((line) => line.replace(/^[\s\u3000]+|[\s\u3000]+$/g, ''))
    .join('\n')
    // 3 个及以上换行（即 2 个以上空行）压缩为段落分隔
    .replace(/\n{3,}/g, '\n\n')
    // 去掉首尾空行
    .replace(/^\n+|\n+$/g, '')
}
