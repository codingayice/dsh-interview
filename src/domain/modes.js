import { assertDomain } from './errors.js'

export const INTERVIEW_MODES = Object.freeze({
  bagu: Object.freeze({
    id: 'bagu',
    label: '背八股',
    questionStyle: 'knowledge',
  }),
  mock: Object.freeze({
    id: 'mock',
    label: '模拟面试',
    questionStyle: 'adaptive',
  }),
  scenario: Object.freeze({
    id: 'scenario',
    label: '场景题',
    questionStyle: 'scenario',
  }),
  resume: Object.freeze({
    id: 'resume',
    label: '简历出题',
    questionStyle: 'resume',
    requiresSource: true,
  }),
})

export function modeDefinition(mode) {
  const definition = INTERVIEW_MODES[mode]
  assertDomain(definition, 'INVALID_MODE', `不支持的面试模式：${String(mode)}`)
  return definition
}
