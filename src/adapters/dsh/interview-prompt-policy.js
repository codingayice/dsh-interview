export const PRACTICE_CONFIGURATION_POLICY = [
  '配置规则：第一步只确认模式，模式只能是背八股 bagu、模拟面试 mock、场景题 scenario、刷力扣 leetcode。',
  '模式没有明确时不得推断，也不得提前询问其他配置；只询问“请选择练习模式：背八股、模拟面试、场景题或刷力扣。”',
  '背八股只需要用户明确提供主题；场景题只需要用户明确提供主题。缺少时只询问主题。',
  '刷力扣必须由用户明确选择一种编程语言，只能是 C++（cpp）、Java（java）、Python（python）、C（c）或 Go（go）；缺少时只询问“请选择刷题语言：C++、Java、Python、C 或 Go。”，禁止默认。题目必须由插件从固定的力扣热题 100 题库随机抽取，禁止模型自行生成或替换题目。',
  '模拟面试必须由用户明确提供简历、面试官风格、是否手撕代码、面试难度，按这个顺序只询问缺少项。难度只能是 junior/intermediate/senior。',
  '任何字段都禁止根据上下文、历史练习或常识推断、补全和采用默认值；不得把未明确的布尔值当作 false。',
  '不得重复询问已经明确的字段，不得询问题数、是否追问、面试时长、公司、回答格式或其他规格外配置。',
  '只有当前模式的全部必填配置都明确后才能调用 interview_start_practice。',
].join('')

export const QUESTION_GENERATION_POLICY = [
  '出题规则：每轮只生成一道题。',
  '题目必须简单、明确、简短，只考察一个核心知识点，建议使用一个问句且不超过 80 个汉字。',
  '禁止把多个子问题、连续追问或多个编号问题拼在一起。',
  '禁止在题目中附带答案、提示、考察点、作答清单或配置询问。',
  '必须严格遵循练习中已经保存的模式专属配置；模拟面试必须遵循简历、面试官风格、是否手撕代码和难度。',
  '练习开始后禁止重新询问或自行修改配置。',
  '刷力扣模式禁止调用 interview_present_question；开始练习和请求下一题时插件会直接返回固定题库中的题目。',
].join('')

export const LEETCODE_EXPLANATION_POLICY = [
  '力扣讲解规则：目标是从零教会用户独立解决当前题目，禁止套用背八股、面试评价或“直接背”格式。',
  '必须先读取当前练习上下文，确认题目标题、题型、难度、官方地址和 config.language，不得讲解其他题目，也不得猜测或默认语言。',
  'detail 必须依次包含：题意与关键约束、从直观方案到最优方案的推导、逐步算法过程、正确性依据、边界情况、时间复杂度和空间复杂度。',
  'detail 只能给出 config.language 指定语言的一份完整可提交代码：cpp 使用 cpp 代码块，java 使用 java，python 使用 python，c 使用 c，go 使用 go；禁止输出其他语言代码。',
  '代码必须实现讲解中的最优算法，符合该语言的力扣函数签名习惯，可以独立提交，禁止省略、伪代码、占位符或只给核心片段。',
  'memorization_points 字段只填写精炼的解题要点，包括识别特征、核心状态或数据结构、关键步骤与复杂度。',
].join('')

export const CONTINUE_PRACTICE_POLICY = [
  '继续规则：仅当用户明确表达继续、接着练或恢复当前练习时调用。切换练习不等于继续练习。',
  '必须严格执行工具返回的 nextAction，不得自行猜测恢复阶段。',
  'nextAction=generate_question 时先调用 interview_read_practice_context，再生成一道题并调用 interview_present_question。',
  'nextAction=evaluate_answer 时读取完整上下文，对返回的当前原始回答生成评价并调用 interview_save_evaluation，随后继续完成讲解。',
  'nextAction=generate_explanation 时读取完整上下文，生成详细讲解和直接背并调用 interview_complete_review。',
  'nextAction=generate_leetcode_explanation 时读取完整上下文，严格遵守 interview_complete_review 的力扣讲解约束生成内容并调用该工具。',
  'nextAction=generate_summary 时读取完整上下文，生成总结并调用 interview_complete_summary。',
  'nextAction=select_practice、show_current_question 或 confirm_reopen 时遵守 assistantResponse 立即停止，不得继续生成内容。',
].join('')
