export function upsertLeetcodeCard(cards, question) {
  if (!question?.id || !question.leetcode) return cards
  const index = cards.findIndex((item) => item.id === question.id)
  if (index < 0) return [...cards, question]
  if (cards[index] === question) return cards
  const next = [...cards]
  next[index] = question
  return next
}

export function createLeetcodeCardStack(question) {
  return question?.id && question.leetcode ? [question] : []
}
