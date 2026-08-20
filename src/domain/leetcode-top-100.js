export const LEETCODE_TOP_100_SOURCE = Object.freeze({
  name: 'LeetCode 热题 100',
  url: 'https://leetcode.cn/studyplan/top-100-liked/',
})

const DIFFICULTY_LABELS = Object.freeze({ easy: '简单', medium: '中等', hard: '困难' })

export function leetcodeDifficultyLabel(difficulty) {
  return DIFFICULTY_LABELS[difficulty] || String(difficulty || '')
}

const GROUPS = [
  { category: '哈希', problems: [
    ['1', '两数之和', 'two-sum', 'easy'],
    ['49', '字母异位词分组', 'group-anagrams', 'medium'],
    ['128', '最长连续序列', 'longest-consecutive-sequence', 'medium'],
  ] },
  { category: '双指针', problems: [
    ['283', '移动零', 'move-zeroes', 'easy'],
    ['11', '盛最多水的容器', 'container-with-most-water', 'medium'],
    ['15', '三数之和', '3sum', 'medium'],
    ['42', '接雨水', 'trapping-rain-water', 'hard'],
  ] },
  { category: '滑动窗口', problems: [
    ['3', '无重复字符的最长子串', 'longest-substring-without-repeating-characters', 'medium'],
    ['438', '找到字符串中所有字母异位词', 'find-all-anagrams-in-a-string', 'medium'],
  ] },
  { category: '子串', problems: [
    ['560', '和为 K 的子数组', 'subarray-sum-equals-k', 'medium'],
    ['239', '滑动窗口最大值', 'sliding-window-maximum', 'hard'],
    ['76', '最小覆盖子串', 'minimum-window-substring', 'hard'],
  ] },
  { category: '普通数组', problems: [
    ['53', '最大子数组和', 'maximum-subarray', 'medium'],
    ['56', '合并区间', 'merge-intervals', 'medium'],
    ['189', '轮转数组', 'rotate-array', 'medium'],
    ['238', '除了自身以外数组的乘积', 'product-of-array-except-self', 'medium'],
    ['41', '缺失的第一个正数', 'first-missing-positive', 'hard'],
  ] },
  { category: '矩阵', problems: [
    ['73', '矩阵置零', 'set-matrix-zeroes', 'medium'],
    ['54', '螺旋矩阵', 'spiral-matrix', 'medium'],
    ['48', '旋转图像', 'rotate-image', 'medium'],
    ['240', '搜索二维矩阵 II', 'search-a-2d-matrix-ii', 'medium'],
  ] },
  { category: '链表', problems: [
    ['160', '相交链表', 'intersection-of-two-linked-lists', 'easy'],
    ['206', '反转链表', 'reverse-linked-list', 'easy'],
    ['234', '回文链表', 'palindrome-linked-list', 'easy'],
    ['141', '环形链表', 'linked-list-cycle', 'easy'],
    ['142', '环形链表 II', 'linked-list-cycle-ii', 'medium'],
    ['21', '合并两个有序链表', 'merge-two-sorted-lists', 'easy'],
    ['2', '两数相加', 'add-two-numbers', 'medium'],
    ['19', '删除链表的倒数第 N 个结点', 'remove-nth-node-from-end-of-list', 'medium'],
    ['24', '两两交换链表中的节点', 'swap-nodes-in-pairs', 'medium'],
    ['25', 'K 个一组翻转链表', 'reverse-nodes-in-k-group', 'hard'],
    ['138', '随机链表的复制', 'copy-list-with-random-pointer', 'medium'],
    ['148', '排序链表', 'sort-list', 'medium'],
    ['23', '合并 K 个升序链表', 'merge-k-sorted-lists', 'hard'],
    ['146', 'LRU 缓存', 'lru-cache', 'medium'],
  ] },
  { category: '二叉树', problems: [
    ['94', '二叉树的中序遍历', 'binary-tree-inorder-traversal', 'easy'],
    ['104', '二叉树的最大深度', 'maximum-depth-of-binary-tree', 'easy'],
    ['226', '翻转二叉树', 'invert-binary-tree', 'easy'],
    ['101', '对称二叉树', 'symmetric-tree', 'easy'],
    ['543', '二叉树的直径', 'diameter-of-binary-tree', 'easy'],
    ['102', '二叉树的层序遍历', 'binary-tree-level-order-traversal', 'medium'],
    ['108', '将有序数组转换为二叉搜索树', 'convert-sorted-array-to-binary-search-tree', 'easy'],
    ['98', '验证二叉搜索树', 'validate-binary-search-tree', 'medium'],
    ['230', '二叉搜索树中第 K 小的元素', 'kth-smallest-element-in-a-bst', 'medium'],
    ['199', '二叉树的右视图', 'binary-tree-right-side-view', 'medium'],
    ['114', '二叉树展开为链表', 'flatten-binary-tree-to-linked-list', 'medium'],
    ['105', '从前序与中序遍历序列构造二叉树', 'construct-binary-tree-from-preorder-and-inorder-traversal', 'medium'],
    ['437', '路径总和 III', 'path-sum-iii', 'medium'],
    ['236', '二叉树的最近公共祖先', 'lowest-common-ancestor-of-a-binary-tree', 'medium'],
    ['124', '二叉树中的最大路径和', 'binary-tree-maximum-path-sum', 'hard'],
  ] },
  { category: '图论', problems: [
    ['200', '岛屿数量', 'number-of-islands', 'medium'],
    ['994', '腐烂的橘子', 'rotting-oranges', 'medium'],
    ['207', '课程表', 'course-schedule', 'medium'],
    ['208', '实现 Trie (前缀树)', 'implement-trie-prefix-tree', 'medium'],
  ] },
  { category: '回溯', problems: [
    ['46', '全排列', 'permutations', 'medium'],
    ['78', '子集', 'subsets', 'medium'],
    ['17', '电话号码的字母组合', 'letter-combinations-of-a-phone-number', 'medium'],
    ['39', '组合总和', 'combination-sum', 'medium'],
    ['22', '括号生成', 'generate-parentheses', 'medium'],
    ['79', '单词搜索', 'word-search', 'medium'],
    ['131', '分割回文串', 'palindrome-partitioning', 'medium'],
    ['51', 'N 皇后', 'n-queens', 'hard'],
  ] },
  { category: '二分查找', problems: [
    ['35', '搜索插入位置', 'search-insert-position', 'easy'],
    ['74', '搜索二维矩阵', 'search-a-2d-matrix', 'medium'],
    ['34', '在排序数组中查找元素的第一个和最后一个位置', 'find-first-and-last-position-of-element-in-sorted-array', 'medium'],
    ['33', '搜索旋转排序数组', 'search-in-rotated-sorted-array', 'medium'],
    ['153', '寻找旋转排序数组中的最小值', 'find-minimum-in-rotated-sorted-array', 'medium'],
    ['4', '寻找两个正序数组的中位数', 'median-of-two-sorted-arrays', 'hard'],
  ] },
  { category: '栈', problems: [
    ['20', '有效的括号', 'valid-parentheses', 'easy'],
    ['155', '最小栈', 'min-stack', 'medium'],
    ['394', '字符串解码', 'decode-string', 'medium'],
    ['739', '每日温度', 'daily-temperatures', 'medium'],
    ['84', '柱状图中最大的矩形', 'largest-rectangle-in-histogram', 'hard'],
  ] },
  { category: '堆', problems: [
    ['215', '数组中的第K个最大元素', 'kth-largest-element-in-an-array', 'medium'],
    ['347', '前 K 个高频元素', 'top-k-frequent-elements', 'medium'],
    ['295', '数据流的中位数', 'find-median-from-data-stream', 'hard'],
  ] },
  { category: '贪心算法', problems: [
    ['121', '买卖股票的最佳时机', 'best-time-to-buy-and-sell-stock', 'easy'],
    ['55', '跳跃游戏', 'jump-game', 'medium'],
    ['45', '跳跃游戏 II', 'jump-game-ii', 'medium'],
    ['763', '划分字母区间', 'partition-labels', 'medium'],
  ] },
  { category: '动态规划', problems: [
    ['70', '爬楼梯', 'climbing-stairs', 'easy'],
    ['118', '杨辉三角', 'pascals-triangle', 'easy'],
    ['198', '打家劫舍', 'house-robber', 'medium'],
    ['279', '完全平方数', 'perfect-squares', 'medium'],
    ['322', '零钱兑换', 'coin-change', 'medium'],
    ['139', '单词拆分', 'word-break', 'medium'],
    ['300', '最长递增子序列', 'longest-increasing-subsequence', 'medium'],
    ['152', '乘积最大子数组', 'maximum-product-subarray', 'medium'],
    ['416', '分割等和子集', 'partition-equal-subset-sum', 'medium'],
    ['32', '最长有效括号', 'longest-valid-parentheses', 'hard'],
  ] },
  { category: '多维动态规划', problems: [
    ['62', '不同路径', 'unique-paths', 'medium'],
    ['64', '最小路径和', 'minimum-path-sum', 'medium'],
    ['5', '最长回文子串', 'longest-palindromic-substring', 'medium'],
    ['1143', '最长公共子序列', 'longest-common-subsequence', 'medium'],
    ['72', '编辑距离', 'edit-distance', 'medium'],
  ] },
  { category: '技巧', problems: [
    ['136', '只出现一次的数字', 'single-number', 'easy'],
    ['169', '多数元素', 'majority-element', 'easy'],
    ['75', '颜色分类', 'sort-colors', 'medium'],
    ['31', '下一个排列', 'next-permutation', 'medium'],
    ['287', '寻找重复数', 'find-the-duplicate-number', 'medium'],
  ] },
]

export const LEETCODE_TOP_100_GROUPS = Object.freeze(GROUPS.map((group) => Object.freeze({
  category: group.category,
  problems: Object.freeze(group.problems.map(([id, title, slug, difficulty]) => Object.freeze({
    id,
    title,
    slug,
    difficulty,
    category: group.category,
    url: `https://leetcode.cn/problems/${slug}/`,
  }))),
})))

export const LEETCODE_TOP_100 = Object.freeze(LEETCODE_TOP_100_GROUPS.flatMap((group) => group.problems))

const PROBLEM_BY_SLUG = new Map(LEETCODE_TOP_100.map((problem) => [problem.slug, problem]))

export function leetcodeTop100Problem(slug) {
  return PROBLEM_BY_SLUG.get(slug) || null
}
