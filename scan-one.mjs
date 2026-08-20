// 详细扫描指定会话：事件类型统计 + 错误事件 + 关键内容
import { readFileSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'

const file = process.argv[2]
const buf = readFileSync(file)
function frames(buf) {
  const out = []
  let off = 0
  while (off + 6 <= buf.length) {
    if (buf.readUInt32LE(off) !== 0xFD2FB528) { off++; continue }
    const start = off
    let p = off + 4
    const desc = buf.readUInt8(p); p++
    const fcsFlag = (desc >> 6) & 3
    const single = (desc & 0x20) !== 0
    const dictFlag = desc & 0x03
    if (!single) { const wd = buf.readUInt8(p); p++; if (wd & 0x80) p++ }
    if (dictFlag === 1) p += 1
    else if (dictFlag === 2) p += 2
    else if (dictFlag === 3) p += 4
    if (single) { if (fcsFlag === 0 || fcsFlag === 1) p += 1; else if (fcsFlag === 2) p += 2; else p += 4 }
    else { if (fcsFlag === 1) p += 1; else if (fcsFlag === 2) p += 2; else if (fcsFlag === 3) p += 4 }
    let end = p
    try {
      while (true) {
        if (end + 3 > buf.length) break
        const bh = buf.readUInt32LE(end) & 0xFFFFFF
        const last = bh & 1
        const btype = (bh >> 1) & 3
        const bsize = (bh >> 3) & 0x1FFFFF
        end += 3
        if (btype !== 0) end += bsize
        if (last) break
      }
      out.push(zstdDecompressSync(buf.subarray(start, end)).toString('utf8'))
      off = end
    } catch { off = start + 5 }
  }
  return out
}

const lines = frames(buf)
const types = {}
for (const l of lines) {
  try {
    const j = JSON.parse(l)
    types[j.type] = (types[j.type] || 0) + 1
    if (/error|fail|reject|exception/i.test(j.type)) console.log('ERR-TYPE:', l.slice(0, 400))
  } catch {}
}
console.log('event types:', JSON.stringify(types, null, 1))
for (const l of lines) {
  try {
    const j = JSON.parse(l)
    const d = j.data || {}
    if (j.type === 'user/message') {
      const c = d.content || []
      const text = c.map((p) => p.text || '').join('')
      console.log('USER(' + j.seq + '): ' + text.slice(0, 200))
    }
    if (j.type === 'command/done') console.log('CMD-DONE: kind=' + d.kind + ' text=' + String(d.text || '').slice(0, 200))
    if (j.type === 'assistant/message') {
      const c = d.message?.content || []
      const text = c.map((p) => (p.type === 'text' ? p.text : '[' + p.type + ']')).join(' ')
      console.log('ASSISTANT(' + j.seq + '): ' + text.slice(0, 300))
    }
  } catch {}
}
