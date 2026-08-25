export interface StriverProblem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  subtopic: string;
  leetcodeUrl: string;
  companies: string[];
  optimalComplexity: { time: string; space: string };
  keyIdea: string;
}

export const STRIVER_HASHING_PROBLEMS: StriverProblem[] = [
  {
    id: "hashing-1",
    title: "Two Sum",
    difficulty: "Easy",
    topic: "Hashing",
    subtopic: "Basic Hashing & Lookups",
    leetcodeUrl: "https://leetcode.com/problems/two-sum/",
    companies: ["Google", "Amazon", "Microsoft", "Meta"],
    optimalComplexity: { time: "O(N)", space: "O(N)" },
    keyIdea: "Use a HashMap to store target - nums[i] index while iterating.",
  },
  {
    id: "hashing-2",
    title: "Count Frequencies of Elements in Array",
    difficulty: "Easy",
    topic: "Hashing",
    subtopic: "Frequency Array & Map",
    leetcodeUrl: "https://leetcode.com/problems/frequency-of-the-most-frequent-element/",
    companies: ["Amazon", "TCS Digital", "Accenture"],
    optimalComplexity: { time: "O(N)", space: "O(N)" },
    keyIdea: "Store frequency counts in an unordered_map or frequency array.",
  },
  {
    id: "hashing-3",
    title: "Longest Consecutive Sequence in an Array",
    difficulty: "Medium",
    topic: "Hashing",
    subtopic: "Set & Sequence Lookups",
    leetcodeUrl: "https://leetcode.com/problems/longest-consecutive-sequence/",
    companies: ["Google", "Amazon", "Microsoft", "Adobe"],
    optimalComplexity: { time: "O(N)", space: "O(N)" },
    keyIdea: "Put elements in an unordered_set. Only start counting sequence if (num - 1) is NOT in set.",
  },
  {
    id: "hashing-4",
    title: "Longest Subarray with Sum K",
    difficulty: "Medium",
    topic: "Hashing",
    subtopic: "Prefix Sum + HashMap",
    leetcodeUrl: "https://leetcode.com/problems/subarray-sum-equals-k/",
    companies: ["Amazon", "Uber", "Flipkart", "Goldman Sachs"],
    optimalComplexity: { time: "O(N)", space: "O(N)" },
    keyIdea: "Maintain running prefix sum in a map. Check if (prefixSum - K) was previously seen.",
  },
  {
    id: "hashing-5",
    title: "Subarray Sum Equals K (Count Total)",
    difficulty: "Medium",
    topic: "Hashing",
    subtopic: "Prefix Sum + HashMap",
    leetcodeUrl: "https://leetcode.com/problems/subarray-sum-equals-k/",
    companies: ["Meta", "Amazon", "Microsoft", "Oracle"],
    optimalComplexity: { time: "O(N)", space: "O(N)" },
    keyIdea: "Store prefixSum frequency in map. Add map[prefixSum - k] to total answer at every step.",
  },
  {
    id: "hashing-6",
    title: "Count Subarrays with Given XOR K",
    difficulty: "Medium",
    topic: "Hashing",
    subtopic: "Prefix XOR + HashMap",
    leetcodeUrl: "https://leetcode.com/problems/subarray-sums-divisible-by-k/",
    companies: ["Amazon", "Dunzo", "Directi"],
    optimalComplexity: { time: "O(N)", space: "O(N)" },
    keyIdea: "Use xr = xr ^ nums[i]. Check map for xr ^ k and update answer with its frequency.",
  },
  {
    id: "hashing-7",
    title: "4Sum Problem",
    difficulty: "Hard",
    topic: "Hashing",
    subtopic: "Multi-Pointer + Hashing",
    leetcodeUrl: "https://leetcode.com/problems/4sum/",
    companies: ["Amazon", "Microsoft", "Adobe", "Morgan Stanley"],
    optimalComplexity: { time: "O(N^3)", space: "O(1) aux" },
    keyIdea: "Sort array, fix two pointers i & j, then use two-pointer technique on remaining range.",
  },
  {
    id: "hashing-8",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    topic: "Hashing",
    subtopic: "Sliding Window + Hashing",
    leetcodeUrl: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
    companies: ["Google", "Amazon", "Meta", "Bloomberg"],
    optimalComplexity: { time: "O(N)", space: "O(min(N, 256))" },
    keyIdea: "Sliding window with map storing last seen index of each character to skip duplicate left bounds.",
  }
];
