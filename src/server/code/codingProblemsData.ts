export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface CodingProblem {
  id: string;
  slug: string;
  questionId: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: "Arrays" | "Strings" | "Linked List" | "Binary Search" | "Trees" | "Dynamic Programming" | "Graphs" | "Stack";
  companies: string[];
  leetcodeUrl: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  starterCode: {
    python: string;
    cpp: string;
    java: string;
    javascript: string;
  };
  solutionCode?: {
    python: string;
    cpp: string;
    java: string;
  };
  testCases: TestCase[];
  optimalComplexity: {
    time: string;
    space: string;
    approach: string;
  };
}

export const CODING_PROBLEMS: CodingProblem[] = [
  {
    id: "prob-1",
    slug: "two-sum",
    questionId: "1",
    title: "1. Two Sum",
    difficulty: "Easy",
    category: "Arrays",
    companies: ["Amazon", "Google", "TCS Digital", "Microsoft", "Meta"],
    leetcodeUrl: "https://leetcode.com/problems/two-sum/",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have ***exactly one solution***, and you may not use the *same* element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    starterCode: {
      python: `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Write your code here\n        pass`,
      cpp: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        return {};\n    }\n};`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n        return new int[]{};\n    }\n}`,
      javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Write your code here\n}`,
    },
    solutionCode: {
      python: `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        seen = {}\n        for i, n in enumerate(nums):\n            diff = target - n\n            if diff in seen:\n                return [seen[diff], i]\n            seen[n] = i\n        return []`,
      cpp: `#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> seen;\n        for (int i = 0; i < nums.size(); ++i) {\n            int diff = target - nums[i];\n            if (seen.count(diff)) return {seen[diff], i};\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};`,
      java: `import java.util.HashMap;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        HashMap<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int diff = target - nums[i];\n            if (map.containsKey(diff)) {\n                return new int[] { map.get(diff), i };\n            }\n            map.put(nums[i], i);\n        }\n        return new int[] {};\n    }\n}`,
    },
    testCases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]" },
      { input: "[3,2,4]\n6", expectedOutput: "[1,2]" },
      { input: "[3,3]\n6", expectedOutput: "[0,1]" },
      { input: "[1,5,7,12,19]\n20", expectedOutput: "[0,4]", isHidden: true },
    ],
    optimalComplexity: {
      time: "O(N)",
      space: "O(N)",
      approach: "Hash Map single-pass tracking complement (target - x).",
    },
  },
  {
    id: "prob-2",
    slug: "maximum-subarray",
    questionId: "53",
    title: "53. Maximum Subarray (Kadane's Algorithm)",
    difficulty: "Medium",
    category: "Arrays",
    companies: ["Microsoft", "Amazon", "Google", "Adobe", "Apple"],
    leetcodeUrl: "https://leetcode.com/problems/maximum-subarray/",
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return *its sum*.`,
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
      },
      {
        input: "nums = [1]",
        output: "1",
      },
      {
        input: "nums = [5,4,-1,7,8]",
        output: "23",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
    ],
    starterCode: {
      python: `class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        # Write your code here (Kadane's Algorithm)\n        pass`,
      cpp: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Write your code here\n        return 0;\n    }\n};`,
      java: `class Solution {\n    public int maxSubArray(int[] nums) {\n        // Write your code here\n        return 0;\n    }\n}`,
      javascript: `/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction maxSubArray(nums) {\n    // Write your code here\n}`,
    },
    solutionCode: {
      python: `class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        max_sum = nums[0]\n        current_sum = 0\n        for n in nums:\n            current_sum = max(n, current_sum + n)\n            max_sum = max(max_sum, current_sum)\n        return max_sum`,
      cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        int maxSum = nums[0];\n        int currentSum = 0;\n        for (int x : nums) {\n            currentSum = max(x, currentSum + x);\n            maxSum = max(maxSum, currentSum);\n        }\n        return maxSum;\n    }\n};`,
      java: `class Solution {\n    public int maxSubArray(int[] nums) {\n        int maxSum = nums[0];\n        int currentSum = 0;\n        for (int x : nums) {\n            currentSum = Math.max(x, currentSum + x);\n            maxSum = Math.max(maxSum, currentSum);\n        }\n        return maxSum;\n    }\n}`,
    },
    testCases: [
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6" },
      { input: "[1]", expectedOutput: "1" },
      { input: "[5,4,-1,7,8]", expectedOutput: "23" },
      { input: "[-5,-2,-8,-1]", expectedOutput: "-1", isHidden: true },
    ],
    optimalComplexity: {
      time: "O(N)",
      space: "O(1)",
      approach: "Kadane's Algorithm: Maintain running max ending at current index.",
    },
  },
  {
    id: "prob-3",
    slug: "best-time-to-buy-and-sell-stock",
    questionId: "121",
    title: "121. Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    category: "Arrays",
    companies: ["Amazon", "Google", "Microsoft", "TCS Digital", "Goldman Sachs"],
    leetcodeUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
    description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`th day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return *the maximum profit you can achieve from this transaction*. If you cannot achieve any profit, return \`0\`.`,
    examples: [
      {
        input: "prices = [7,1,5,3,6,4]",
        output: "5",
        explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.",
      },
      {
        input: "prices = [7,6,4,3,1]",
        output: "0",
        explanation: "In this case, no transactions are done and max profit = 0.",
      },
    ],
    constraints: [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4",
    ],
    starterCode: {
      python: `class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        # Write your code here\n        pass`,
      cpp: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        // Write your code here\n        return 0;\n    }\n};`,
      java: `class Solution {\n    public int maxProfit(int[] prices) {\n        // Write your code here\n        return 0;\n    }\n}`,
      javascript: `/**\n * @param {number[]} prices\n * @return {number}\n */\nfunction maxProfit(prices) {\n    // Write your code here\n}`,
    },
    solutionCode: {
      python: `class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        min_price = float('inf')\n        max_profit = 0\n        for p in prices:\n            min_price = min(min_price, p)\n            max_profit = max(max_profit, p - min_price)\n        return max_profit`,
      cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        int minPrice = 1e9, maxProfit = 0;\n        for (int p : prices) {\n            minPrice = min(minPrice, p);\n            maxProfit = max(maxProfit, p - minPrice);\n        }\n        return maxProfit;\n    }\n};`,
      java: `class Solution {\n    public int maxProfit(int[] prices) {\n        int minPrice = Integer.MAX_VALUE;\n        int maxProfit = 0;\n        for (int p : prices) {\n            minPrice = Math.min(minPrice, p);\n            maxProfit = Math.max(maxProfit, p - minPrice);\n        }\n        return maxProfit;\n    }\n}`,
    },
    testCases: [
      { input: "[7,1,5,3,6,4]", expectedOutput: "5" },
      { input: "[7,6,4,3,1]", expectedOutput: "0" },
      { input: "[2,4,1,7]", expectedOutput: "6", isHidden: true },
    ],
    optimalComplexity: {
      time: "O(N)",
      space: "O(1)",
      approach: "One pass tracking the historical minimum price and max potential profit.",
    },
  },
  {
    id: "prob-4",
    slug: "valid-parentheses",
    questionId: "20",
    title: "20. Valid Parentheses",
    difficulty: "Easy",
    category: "Stack",
    companies: ["Google", "Meta", "Amazon", "Microsoft", "TCS Digital"],
    leetcodeUrl: "https://leetcode.com/problems/valid-parentheses/",
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."],
    starterCode: {
      python: `class Solution:\n    def isValid(self, s: str) -> bool:\n        # Write your code here (Stack approach)\n        pass`,
      cpp: `#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        // Write your code here\n        return false;\n    }\n};`,
      java: `class Solution {\n    public boolean isValid(String s) {\n        // Write your code here\n        return false;\n    }\n}`,
      javascript: `/**\n * @param {string} s\n * @return {boolean}\n */\nfunction isValid(s) {\n    // Write your code here\n}`,
    },
    solutionCode: {
      python: `class Solution:\n    def isValid(self, s: str) -> bool:\n        stack = []\n        mapping = {')': '(', '}': '{', ']': '['}\n        for char in s:\n            if char in mapping:\n                top = stack.pop() if stack else '#'\n                if mapping[char] != top:\n                    return False\n            else:\n                stack.append(char)\n        return not stack`,
      cpp: `#include <string>\n#include <stack>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        stack<char> st;\n        for (char c : s) {\n            if (c == '(' || c == '{' || c == '[') st.push(c);\n            else {\n                if (st.empty()) return false;\n                char top = st.top(); st.pop();\n                if (c == ')' && top != '(') return false;\n                if (c == '}' && top != '{') return false;\n                if (c == ']' && top != '[') return false;\n            }\n        }\n        return st.empty();\n    }\n};`,
      java: `import java.util.Stack;\n\nclass Solution {\n    public boolean isValid(String s) {\n        Stack<Character> st = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(' || c == '{' || c == '[') st.push(c);\n            else {\n                if (st.isEmpty()) return false;\n                char top = st.pop();\n                if (c == ')' && top != '(') return false;\n                if (c == '}' && top != '{') return false;\n                if (c == ']' && top != '[') return false;\n            }\n        }\n        return st.isEmpty();\n    }\n}`,
    },
    testCases: [
      { input: '"()"', expectedOutput: "true" },
      { input: '"()[]{}"', expectedOutput: "true" },
      { input: '"(]"', expectedOutput: "false" },
      { input: '"{[]}"', expectedOutput: "true", isHidden: true },
      { input: '"([)]"', expectedOutput: "false", isHidden: true },
    ],
    optimalComplexity: {
      time: "O(N)",
      space: "O(N)",
      approach: "LIFO Stack structure matching closing brackets with most recent open bracket.",
    },
  },
  {
    id: "prob-5",
    slug: "search-in-rotated-sorted-array",
    questionId: "33",
    title: "33. Search in Rotated Sorted Array",
    difficulty: "Medium",
    category: "Binary Search",
    companies: ["Google", "Amazon", "Microsoft", "Meta", "Adobe"],
    leetcodeUrl: "https://leetcode.com/problems/search-in-rotated-sorted-array/",
    description: `There is an integer array \`nums\` sorted in ascending order (with **distinct** values).

Prior to being passed to your function, \`nums\` is **possibly rotated** at an unknown pivot index \`k\` (\`1 <= k < nums.length\`).

Given the array \`nums\` after the possible rotation and an integer \`target\`, return *the index of \`target\` if it is in \`nums\`, or \`-1\` if it is not in \`nums\`*.

You must write an algorithm with \`O(log n)\` runtime complexity.`,
    examples: [
      { input: "nums = [4,5,6,7,0,1,2], target = 0", output: "4" },
      { input: "nums = [4,5,6,7,0,1,2], target = 3", output: "-1" },
      { input: "nums = [1], target = 0", output: "-1" },
    ],
    constraints: [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i] <= 10^4",
      "All values of nums are unique.",
    ],
    starterCode: {
      python: `class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        # Write your code here (O(log N) binary search)\n        pass`,
      cpp: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        // Write your code here\n        return -1;\n    }\n};`,
      java: `class Solution {\n    public int search(int[] nums, int target) {\n        // Write your code here\n        return -1;\n    }\n}`,
      javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number}\n */\nfunction search(nums, target) {\n    // Write your code here\n}`,
    },
    solutionCode: {
      python: `class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        left, right = 0, len(nums) - 1\n        while left <= right:\n            mid = (left + right) // 2\n            if nums[mid] == target:\n                return mid\n            if nums[left] <= nums[mid]:\n                if nums[left] <= target < nums[mid]:\n                    right = mid - 1\n                else:\n                    left = mid + 1\n            else:\n                if nums[mid] < target <= nums[right]:\n                    left = mid + 1\n                else:\n                    right = mid - 1\n        return -1`,
      cpp: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        int left = 0, right = nums.size() - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[left] <= nums[mid]) {\n                if (nums[left] <= target && target < nums[mid]) right = mid - 1;\n                else left = mid + 1;\n            } else {\n                if (nums[mid] < target && target <= nums[right]) left = mid + 1;\n                else right = mid - 1;\n            }\n        }\n        return -1;\n    }\n};`,
      java: `class Solution {\n    public int search(int[] nums, int target) {\n        int left = 0, right = nums.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[left] <= nums[mid]) {\n                if (nums[left] <= target && target < nums[mid]) right = mid - 1;\n                else left = mid + 1;\n            } else {\n                if (nums[mid] < target && target <= nums[right]) left = mid + 1;\n                else right = mid - 1;\n            }\n        }\n        return -1;\n    }\n}`,
    },
    testCases: [
      { input: "[4,5,6,7,0,1,2]\n0", expectedOutput: "4" },
      { input: "[4,5,6,7,0,1,2]\n3", expectedOutput: "-1" },
      { input: "[1]\n0", expectedOutput: "-1" },
      { input: "[5,1,3]\n5", expectedOutput: "0", isHidden: true },
    ],
    optimalComplexity: {
      time: "O(log N)",
      space: "O(1)",
      approach: "Modified binary search determining which half is sorted on each partition.",
    },
  },
  {
    id: "prob-6",
    slug: "coin-change",
    questionId: "322",
    title: "322. Coin Change",
    difficulty: "Medium",
    category: "Dynamic Programming",
    companies: ["Amazon", "Google", "Microsoft", "Paypal", "ServiceNow"],
    leetcodeUrl: "https://leetcode.com/problems/coin-change/",
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return *the fewest number of coins that you need to make up that amount*. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

You may assume that you have an infinite number of each kind of coin.`,
    examples: [
      { input: "coins = [1,2,5], amount = 11", output: "3", explanation: "11 = 5 + 5 + 1" },
      { input: "coins = [2], amount = 3", output: "-1" },
      { input: "coins = [1], amount = 0", output: "0" },
    ],
    constraints: [
      "1 <= coins.length <= 12",
      "1 <= coins[i] <= 2^31 - 1",
      "0 <= amount <= 10^4",
    ],
    starterCode: {
      python: `class Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        # Write your code here (Dynamic Programming)\n        pass`,
      cpp: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        // Write your code here\n        return -1;\n    }\n};`,
      java: `class Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Write your code here\n        return -1;\n    }\n}`,
      javascript: `/**\n * @param {number[]} coins\n * @param {number} amount\n * @return {number}\n */\nfunction coinChange(coins, amount) {\n    // Write your code here\n}`,
    },
    solutionCode: {
      python: `class Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        dp = [float('inf')] * (amount + 1)\n        dp[0] = 0\n        for c in coins:\n            for i in range(c, amount + 1):\n                dp[i] = min(dp[i], dp[i - c] + 1)\n        return dp[amount] if dp[amount] != float('inf') else -1`,
      cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        vector<int> dp(amount + 1, 1e9);\n        dp[0] = 0;\n        for (int c : coins) {\n            for (int i = c; i <= amount; ++i) {\n                dp[i] = min(dp[i], dp[i - c] + 1);\n            }\n        }\n        return dp[amount] >= 1e9 ? -1 : dp[amount];\n    }\n};`,
      java: `import java.util.Arrays;\n\nclass Solution {\n    public int coinChange(int[] coins, int amount) {\n        int[] dp = new int[amount + 1];\n        Arrays.fill(dp, 1000000);\n        dp[0] = 0;\n        for (int c : coins) {\n            for (int i = c; i <= amount; i++) {\n                dp[i] = Math.min(dp[i], dp[i - c] + 1);\n            }\n        }\n        return dp[amount] >= 1000000 ? -1 : dp[amount];\n    }\n}`,
    },
    testCases: [
      { input: "[1,2,5]\n11", expectedOutput: "3" },
      { input: "[2]\n3", expectedOutput: "-1" },
      { input: "[1]\n0", expectedOutput: "0" },
      { input: "[1,3,4,5]\n7", expectedOutput: "2", isHidden: true },
    ],
    optimalComplexity: {
      time: "O(Amount * len(coins))",
      space: "O(Amount)",
      approach: "Bottom-up Dynamic Programming (1D knapsack variation).",
    },
  },
];
