/**
 * 条件分支问卷数据结构
 *
 * 数据结构说明：
 * 1. 每个答案可以指定 nextQuestionId，表示选择该答案后跳转到哪个问题
 * 2. 每个问题可以设置 conditions，根据之前的答案来决定是否显示该问题
 * 3. 每个答案可以设置 conditions，根据之前的答案来决定是否显示该选项
 * 4. 如果 nextQuestionId 为 null 或 'end'，表示问卷结束
 *
 * conditions 格式：
 * - showIf: 显示条件，对象格式 { questionId: answerId } 或 { questionId: [answerId1, answerId2] }
 * - hideIf: 隐藏条件，格式同上
 */
const questionaire = {
  name: 'Answer a few questions to find out which water filter fits your personal needs.',
  consuming: '2 MINS',
  startQuestionId: '1', // 起始问题ID
  questions: [
    {
      id: '1',
      question: "What's your main purpose for using a water filter?",
      conditions: null,
      answers: [
        {
          id: '1-1',
          answer: 'Drinking & cooking water',
          nextQuestionId: '2'
        },
        {
          id: '1-2',
          answer: 'Indoor water safety',
          // 直接跳转到问题6，跳过问题2-5
          nextQuestionId: '6'
        },
        {
          id: '1-3',
          answer: 'Outdoor water safety',
          // 直接跳转到问题6，跳过问题2-5
          nextQuestionId: '6'
        },
        {
          id: '1-4',
          answer: 'Skin care',
          // 直接跳转到问题6，跳过问题2-5
          nextQuestionId: '6'
        }
      ]
    },
    {
      id: '2',
      question: 'What type of filtration material would you prefer?',
      // 此问题只在选择了问题1的答案1-1后显示
      conditions: {
        showIf: { 1: '1-1' }
      },
      answers: [
        {
          id: '2-1',
          answer: 'Reverse Osmosis',
          description:
            'Best for reducing heavy metals, bacteria, viruses, chemicals, chlorine, improving water taste, and many other contaminants.',
          nextQuestionId: '3'
        },
        {
          id: '2-2',
          answer: 'Ultrafiltration',
          description: 'Effective for reducing bacteria, viruses, and particles, while retaining minerals.',
          // 跳过问题3和5，直接到问题4，然后到问题6
          nextQuestionId: '4'
        },
        {
          id: '2-3',
          answer: 'Carbon Filtration',
          description: 'Best for reducing taste and removing chlorine, odors, and some organic compounds.',
          nextQuestionId: '3'
        }
      ]
    },
    {
      id: '3',
      question: 'Where do you plan to install the filter?',
      // 此问题只在选择了问题2的答案2-1或2-3后显示（2-2跳过此问题）
      conditions: {
        showIf: { 2: ['2-1', '2-3'] }
      },
      answers: [
        {
          id: '3-1',
          answer: 'Under the sink',
          nextQuestionId: '4'
        },
        {
          id: '3-2',
          answer: 'On the counter',
          nextQuestionId: '4'
        }
      ]
    },
    {
      id: '4',
      question: 'What size of filter capacity do you need?',
      conditions: null,
      answers: [
        {
          id: '4-1',
          answer: 'Small (1-2 people)',
          // 如果从问题2-2来，直接跳转到问题6；否则跳转到问题5
          // 使用条件化的nextQuestionId
          nextQuestionId: '5', // 默认值
          conditionalNextQuestionId: {
            // 如果选择了2-2，跳转到问题6
            showIf: { 2: '2-2' },
            nextQuestionId: '6'
          }
        },
        {
          id: '4-2',
          answer: 'Medium (3-4 people)',
          nextQuestionId: '5',
          conditionalNextQuestionId: {
            showIf: { 2: '2-2' },
            nextQuestionId: '6'
          }
        },
        {
          id: '4-3',
          answer: 'Large (5+ people)',
          nextQuestionId: '5',
          conditionalNextQuestionId: {
            showIf: { 2: '2-2' },
            nextQuestionId: '6'
          }
        }
      ]
    },
    {
      id: '5',
      question: 'What features are you looking for in a water filter?',
      // 问题5只在从问题4来时显示，且不是从问题2-2来的（2-2会跳过问题5）
      conditions: {
        showIf: { 4: ['4-1', '4-2', '4-3'] },
        hideIf: { 2: '2-2' }
      },
      answers: [
        {
          id: '5-1',
          answer: 'Mineral or alkaline water',
          // 只有选择了Reverse Osmosis（2-1）才显示此选项
          conditions: {
            showIf: { 2: '2-1' }
          },
          nextQuestionId: '6'
        },
        {
          id: '5-2',
          answer: 'Standard filtration',
          // 显示条件：选择了2-1或2-3，且不是2-3+3-2的组合（2-3+3-2会显示5-5,5-6,5-7）
          conditions: {
            showIf: { 2: ['2-1', '2-3'] },
            hideIf: { 3: '3-2' }
          },
          nextQuestionId: '6'
        },
        {
          id: '5-3',
          answer: 'Instant Hot',
          // 只有选择了Under the sink（3-1）才显示此选项
          conditions: {
            showIf: { 3: '3-1' }
          },
          // 如果选择了3-1，5-3可以直接结束（不跳转到问题6）
          nextQuestionId: null
        },
        {
          id: '5-4',
          answer: 'Instant Hot and Cold',
          // 只有选择了Under the sink（3-1）才显示此选项
          conditions: {
            showIf: { 3: '3-1' }
          },
          nextQuestionId: '6'
        },
        {
          id: '5-5',
          answer: 'Electric Water Filter Pitchers',
          // 只在选择了2-3和3-2时显示
          conditions: {
            showIf: { 2: '2-3', 3: '3-2' }
          },
          nextQuestionId: '6'
        },
        {
          id: '5-6',
          answer: 'Basic Pitchers',
          // 只在选择了2-3和3-2时显示
          conditions: {
            showIf: { 2: '2-3', 3: '3-2' }
          },
          nextQuestionId: '6'
        },
        {
          id: '5-7',
          answer: 'Faucet water filters',
          // 只在选择了2-3和3-2时显示
          conditions: {
            showIf: { 2: '2-3', 3: '3-2' }
          },
          nextQuestionId: '6'
        }
      ]
    },
    {
      id: '6',
      question: "What's your budget for a water filter?",
      conditions: null,
      answers: [
        {
          id: '6-1',
          answer: 'Generous budget',
          nextQuestionId: null // 问卷结束
        },
        {
          id: '6-2',
          answer: 'Moderate budget',
          nextQuestionId: null
        },
        {
          id: '6-3',
          answer: 'Tight budget',
          nextQuestionId: null
        }
      ]
    }
  ]
}

