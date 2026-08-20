// 扫描会话日志：zstd 多帧，每帧是多行 JSONL，逐行输出
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { zstdDecompressSync } from 'node:zlib'

const target = process.argv[2] // 会话文件路径，或省略扫描全部最近会话
const sessionsRoot = 'C:\\Users\\27116\\.dsh\\sessions'

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
      const text = zstdDecompressSync(buf.subarray(start, end)).toString('utf8')
      out.push(text)
      off = end
    } catch { off = start + 5 }
  }
  return out
}

function linesOf(file) {
  const buf = readFileSync(file)
  const result = []
  for (const chunk of frames(buf)) {
    for (const line of chunk.split('\n')) {
      const t = line.trim()
      if (t) result.push(t)
    }
  }
  return result
}

function fmtTime(ms) {
  const d = new Date(ms)
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0')
}

const files = target ? [target] : (() => {
  const now = Date.now()
  const list = []
  function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.zstd') && now - statSync(p).mtimeMs < 40 * 60 * 1000) list.push(p)
    }
  }
  walk(sessionsRoot)
  return list
})()

for (const file of files) {
  const name = file.split('\\').slice(-2).join('/')
  console.log('\n========== ' + name + ' ==========')
  const lines = linesOf(file)
  for (const l of lines) {
    try {
      const j = JSON.parse(l)
      const d = j.data || {}
      switch (j.type) {
        case 'command/run': console.log(fmtTime(j.time) + ' [CMD-RUN] ' + d.name + ' args=' + JSON.stringify(d.args)); break
        case 'command/done': console.log(fmtTime(j.time) + ' [CMD-DONE] kind=' + d.kind + ' text=' + String(d.text || '').slice(0, 150)); break
        case 'user/message': {
          const text = (d.content || []).map((p) => p.text || '').join('')
          console.log(fmtTime(j.time) + ' [USER] ' + text.slice(0, 150))
          break
        }
        case 'assistant/message': {
          const text = (d.message?.content || []).map((p) => (p.type === 'text' ? p.text : '[' + p.type + ']')).join(' ')
          console.log(fmtTime(j.time) + ' [ASSIST] ' + text.slice(0, 200))
          break
        }
        case 'tool/call': console.log(fmtTime(j.time) + ' [TOOL] ' + d.name + ' ' + String(d.arguments).slice(0, 120)); break
        case 'tool/result': console.log(fmtTime(j.time) + ' [TOOL-RESULT] isError=' + (d.message?.isError ?? false) + ' ' + JSON.stringify(d.message?.content || []).slice(0, 150)); break
        case 'turn/start': console.log(fmtTime(j.time) + ' [TURN-START] turn=' + d.turn); break
        case 'turn/end': console.log(fmtTime(j.time) + ' [TURN-END] turn=' + d.turn + ' reason=' + (d.reason ? JSON.stringify(d.reason) : '')); break
        case 'agent/inbox/spliced': console.log(fmtTime(j.time) + ' [INBOX] target=' + d.target + ' inserted=' + (d.inserted || []).length); break
        default:
          if (/error|fail|warn/i.test(j.type)) console.log(fmtTime(j.time) + ' [' + j.type + '] ' + l.slice(0, 300))
      }
    } catch { /* 非 JSON 行忽略 */ }
  }
}
