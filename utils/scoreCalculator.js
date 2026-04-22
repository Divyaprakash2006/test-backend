const { runCode } = require('./codeRunner');

const deriveGradeFromPercentage = (percentage) => {
  if (percentage >= 90) return { grade: 'O', gradePoint: 10.0 };
  if (percentage >= 80) return { grade: 'A+', gradePoint: 9.0 };
  if (percentage >= 70) return { grade: 'A', gradePoint: 8.0 };
  if (percentage >= 60) return { grade: 'B+', gradePoint: 7.0 };
  if (percentage >= 50) return { grade: 'B', gradePoint: 6.0 };
  if (percentage >= 40) return { grade: 'C', gradePoint: 5.0 };
  return { grade: 'U', gradePoint: 0.0 };
};

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
  const { grade, gradePoint } = deriveGradeFromPercentage(percentage);

  const isGradeMode = test.gradingMode === 'grade-point';
  const threshold = Number(test.passmark);
  const safeThreshold = Number.isFinite(threshold) ? threshold : (isGradeMode ? 5 : 50);
  const passed = isGradeMode ? gradePoint >= safeThreshold : percentage >= safeThreshold;

  return { score: earnedMarks, totalMarks, percentage, grade, gradePoint, passed, questionAnalysis };
};

module.exports = { calculateScore };