/**
 * 辅助函数：根据已答问题获取下一个问题
 * @param {string} currentQuestionId - 当前问题ID
 * @param {string} selectedAnswerId - 选择的答案ID
 * @param {Object} answeredQuestions - 已答问题对象，格式：{ questionId: answerId }
 * @returns {string|null} 下一个问题ID，如果为null表示问卷结束
 */
function getNextQuestionId(currentQuestionId, selectedAnswerId, answeredQuestions = {}) {
  const question = questionaire.questions.find(q => q.id === currentQuestionId)
  if (!question) return null

  const answer = question.answers.find(a => a.id === selectedAnswerId)
  if (!answer) return null

  // 检查是否有条件化的nextQuestionId
  if (answer.conditionalNextQuestionId) {
    const conditional = answer.conditionalNextQuestionId
    if (checkConditions({ showIf: conditional.showIf }, answeredQuestions)) {
      return conditional.nextQuestionId || null
    }
  }

  return answer.nextQuestionId || null
}

/**
 * 辅助函数：检查条件是否满足
 * @param {Object} conditions - 条件对象，格式：{ showIf: { questionId: answerId } } 或 { hideIf: { questionId: answerId } }
 * @param {Object} answeredQuestions - 已答问题对象，格式：{ questionId: answerId }
 * @returns {boolean} 是否满足条件
 */
