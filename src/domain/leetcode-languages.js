const DEFINITIONS = [
  { id: 'cpp', label: 'C++', fence: 'cpp', pattern: /```(?:cpp|c\+\+)\s*\r?\n[\s\S]+?```/i },
  { id: 'java', label: 'Java', fence: 'java', pattern: /```java\s*\r?\n[\s\S]+?```/i },
  { id: 'python', label: 'Python', fence: 'python', pattern: /```python\s*\r?\n[\s\S]+?```/i },
  { id: 'c', label: 'C', fence: 'c', pattern: /```c\s*\r?\n[\s\S]+?```/i },
  { id: 'go', label: 'Go', fence: 'go', pattern: /```(?:go|golang)\s*\r?\n[\s\S]+?```/i },
]

export const LEETCODE_LANGUAGES = Object.freeze(DEFINITIONS.map((item) => Object.freeze(item)))
export const LEETCODE_LANGUAGE_IDS = Object.freeze(LEETCODE_LANGUAGES.map((item) => item.id))

export function leetcodeLanguageDefinition(id) {
  return LEETCODE_LANGUAGES.find((item) => item.id === id) || null
}

export function leetcodeLanguageLabel(id) {
  return leetcodeLanguageDefinition(id)?.label || String(id || '')
}
