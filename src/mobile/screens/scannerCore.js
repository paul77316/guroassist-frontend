export const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function classifyDarkness(ratios, choiceCount) {
  const available = ratios.slice(0, choiceCount);
  const sorted = [...available].sort((a, b) => b - a);
  const strongest = sorted[0] ?? 0;
  const second = sorted[1] ?? 0;

  if (strongest < 0.08) return { kind: 'blank', confidence: 'clear' };
  if (strongest >= 0.3 && strongest - second >= 0.16) {
    const index = available.indexOf(strongest);
    return { kind: 'choice', value: LETTERS[index], confidence: 'clear' };
  }
  if (strongest >= 0.3 && second >= 0.3) return { kind: 'multiple', confidence: 'review' };
  return { kind: null, value: null, confidence: 'review' };
}

export function aggregateSheet(questions, answers, choiceCount) {
  return questions.map((question, index) => {
    const answer = answers[index];
    const choiceCounts = Object.fromEntries(LETTERS.slice(0, choiceCount).map((letter) => [letter, 0]));
    let blankCount = 0;
    let multipleCount = 0;
    if (answer?.kind === 'choice' && choiceCounts[answer.value] !== undefined) choiceCounts[answer.value] = 1;
    else if (answer?.kind === 'blank') blankCount = 1;
    else if (answer?.kind === 'multiple') multipleCount = 1;
    return { question_id: question.question_id, choice_counts: choiceCounts, blank_count: blankCount, multiple_count: multipleCount };
  });
}

export function mergeSheetCounts(total, incoming) {
  const byId = new Map(total.map((row) => [row.question_id, row]));
  for (const next of incoming) {
    const current = byId.get(next.question_id);
    if (!current) {
      byId.set(next.question_id, structuredClone(next));
      continue;
    }
    for (const letter of Object.keys(current.choice_counts)) current.choice_counts[letter] += next.choice_counts[letter] ?? 0;
    current.blank_count += next.blank_count;
    current.multiple_count += next.multiple_count;
  }
  return [...byId.values()];
}