function checkConditions(conditions, answeredQuestions) {
  if (!conditions) return true

  if (conditions.showIf) {
    for (const [questionId, expectedAnswers] of Object.entries(conditions.showIf)) {
      const answered = answeredQuestions[questionId]
      if (Array.isArray(expectedAnswers)) {
        // 期望的答案是数组，检查是否包含
        if (!expectedAnswers.includes(answered)) {
          return false
        }
      } else if (answered !== expectedAnswers) {
        // 期望的答案是单个值
        return false
      }
    }
    return true
  }

  if (conditions.hideIf) {
    for (const [questionId, expectedAnswers] of Object.entries(conditions.hideIf)) {
      const answered = answeredQuestions[questionId]
      if (Array.isArray(expectedAnswers)) {
        if (expectedAnswers.includes(answered)) {
          return false
        }
      } else if (answered === expectedAnswers) {
        return false
      }
    }
    return true
  }

  return true
}

/**
 * 辅助函数：根据已答问题获取当前问题应该显示的答案选项
 * @param {string} questionId - 问题ID
 * @param {Object} answeredQuestions - 已答问题对象，格式：{ questionId: answerId }
 * @returns {Array} 应该显示的答案选项数组
 */
function _getVisibleAnswers(questionId, answeredQuestions) {
  const question = questionaire.questions.find(q => q.id === questionId)
  if (!question) return []

  // 检查问题本身是否应该显示
  if (!checkConditions(question.conditions, answeredQuestions)) {
    return []
  }

  // 过滤答案选项
  return question.answers.filter(answer => checkConditions(answer.conditions, answeredQuestions))
}

/**
 * 辅助函数：根据已答问题获取下一个应该显示的问题
 * @param {Object} answeredQuestions - 已答问题对象，格式：{ questionId: answerId }
 * @returns {Object|null} 下一个问题对象，如果为null表示问卷结束
 */
function _getNextQuestion(answeredQuestions) {
  // 找到最后一个已回答的问题
  const questionIds = Object.keys(answeredQuestions)
  if (questionIds.length === 0) {
    // 没有已回答的问题，返回起始问题
    return questionaire.questions.find(q => q.id === questionaire.startQuestionId) || null
  }

  const lastQuestionId = questionIds[questionIds.length - 1]
  const lastAnswerId = answeredQuestions[lastQuestionId]
  const nextQuestionId = getNextQuestionId(lastQuestionId, lastAnswerId, answeredQuestions)

  if (!nextQuestionId) return null

  const nextQuestion = questionaire.questions.find(q => q.id === nextQuestionId)
  if (!nextQuestion) return null

  // 检查下一个问题是否应该显示
  if (!checkConditions(nextQuestion.conditions, answeredQuestions)) {
    // 如果下一个问题不满足显示条件，继续查找
    return null
  }

  return nextQuestion
}

