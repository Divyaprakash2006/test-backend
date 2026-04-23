const { runCode } = require('./codeRunner');

const deriveGradeFromPercentage = (percentage) => {
  const gradePoint = Number((Math.max(0, Math.min(100, percentage)) / 10).toFixed(1));

  if (gradePoint >= 9.0) return { grade: 'O', gradePoint };
  if (gradePoint >= 8.0) return { grade: 'A+', gradePoint };
  if (gradePoint >= 7.0) return { grade: 'A', gradePoint };
  if (gradePoint >= 6.0) return { grade: 'B+', gradePoint };
  if (gradePoint >= 5.0) return { grade: 'B', gradePoint };
  if (gradePoint >= 4.0) return { grade: 'C', gradePoint };
  return { grade: 'U', gradePoint };
};

const normalizeMultiAnswers = (value) => {
  if (Array.isArray(value)) {
    return value.map(v => String(v || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed.split(/[\n,;|]+/).map(v => v.trim()).filter(Boolean);
  }
  if (value === undefined || value === null) return [];
  const text = String(value).trim();
  return text ? [text] : [];
};

const normalizeForCompare = (values) =>
  values.map(v => String(v).trim().toLowerCase());

/**
 * Calculate score for an exam session
 * @param {Object} test - populated test with questions
 * @param {Array} answers - [{question: id, answer: value}]
 * @returns {Promise<Object>} score result
 */
const calculateScore = async (test, answers) => {
  const answerMap = {};
  answers.forEach(a => {
    answerMap[a.question.toString()] = a.answer;
  });

  let totalMarks = 0;
  let earnedMarks = 0;
  const questionAnalysis = [];

  const questions = test.questions || [];
  for (const q of questions) {
    const maxMarks = q.marks || 1;
    totalMarks += maxMarks;
    const studentAnswer = answerMap[q._id.toString()];
    let isCorrect = false;
    let marksAwarded = 0;

    if (studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '') {
      if (q.type === 'coding') {
        const code = studentAnswer.code || '';
        const lang = studentAnswer.language || 'javascript';
        const testCases = q.testCases || [];
        
        let earnedForQ = 0;
        for (const tc of testCases) {
          const runResult = await runCode(code, lang, tc.input);
          if (runResult.output.trim() === tc.output.trim()) {
            earnedForQ += (tc.marks || 0);
          }
        }
        marksAwarded = earnedForQ;
        isCorrect = marksAwarded === maxMarks && maxMarks > 0;
      } else {
        if (q.type === 'mcq-multi' || Array.isArray(q.correctAnswer)) {
          const stuArr = normalizeForCompare(normalizeMultiAnswers(studentAnswer));
          const correctArr = normalizeForCompare(normalizeMultiAnswers(q.correctAnswer));
          const studentSet = new Set(stuArr);
          const correctSet = new Set(correctArr);
          isCorrect =
            studentSet.size === correctSet.size &&
            [...studentSet].every(a => correctSet.has(a));
        } else {
          isCorrect =
            String(studentAnswer).trim().toLowerCase() ===
            String(q.correctAnswer).trim().toLowerCase();
        }
        marksAwarded = isCorrect ? maxMarks : 0;
      }
    }

    earnedMarks += marksAwarded;

    const normalizedStudentAnswer = (q.type === 'mcq-multi' || Array.isArray(q.correctAnswer))
      ? normalizeMultiAnswers(studentAnswer)
      : studentAnswer;
    const normalizedCorrectAnswer = (q.type === 'mcq-multi' || Array.isArray(q.correctAnswer))
      ? normalizeMultiAnswers(q.correctAnswer)
      : q.correctAnswer;

    questionAnalysis.push({
      question: q._id,
      studentAnswer: normalizedStudentAnswer,
      correctAnswer: normalizedCorrectAnswer,
      isCorrect,
      marksAwarded,
      maxMarks,
    });
  }

  const percentage = totalMarks > 0 ? Number(((earnedMarks / totalMarks) * 100).toFixed(1)) : 0;
  const { grade, gradePoint } = deriveGradeFromPercentage(percentage);

  const isGradeMode = test.gradingMode === 'grade-point';
  const threshold = Number(test.passmark);
  const safeThreshold = Number.isFinite(threshold) ? threshold : (isGradeMode ? 5 : 50);
  const passed = isGradeMode ? gradePoint >= safeThreshold : percentage >= safeThreshold;

  return { score: earnedMarks, totalMarks, percentage, grade, gradePoint, passed, questionAnalysis };
};

module.exports = { calculateScore };
