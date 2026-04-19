const { runCode } = require('./codeRunner');

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
        if (Array.isArray(q.correctAnswer)) {
          const stuArr = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
          isCorrect =
            stuArr.length === q.correctAnswer.length &&
            stuArr.every(a => q.correctAnswer.includes(a));
        } else {
          isCorrect =
            String(studentAnswer).trim().toLowerCase() ===
            String(q.correctAnswer).trim().toLowerCase();
        }
        marksAwarded = isCorrect ? maxMarks : 0;
      }
    }

    earnedMarks += marksAwarded;

    questionAnalysis.push({
      question: q._id,
      studentAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect,
      marksAwarded,
      maxMarks,
    });
  }

  const percentage = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;
  const passed = percentage >= (test.passmark || 50);

  return { score: earnedMarks, totalMarks, percentage, passed, questionAnalysis };
};

module.exports = { calculateScore };