const _allowRoutes = [
  ['1-1', '2-1', '3-1', '4-1', '5-1', '6-1'],
  ['1-1', '2-1', '3-1', '4-1', '5-1', '6-2'],
  ['1-1', '2-1', '3-1', '4-1', '5-1', '6-3'],
  ['1-1', '2-1', '3-1', '4-1', '5-2', '6-1'],
  ['1-1', '2-1', '3-1', '4-1', '5-2', '6-2'],
  ['1-1', '2-1', '3-1', '4-1', '5-2', '6-3'],
  ['1-1', '2-1', '3-1', '4-1', '5-3'],
  ['1-1', '2-1', '3-1', '4-2', '5-1', '6-1'],
  ['1-1', '2-1', '3-1', '4-2', '5-1', '6-2'],
  ['1-1', '2-1', '3-1', '4-2', '5-1', '6-3'],
  ['1-1', '2-1', '3-1', '4-2', '5-2', '6-1'],
  ['1-1', '2-1', '3-1', '4-2', '5-2', '6-2'],
  ['1-1', '2-1', '3-1', '4-2', '5-2', '6-3'],
  ['1-1', '2-1', '3-1', '4-2', '5-3'],
  ['1-1', '2-1', '3-1', '4-3', '5-1', '6-1'],
  ['1-1', '2-1', '3-1', '4-3', '5-1', '6-2'],
  ['1-1', '2-1', '3-1', '4-3', '5-1', '6-3'],
  ['1-1', '2-1', '3-1', '4-3', '5-2', '6-1'],
  ['1-1', '2-1', '3-1', '4-3', '5-2', '6-2'],
  ['1-1', '2-1', '3-1', '4-3', '5-2', '6-3'],
  ['1-1', '2-1', '3-1', '4-3', '5-3'],

  ['1-1', '2-1', '3-2', '4-1', '5-3', '6-1'],
  ['1-1', '2-1', '3-2', '4-1', '5-3', '6-2'],
  ['1-1', '2-1', '3-2', '4-1', '5-3', '6-3'],
  ['1-1', '2-1', '3-2', '4-1', '5-4', '6-1'],
  ['1-1', '2-1', '3-2', '4-1', '5-4', '6-2'],
  ['1-1', '2-1', '3-2', '4-1', '5-1', '6-1'],
  ['1-1', '2-1', '3-2', '4-1', '5-1', '6-2'],
  ['1-1', '2-1', '3-2', '4-1', '5-2', '6-1'],
  ['1-1', '2-1', '3-2', '4-1', '5-2', '6-2'],
  ['1-1', '2-1', '3-2', '4-1', '5-2', '6-3'],
  ['1-1', '2-1', '3-2', '4-2', '5-3', '6-1'],
  ['1-1', '2-1', '3-2', '4-2', '5-3', '6-2'],
  ['1-1', '2-1', '3-2', '4-2', '5-3', '6-3'],
  ['1-1', '2-1', '3-2', '4-2', '5-4', '6-1'],
  ['1-1', '2-1', '3-2', '4-2', '5-4', '6-2'],
  ['1-1', '2-1', '3-2', '4-2', '5-1', '6-1'],
  ['1-1', '2-1', '3-2', '4-2', '5-1', '6-2'],
  ['1-1', '2-1', '3-2', '4-2', '5-2', '6-1'],
  ['1-1', '2-1', '3-2', '4-2', '5-2', '6-2'],
  ['1-1', '2-1', '3-2', '4-2', '5-2', '6-3'],
  ['1-1', '2-1', '3-2', '4-3', '5-3', '6-1'],
  ['1-1', '2-1', '3-2', '4-3', '5-3', '6-2'],
  ['1-1', '2-1', '3-2', '4-3', '5-3', '6-3'],
  ['1-1', '2-1', '3-2', '4-3', '5-4', '6-1'],
  ['1-1', '2-1', '3-2', '4-3', '5-4', '6-2'],
  ['1-1', '2-1', '3-2', '4-3', '5-1', '6-1'],
  ['1-1', '2-1', '3-2', '4-3', '5-1', '6-2'],
  ['1-1', '2-1', '3-2', '4-3', '5-2', '6-1'],
  ['1-1', '2-1', '3-2', '4-3', '5-2', '6-2'],
  ['1-1', '2-1', '3-2', '4-3', '5-2', '6-3'],

  ['1-1', '2-2', '4-1', '6-1'],
  ['1-1', '2-2', '4-1', '6-2'],
  ['1-1', '2-2', '4-1', '6-3'],
  ['1-1', '2-2', '4-2', '6-1'],
  ['1-1', '2-2', '4-2', '6-2'],
  ['1-1', '2-2', '4-2', '6-3'],
  ['1-1', '2-2', '4-3', '6-1'],
  ['1-1', '2-2', '4-3', '6-2'],
  ['1-1', '2-2', '4-3', '6-3'],

  ['1-1', '2-3', '3-1', '4-1', '5-1', '6-1'],
  ['1-1', '2-3', '3-1', '4-1', '5-1', '6-3'],
  ['1-1', '2-3', '3-1', '4-1', '5-2', '6-1'],
  ['1-1', '2-3', '3-1', '4-1', '5-2', '6-2'],
  ['1-1', '2-3', '3-1', '4-1', '5-2', '6-3'],
  ['1-1', '2-3', '3-1', '4-1', '5-2', '6-3'],
  ['1-1', '2-3', '3-1', '4-2', '5-1', '6-1'],
  ['1-1', '2-3', '3-1', '4-2', '5-1', '6-3'],
  ['1-1', '2-3', '3-1', '4-2', '5-2', '6-1'],
  ['1-1', '2-3', '3-1', '4-2', '5-2', '6-2'],
  ['1-1', '2-3', '3-1', '4-2', '5-2', '6-3'],
  ['1-1', '2-3', '3-1', '4-2', '5-2', '6-3'],
  ['1-1', '2-3', '3-1', '4-3', '5-1', '6-1'],
  ['1-1', '2-3', '3-1', '4-3', '5-1', '6-3'],
  ['1-1', '2-3', '3-1', '4-3', '5-2', '6-1'],
  ['1-1', '2-3', '3-1', '4-3', '5-2', '6-2'],
  ['1-1', '2-3', '3-1', '4-3', '5-2', '6-3'],
  ['1-1', '2-3', '3-1', '4-3', '5-2', '6-3'],

  ['1-1', '2-3', '3-2', '4-1', '5-5', '6-1'],
  ['1-1', '2-3', '3-2', '4-1', '5-5', '6-2'],
  ['1-1', '2-3', '3-2', '4-1', '5-5', '6-3'],
  ['1-1', '2-3', '3-2', '4-1', '5-6', '6-1'],
  ['1-1', '2-3', '3-2', '4-1', '5-6', '6-2'],
  ['1-1', '2-3', '3-2', '4-1', '5-6', '6-3'],
  ['1-1', '2-3', '3-2', '4-1', '5-7', '6-1'],
  ['1-1', '2-3', '3-2', '4-1', '5-7', '6-2'],
  ['1-1', '2-3', '3-2', '4-1', '5-7', '6-3'],
  ['1-1', '2-3', '3-2', '4-2', '5-5', '6-1'],
  ['1-1', '2-3', '3-2', '4-2', '5-5', '6-2'],
  ['1-1', '2-3', '3-2', '4-2', '5-5', '6-3'],
  ['1-1', '2-3', '3-2', '4-2', '5-6', '6-1'],
  ['1-1', '2-3', '3-2', '4-2', '5-6', '6-2'],
  ['1-1', '2-3', '3-2', '4-2', '5-6', '6-3'],
  ['1-1', '2-3', '3-2', '4-2', '5-7', '6-1'],
  ['1-1', '2-3', '3-2', '4-2', '5-7', '6-2'],
  ['1-1', '2-3', '3-2', '4-2', '5-7', '6-3'],
  ['1-1', '2-3', '3-2', '4-3', '5-5', '6-1'],
  ['1-1', '2-3', '3-2', '4-3', '5-5', '6-2'],
  ['1-1', '2-3', '3-2', '4-3', '5-5', '6-3'],
  ['1-1', '2-3', '3-2', '4-3', '5-6', '6-1'],
  ['1-1', '2-3', '3-2', '4-3', '5-6', '6-2'],
  ['1-1', '2-3', '3-2', '4-3', '5-6', '6-3'],
  ['1-1', '2-3', '3-2', '4-3', '5-7', '6-1'],
  ['1-1', '2-3', '3-2', '4-3', '5-7', '6-2'],
  ['1-1', '2-3', '3-2', '4-3', '5-7', '6-3'],

  ['1-2', '6-1'],
  ['1-2', '6-2'],
  ['1-2', '6-3'],

  ['1-3', '6-1'],
  ['1-3', '6-2'],
  ['1-3', '6-3'],

  ['1-4', '6-1'],
  ['1-4', '6-2'],
  ['1-4', '6-3']
]
