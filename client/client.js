window.__ModuleLoader__.load({ id: "dsh-interview", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.js
var index_exports = {};
__export(index_exports, {
  ToolResourceView: () => ToolResourceView,
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  resolveToolView: () => resolveToolView
});
module.exports = __toCommonJS(index_exports);
var import_react7 = __toESM(require("react"), 1);

// src/client/features/live-interview.js
var import_react4 = __toESM(require("react"), 1);

// src/client/shared/api.js
var cache = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
async function jsonRequest(url, options) {
  const response = await fetch(url, options);
  const value = await response.json().catch(() => null);
  if (!response.ok || value?.error) {
    const error = new Error(value?.error?.message || `HTTP ${response.status}`);
    error.code = value?.error?.code || "REQUEST_FAILED";
    throw error;
  }
  return value;
}
function queryString(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== void 0 && value !== null && value !== "") params.set(key, value);
  return params.toString();
}
var interviewApi = {
  session(sessionId) {
    return jsonRequest(`/interview/api/session?${queryString({ session: sessionId })}`);
  },
  practices(filters = {}) {
    return jsonRequest(`/interview/api/practices?${queryString(filters)}`);
  },
  practice(practiceId) {
    return jsonRequest(`/interview/api/practice?${queryString({ id: practiceId })}`);
  },
  insights() {
    return jsonRequest("/interview/api/insights");
  },
  leetcodeCatalog() {
    return jsonRequest("/interview/api/leetcode");
  },
  async command(sessionId, command, payload = {}) {
    const value = await jsonRequest("/interview/api/command", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session: sessionId, command, payload })
    });
    cache.clear();
    for (const listener of listeners) listener(value.revision);
    return value;
  },
  downloadUrl(token) {
    return `/interview/api/download?${queryString({ token })}`;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  cached(key, loader) {
    if (!cache.has(key)) cache.set(key, Promise.resolve().then(loader).catch((error) => {
      cache.delete(key);
      throw error;
    }));
    return cache.get(key);
  },
  invalidate() {
    cache.clear();
    for (const listener of listeners) listener(Date.now());
  }
};

// src/client/shared/hooks.js
var import_react = __toESM(require("react"), 1);
function useInterviewQuery(key, loader, dependencies = [], options = {}) {
  const cache2 = options.cache !== false;
  const [state, setState] = import_react.default.useState({ loading: true, data: null, error: "" });
  const load = import_react.default.useCallback((force = false) => {
    setState((current) => ({ ...current, loading: current.data === null, error: "" }));
    const request = force || !cache2 ? Promise.resolve().then(loader) : interviewApi.cached(key, loader);
    return request.then((data) => setState({ loading: false, data, error: "" })).catch((error) => setState((current) => ({ ...current, loading: false, error: error.message || "\u52A0\u8F7D\u5931\u8D25" })));
  }, [key, cache2, ...dependencies]);
  import_react.default.useEffect(() => {
    load();
    return interviewApi.subscribe(() => load(true));
  }, [load]);
  return { ...state, reload: () => load(true) };
}
function useCommand(sessionId) {
  const [state, setState] = import_react.default.useState({ busy: "", error: "" });
  const run = import_react.default.useCallback(async (command, payload = {}) => {
    setState({ busy: command, error: "" });
    try {
      return await interviewApi.command(sessionId, command, payload);
    } catch (error) {
      setState({ busy: "", error: error.message || "\u64CD\u4F5C\u5931\u8D25" });
      throw error;
    } finally {
      setState((current) => ({ ...current, busy: "" }));
    }
  }, [sessionId]);
  return { ...state, run, clearError: () => setState((current) => ({ ...current, error: "" })) };
}

// src/client/shared/ui.js
var import_react2 = __toESM(require("react"), 1);
var primitives = __toESM(require("@deepseek-ai/dsh-client-ui-primitives"), 1);
var h = import_react2.default.createElement;
var MarkdownText2 = primitives.MarkdownText;
function Markdown({ children }) {
  const text = String(children || "");
  return MarkdownText2 ? h(MarkdownText2, { text, content: text }) : h("div", { className: "di-preline" }, text);
}
var ICON_PATHS = {
  check: [h("path", { key: "p", d: "m5 12 4 4L19 6" })],
  eye: [h("path", { key: "p", d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" }), h("circle", { key: "c", cx: 12, cy: 12, r: 2.5 })],
  copy: [h("rect", { key: "a", x: 9, y: 9, width: 10, height: 10, rx: 1.5 }), h("path", { key: "b", d: "M15 9V6.5A1.5 1.5 0 0 0 13.5 5h-7A1.5 1.5 0 0 0 5 6.5v7A1.5 1.5 0 0 0 6.5 15H9" })],
  swap: [h("path", { key: "a", d: "M7 7h11l-3-3m3 3-3 3" }), h("path", { key: "b", d: "M17 17H6l3 3m-3-3 3-3" })],
  trash: [h("path", { key: "a", d: "M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" })],
  download: [h("path", { key: "a", d: "M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" })]
};
function Icon({ name: name2, size = 18 }) {
  return h("svg", {
    className: "di-icon",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, ...ICON_PATHS[name2] || []);
}
function StarRating({ score }) {
  const normalized = Math.max(0, Math.min(5, Number(score || 0) / 2));
  return h(
    "div",
    { className: "di-stars", "aria-label": `${Number(score || 0)} \u5206\uFF0C\u6EE1\u5206 10 \u5206` },
    Array.from({ length: 5 }, (_, index) => {
      const fill = Math.max(0, Math.min(1, normalized - index)) * 100;
      return h("span", { className: "di-star", key: index, style: { "--di-star-fill": `${fill}%` } }, "\u2605");
    })
  );
}
function resultText(block) {
  return (block?.content || []).filter((item) => item?.type === "text" && typeof item.text === "string").map((item) => item.text).join("\n");
}
function parseInteractionResult(block) {
  try {
    const value = JSON.parse(resultText(block));
    return value?.protocol === "dsh-interview/interaction-v1" ? value : null;
  } catch {
    return null;
  }
}
function toolCallState(block) {
  if (!block || !("kind" in block)) return "running";
  return block.isError ? "error" : "success";
}
function toolErrorMessage(block) {
  const text = resultText(block).trim();
  return text || block?.error?.message || block?.error?.code || "\u5DE5\u5177\u6267\u884C\u5931\u8D25";
}
function toolErrorAudience(block) {
  const code = block?.error?.code || block?.error?.info?.code;
  return code === "INVALID_ARGS" ? "agent" : "user";
}
function PhaseBadge({ phase }) {
  const labels = {
    awaiting_question: "\u51C6\u5907\u51FA\u9898",
    awaiting_solution: "\u5237\u9898\u4E2D",
    awaiting_answer: "\u7B49\u5F85\u56DE\u7B54",
    awaiting_evaluation: "\u6B63\u5728\u8BC4\u4EF7",
    generating_explanation: "\u6B63\u5728\u751F\u6210\u70B9\u8BC4\u8BB2\u89E3",
    generating_summary: "\u6B63\u5728\u751F\u6210\u7EC3\u4E60\u603B\u7ED3",
    awaiting_next: "\u70B9\u8BC4\u8BB2\u89E3\u5B8C\u6210",
    completed: "\u7EC3\u4E60\u5DF2\u7ED3\u675F",
    idle: "\u672A\u9009\u62E9\u7EC3\u4E60"
  };
  return h("span", { className: `di-phase di-phase-${phase || "idle"}` }, labels[phase] || phase);
}
function ScoreRail({ score, compact = false }) {
  const normalized = Number.isFinite(Number(score)) ? Math.max(0, Math.min(10, Number(score))) : null;
  const tone = normalized === null ? "empty" : normalized >= 8 ? "good" : normalized >= 6 ? "mid" : "low";
  return h(
    "span",
    { className: `di-score-rail ${compact ? "is-compact" : ""}`, "aria-label": normalized === null ? "\u672A\u8BC4\u5206" : `${normalized} \u5206` },
    Array.from({ length: 10 }, (_, index) => h("i", { key: index, className: index < Math.round(normalized || 0) ? `is-on is-${tone}` : "" }))
  );
}
function Loading({ label = "\u6B63\u5728\u8BFB\u53D6\u9762\u8BD5\u6863\u6848\u2026" }) {
  return h("div", { className: "di-state" }, h("span", { className: "di-spinner" }), label);
}
function ErrorNotice({ children }) {
  return children ? h("div", { className: "di-notice is-error", role: "alert" }, children) : null;
}
function Empty({ title, detail }) {
  return h("div", { className: "di-empty" }, h("strong", null, title), detail ? h("span", null, detail) : null);
}
function Button({ children, tone = "quiet", busy = false, ...props }) {
  return h("button", { ...props, className: `di-button is-${tone}${props.className ? ` ${props.className}` : ""}`, disabled: props.disabled || busy }, busy ? "\u5904\u7406\u4E2D\u2026" : children);
}

// src/client/features/leetcode.js
var import_react3 = __toESM(require("react"), 1);

// src/domain/leetcode-top-100.js
var LEETCODE_TOP_100_SOURCE = Object.freeze({
  name: "LeetCode \u70ED\u9898 100",
  url: "https://leetcode.cn/studyplan/top-100-liked/"
});
var DIFFICULTY_LABELS = Object.freeze({ easy: "\u7B80\u5355", medium: "\u4E2D\u7B49", hard: "\u56F0\u96BE" });
function leetcodeDifficultyLabel(difficulty) {
  return DIFFICULTY_LABELS[difficulty] || String(difficulty || "");
}
var GROUPS = [
  { category: "\u54C8\u5E0C", problems: [
    ["1", "\u4E24\u6570\u4E4B\u548C", "two-sum", "easy"],
    ["49", "\u5B57\u6BCD\u5F02\u4F4D\u8BCD\u5206\u7EC4", "group-anagrams", "medium"],
    ["128", "\u6700\u957F\u8FDE\u7EED\u5E8F\u5217", "longest-consecutive-sequence", "medium"]
  ] },
  { category: "\u53CC\u6307\u9488", problems: [
    ["283", "\u79FB\u52A8\u96F6", "move-zeroes", "easy"],
    ["11", "\u76DB\u6700\u591A\u6C34\u7684\u5BB9\u5668", "container-with-most-water", "medium"],
    ["15", "\u4E09\u6570\u4E4B\u548C", "3sum", "medium"],
    ["42", "\u63A5\u96E8\u6C34", "trapping-rain-water", "hard"]
  ] },
  { category: "\u6ED1\u52A8\u7A97\u53E3", problems: [
    ["3", "\u65E0\u91CD\u590D\u5B57\u7B26\u7684\u6700\u957F\u5B50\u4E32", "longest-substring-without-repeating-characters", "medium"],
    ["438", "\u627E\u5230\u5B57\u7B26\u4E32\u4E2D\u6240\u6709\u5B57\u6BCD\u5F02\u4F4D\u8BCD", "find-all-anagrams-in-a-string", "medium"]
  ] },
  { category: "\u5B50\u4E32", problems: [
    ["560", "\u548C\u4E3A K \u7684\u5B50\u6570\u7EC4", "subarray-sum-equals-k", "medium"],
    ["239", "\u6ED1\u52A8\u7A97\u53E3\u6700\u5927\u503C", "sliding-window-maximum", "hard"],
    ["76", "\u6700\u5C0F\u8986\u76D6\u5B50\u4E32", "minimum-window-substring", "hard"]
  ] },
  { category: "\u666E\u901A\u6570\u7EC4", problems: [
    ["53", "\u6700\u5927\u5B50\u6570\u7EC4\u548C", "maximum-subarray", "medium"],
    ["56", "\u5408\u5E76\u533A\u95F4", "merge-intervals", "medium"],
    ["189", "\u8F6E\u8F6C\u6570\u7EC4", "rotate-array", "medium"],
    ["238", "\u9664\u4E86\u81EA\u8EAB\u4EE5\u5916\u6570\u7EC4\u7684\u4E58\u79EF", "product-of-array-except-self", "medium"],
    ["41", "\u7F3A\u5931\u7684\u7B2C\u4E00\u4E2A\u6B63\u6570", "first-missing-positive", "hard"]
  ] },
  { category: "\u77E9\u9635", problems: [
    ["73", "\u77E9\u9635\u7F6E\u96F6", "set-matrix-zeroes", "medium"],
    ["54", "\u87BA\u65CB\u77E9\u9635", "spiral-matrix", "medium"],
    ["48", "\u65CB\u8F6C\u56FE\u50CF", "rotate-image", "medium"],
    ["240", "\u641C\u7D22\u4E8C\u7EF4\u77E9\u9635 II", "search-a-2d-matrix-ii", "medium"]
  ] },
  { category: "\u94FE\u8868", problems: [
    ["160", "\u76F8\u4EA4\u94FE\u8868", "intersection-of-two-linked-lists", "easy"],
    ["206", "\u53CD\u8F6C\u94FE\u8868", "reverse-linked-list", "easy"],
    ["234", "\u56DE\u6587\u94FE\u8868", "palindrome-linked-list", "easy"],
    ["141", "\u73AF\u5F62\u94FE\u8868", "linked-list-cycle", "easy"],
    ["142", "\u73AF\u5F62\u94FE\u8868 II", "linked-list-cycle-ii", "medium"],
    ["21", "\u5408\u5E76\u4E24\u4E2A\u6709\u5E8F\u94FE\u8868", "merge-two-sorted-lists", "easy"],
    ["2", "\u4E24\u6570\u76F8\u52A0", "add-two-numbers", "medium"],
    ["19", "\u5220\u9664\u94FE\u8868\u7684\u5012\u6570\u7B2C N \u4E2A\u7ED3\u70B9", "remove-nth-node-from-end-of-list", "medium"],
    ["24", "\u4E24\u4E24\u4EA4\u6362\u94FE\u8868\u4E2D\u7684\u8282\u70B9", "swap-nodes-in-pairs", "medium"],
    ["25", "K \u4E2A\u4E00\u7EC4\u7FFB\u8F6C\u94FE\u8868", "reverse-nodes-in-k-group", "hard"],
    ["138", "\u968F\u673A\u94FE\u8868\u7684\u590D\u5236", "copy-list-with-random-pointer", "medium"],
    ["148", "\u6392\u5E8F\u94FE\u8868", "sort-list", "medium"],
    ["23", "\u5408\u5E76 K \u4E2A\u5347\u5E8F\u94FE\u8868", "merge-k-sorted-lists", "hard"],
    ["146", "LRU \u7F13\u5B58", "lru-cache", "medium"]
  ] },
  { category: "\u4E8C\u53C9\u6811", problems: [
    ["94", "\u4E8C\u53C9\u6811\u7684\u4E2D\u5E8F\u904D\u5386", "binary-tree-inorder-traversal", "easy"],
    ["104", "\u4E8C\u53C9\u6811\u7684\u6700\u5927\u6DF1\u5EA6", "maximum-depth-of-binary-tree", "easy"],
    ["226", "\u7FFB\u8F6C\u4E8C\u53C9\u6811", "invert-binary-tree", "easy"],
    ["101", "\u5BF9\u79F0\u4E8C\u53C9\u6811", "symmetric-tree", "easy"],
    ["543", "\u4E8C\u53C9\u6811\u7684\u76F4\u5F84", "diameter-of-binary-tree", "easy"],
    ["102", "\u4E8C\u53C9\u6811\u7684\u5C42\u5E8F\u904D\u5386", "binary-tree-level-order-traversal", "medium"],
    ["108", "\u5C06\u6709\u5E8F\u6570\u7EC4\u8F6C\u6362\u4E3A\u4E8C\u53C9\u641C\u7D22\u6811", "convert-sorted-array-to-binary-search-tree", "easy"],
    ["98", "\u9A8C\u8BC1\u4E8C\u53C9\u641C\u7D22\u6811", "validate-binary-search-tree", "medium"],
    ["230", "\u4E8C\u53C9\u641C\u7D22\u6811\u4E2D\u7B2C K \u5C0F\u7684\u5143\u7D20", "kth-smallest-element-in-a-bst", "medium"],
    ["199", "\u4E8C\u53C9\u6811\u7684\u53F3\u89C6\u56FE", "binary-tree-right-side-view", "medium"],
    ["114", "\u4E8C\u53C9\u6811\u5C55\u5F00\u4E3A\u94FE\u8868", "flatten-binary-tree-to-linked-list", "medium"],
    ["105", "\u4ECE\u524D\u5E8F\u4E0E\u4E2D\u5E8F\u904D\u5386\u5E8F\u5217\u6784\u9020\u4E8C\u53C9\u6811", "construct-binary-tree-from-preorder-and-inorder-traversal", "medium"],
    ["437", "\u8DEF\u5F84\u603B\u548C III", "path-sum-iii", "medium"],
    ["236", "\u4E8C\u53C9\u6811\u7684\u6700\u8FD1\u516C\u5171\u7956\u5148", "lowest-common-ancestor-of-a-binary-tree", "medium"],
    ["124", "\u4E8C\u53C9\u6811\u4E2D\u7684\u6700\u5927\u8DEF\u5F84\u548C", "binary-tree-maximum-path-sum", "hard"]
  ] },
  { category: "\u56FE\u8BBA", problems: [
    ["200", "\u5C9B\u5C7F\u6570\u91CF", "number-of-islands", "medium"],
    ["994", "\u8150\u70C2\u7684\u6A58\u5B50", "rotting-oranges", "medium"],
    ["207", "\u8BFE\u7A0B\u8868", "course-schedule", "medium"],
    ["208", "\u5B9E\u73B0 Trie (\u524D\u7F00\u6811)", "implement-trie-prefix-tree", "medium"]
  ] },
  { category: "\u56DE\u6EAF", problems: [
    ["46", "\u5168\u6392\u5217", "permutations", "medium"],
    ["78", "\u5B50\u96C6", "subsets", "medium"],
    ["17", "\u7535\u8BDD\u53F7\u7801\u7684\u5B57\u6BCD\u7EC4\u5408", "letter-combinations-of-a-phone-number", "medium"],
    ["39", "\u7EC4\u5408\u603B\u548C", "combination-sum", "medium"],
    ["22", "\u62EC\u53F7\u751F\u6210", "generate-parentheses", "medium"],
    ["79", "\u5355\u8BCD\u641C\u7D22", "word-search", "medium"],
    ["131", "\u5206\u5272\u56DE\u6587\u4E32", "palindrome-partitioning", "medium"],
    ["51", "N \u7687\u540E", "n-queens", "hard"]
  ] },
  { category: "\u4E8C\u5206\u67E5\u627E", problems: [
    ["35", "\u641C\u7D22\u63D2\u5165\u4F4D\u7F6E", "search-insert-position", "easy"],
    ["74", "\u641C\u7D22\u4E8C\u7EF4\u77E9\u9635", "search-a-2d-matrix", "medium"],
    ["34", "\u5728\u6392\u5E8F\u6570\u7EC4\u4E2D\u67E5\u627E\u5143\u7D20\u7684\u7B2C\u4E00\u4E2A\u548C\u6700\u540E\u4E00\u4E2A\u4F4D\u7F6E", "find-first-and-last-position-of-element-in-sorted-array", "medium"],
    ["33", "\u641C\u7D22\u65CB\u8F6C\u6392\u5E8F\u6570\u7EC4", "search-in-rotated-sorted-array", "medium"],
    ["153", "\u5BFB\u627E\u65CB\u8F6C\u6392\u5E8F\u6570\u7EC4\u4E2D\u7684\u6700\u5C0F\u503C", "find-minimum-in-rotated-sorted-array", "medium"],
    ["4", "\u5BFB\u627E\u4E24\u4E2A\u6B63\u5E8F\u6570\u7EC4\u7684\u4E2D\u4F4D\u6570", "median-of-two-sorted-arrays", "hard"]
  ] },
  { category: "\u6808", problems: [
    ["20", "\u6709\u6548\u7684\u62EC\u53F7", "valid-parentheses", "easy"],
    ["155", "\u6700\u5C0F\u6808", "min-stack", "medium"],
    ["394", "\u5B57\u7B26\u4E32\u89E3\u7801", "decode-string", "medium"],
    ["739", "\u6BCF\u65E5\u6E29\u5EA6", "daily-temperatures", "medium"],
    ["84", "\u67F1\u72B6\u56FE\u4E2D\u6700\u5927\u7684\u77E9\u5F62", "largest-rectangle-in-histogram", "hard"]
  ] },
  { category: "\u5806", problems: [
    ["215", "\u6570\u7EC4\u4E2D\u7684\u7B2CK\u4E2A\u6700\u5927\u5143\u7D20", "kth-largest-element-in-an-array", "medium"],
    ["347", "\u524D K \u4E2A\u9AD8\u9891\u5143\u7D20", "top-k-frequent-elements", "medium"],
    ["295", "\u6570\u636E\u6D41\u7684\u4E2D\u4F4D\u6570", "find-median-from-data-stream", "hard"]
  ] },
  { category: "\u8D2A\u5FC3\u7B97\u6CD5", problems: [
    ["121", "\u4E70\u5356\u80A1\u7968\u7684\u6700\u4F73\u65F6\u673A", "best-time-to-buy-and-sell-stock", "easy"],
    ["55", "\u8DF3\u8DC3\u6E38\u620F", "jump-game", "medium"],
    ["45", "\u8DF3\u8DC3\u6E38\u620F II", "jump-game-ii", "medium"],
    ["763", "\u5212\u5206\u5B57\u6BCD\u533A\u95F4", "partition-labels", "medium"]
  ] },
  { category: "\u52A8\u6001\u89C4\u5212", problems: [
    ["70", "\u722C\u697C\u68AF", "climbing-stairs", "easy"],
    ["118", "\u6768\u8F89\u4E09\u89D2", "pascals-triangle", "easy"],
    ["198", "\u6253\u5BB6\u52AB\u820D", "house-robber", "medium"],
    ["279", "\u5B8C\u5168\u5E73\u65B9\u6570", "perfect-squares", "medium"],
    ["322", "\u96F6\u94B1\u5151\u6362", "coin-change", "medium"],
    ["139", "\u5355\u8BCD\u62C6\u5206", "word-break", "medium"],
    ["300", "\u6700\u957F\u9012\u589E\u5B50\u5E8F\u5217", "longest-increasing-subsequence", "medium"],
    ["152", "\u4E58\u79EF\u6700\u5927\u5B50\u6570\u7EC4", "maximum-product-subarray", "medium"],
    ["416", "\u5206\u5272\u7B49\u548C\u5B50\u96C6", "partition-equal-subset-sum", "medium"],
    ["32", "\u6700\u957F\u6709\u6548\u62EC\u53F7", "longest-valid-parentheses", "hard"]
  ] },
  { category: "\u591A\u7EF4\u52A8\u6001\u89C4\u5212", problems: [
    ["62", "\u4E0D\u540C\u8DEF\u5F84", "unique-paths", "medium"],
    ["64", "\u6700\u5C0F\u8DEF\u5F84\u548C", "minimum-path-sum", "medium"],
    ["5", "\u6700\u957F\u56DE\u6587\u5B50\u4E32", "longest-palindromic-substring", "medium"],
    ["1143", "\u6700\u957F\u516C\u5171\u5B50\u5E8F\u5217", "longest-common-subsequence", "medium"],
    ["72", "\u7F16\u8F91\u8DDD\u79BB", "edit-distance", "medium"]
  ] },
  { category: "\u6280\u5DE7", problems: [
    ["136", "\u53EA\u51FA\u73B0\u4E00\u6B21\u7684\u6570\u5B57", "single-number", "easy"],
    ["169", "\u591A\u6570\u5143\u7D20", "majority-element", "easy"],
    ["75", "\u989C\u8272\u5206\u7C7B", "sort-colors", "medium"],
    ["31", "\u4E0B\u4E00\u4E2A\u6392\u5217", "next-permutation", "medium"],
    ["287", "\u5BFB\u627E\u91CD\u590D\u6570", "find-the-duplicate-number", "medium"]
  ] }
];
var LEETCODE_TOP_100_GROUPS = Object.freeze(GROUPS.map((group) => Object.freeze({
  category: group.category,
  problems: Object.freeze(group.problems.map(([id, title, slug, difficulty]) => Object.freeze({
    id,
    title,
    slug,
    difficulty,
    category: group.category,
    url: `https://leetcode.cn/problems/${slug}/`
  })))
})));
var LEETCODE_TOP_100 = Object.freeze(LEETCODE_TOP_100_GROUPS.flatMap((group) => group.problems));
var PROBLEM_BY_SLUG = new Map(LEETCODE_TOP_100.map((problem) => [problem.slug, problem]));

// src/client/features/leetcode.js
var DIFFICULTY = Object.freeze({
  easy: { label: "\u7B80\u5355", tone: "easy" },
  medium: { label: "\u4E2D\u7B49", tone: "medium" },
  hard: { label: "\u56F0\u96BE", tone: "hard" }
});
function catalogProblem(catalog, slug) {
  return catalog?.groups?.flatMap((group) => group.problems).find((problem) => problem.slug === slug) || null;
}
function DifficultyBadge({ difficulty }) {
  const value = DIFFICULTY[difficulty] || { label: leetcodeDifficultyLabel(difficulty), tone: "unknown" };
  return h("span", { className: `di-lc-difficulty is-${value.tone}` }, value.label);
}
function CompletionButton({ problem, pending, onToggle }) {
  return h("button", {
    type: "button",
    className: `di-lc-check${problem.completed ? " is-complete" : ""}`,
    disabled: pending,
    "aria-pressed": problem.completed,
    "aria-label": problem.completed ? `\u5C06${problem.title}\u6807\u8BB0\u4E3A\u672A\u5B8C\u6210` : `\u5C06${problem.title}\u6807\u8BB0\u4E3A\u5B8C\u6210`,
    onClick: () => onToggle(problem)
  }, problem.completed ? "\u2713" : "");
}
function LeetcodeCatalog({ sessionId = "global" }) {
  const query = useInterviewQuery("leetcode-catalog", () => interviewApi.leetcodeCatalog(), [], { cache: false });
  const command = useCommand(sessionId);
  const [pendingSlug, setPendingSlug] = import_react3.default.useState("");
  if (query.loading && !query.data) return h("div", { className: "di-lc-catalog" }, h(Loading, { label: "\u6B63\u5728\u8BFB\u53D6\u529B\u6263\u70ED\u9898 100\u2026" }));
  if (query.error) return h("div", { className: "di-lc-catalog" }, h(ErrorNotice, null, query.error));
  const catalog = query.data?.resource?.data;
  if (!catalog) return null;
  const toggle = async (problem) => {
    setPendingSlug(problem.slug);
    try {
      await command.run("leetcode.set-completion", { slug: problem.slug, completed: !problem.completed });
      await query.reload();
    } catch {
    } finally {
      setPendingSlug("");
    }
  };
  const progress = catalog.total ? Math.round(catalog.completedCount / catalog.total * 100) : 0;
  return h(
    "section",
    { className: "di-lc-catalog", "aria-label": "\u529B\u6263\u70ED\u9898 100 \u9898\u76EE\u5217\u8868" },
    h(
      "header",
      { className: "di-lc-catalog-head" },
      h(
        "div",
        null,
        h("div", { className: "di-eyebrow" }, "LEETCODE STUDY PLAN"),
        h("h2", { className: "di-lc-title" }, "\u70ED\u9898 100"),
        h("a", { className: "di-lc-source", href: catalog.source.url, target: "_blank", rel: "noreferrer" }, "\u6253\u5F00\u5B98\u65B9\u5B66\u4E60\u8BA1\u5212 \u2197")
      ),
      h(
        "div",
        { className: "di-lc-progress-copy" },
        h("strong", null, catalog.completedCount),
        h("span", null, `/ ${catalog.total}`)
      )
    ),
    h(
      "div",
      { className: "di-lc-progress", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": catalog.total, "aria-valuenow": catalog.completedCount },
      h("i", { style: { width: `${progress}%` } })
    ),
    h(ErrorNotice, null, command.error),
    h("div", { className: "di-lc-groups" }, catalog.groups.map((group) => {
      const completed = group.problems.filter((problem) => problem.completed).length;
      return h(
        "section",
        { className: "di-lc-group", key: group.category },
        h(
          "div",
          { className: "di-lc-group-head" },
          h("h3", null, group.category),
          h("span", null, `${completed}/${group.problems.length}`)
        ),
        h("div", { className: "di-lc-problems" }, group.problems.map((problem) => h(
          "div",
          {
            className: `di-lc-row${problem.completed ? " is-complete" : ""}`,
            key: problem.slug
          },
          h(CompletionButton, { problem, pending: pendingSlug === problem.slug, onToggle: toggle }),
          h(
            "a",
            { className: "di-lc-problem-link", href: problem.url, target: "_blank", rel: "noreferrer" },
            h("span", { className: "di-lc-problem-id" }, problem.id),
            h("span", null, problem.title),
            h("span", { className: "di-lc-open", "aria-hidden": "true" }, "\u2197")
          ),
          h(DifficultyBadge, { difficulty: problem.difficulty })
        )))
      );
    }))
  );
}
function LeetcodeProblemCard({ sessionId, initialQuestion = null }) {
  const sessionQuery = useInterviewQuery(`leetcode-session:${sessionId}`, () => interviewApi.session(sessionId), [sessionId], { cache: false });
  const catalogQuery = useInterviewQuery("leetcode-catalog-current", () => interviewApi.leetcodeCatalog(), [], { cache: false });
  const command = useCommand(sessionId);
  const [showCatalog, setShowCatalog] = import_react3.default.useState(false);
  const session = sessionQuery.data?.resource?.data;
  const current = session?.currentQuestion?.leetcode ? session.currentQuestion : initialQuestion;
  const saved = current?.leetcode ? catalogProblem(catalogQuery.data?.resource?.data, current.leetcode.slug) : null;
  const problem = current?.leetcode ? { ...current.leetcode, completed: saved?.completed === true } : null;
  if (sessionQuery.loading && !current) return h("div", { className: "di-card" }, h(Loading));
  if (!problem) return null;
  const run = async (name2, payload) => {
    try {
      await command.run(name2, payload);
      await Promise.all([sessionQuery.reload(), catalogQuery.reload()]);
    } catch {
    }
  };
  return h(
    import_react3.default.Fragment,
    null,
    h(
      "article",
      { className: "di-card di-lc-problem-card", "aria-label": "\u5F53\u524D\u529B\u6263\u9898\u76EE" },
      h(
        "div",
        { className: "di-lc-problem-main" },
        h("div", { className: "di-eyebrow" }, `LEETCODE \xB7 ${problem.category}`),
        h("div", { className: "di-lc-problem-title" }, h("span", null, problem.id), problem.title),
        h(
          "div",
          { className: "di-lc-problem-meta" },
          h(DifficultyBadge, { difficulty: problem.difficulty }),
          h("span", { className: problem.completed ? "is-complete" : "" }, problem.completed ? "\u5DF2\u5B8C\u6210" : "\u672A\u5B8C\u6210")
        )
      ),
      h(
        "div",
        { className: "di-lc-problem-actions" },
        h("a", { className: "di-button is-primary", href: problem.url, target: "_blank", rel: "noreferrer" }, "\u6253\u5F00\u9898\u76EE \u2197"),
        h(Button, {
          busy: command.busy === "leetcode.set-completion",
          onClick: () => run("leetcode.set-completion", { slug: problem.slug, completed: !problem.completed })
        }, problem.completed ? "\u6807\u8BB0\u672A\u5B8C\u6210" : "\u6807\u8BB0\u5B8C\u6210"),
        h(Button, { busy: command.busy === "question.next", onClick: () => run("question.next") }, "\u968F\u673A\u4E0B\u4E00\u9898"),
        h(Button, { onClick: () => setShowCatalog((value) => !value) }, showCatalog ? "\u6536\u8D77\u9898\u76EE\u5217\u8868" : "\u67E5\u770B\u9898\u76EE\u5217\u8868"),
        h(Button, { busy: command.busy === "session.finish", onClick: () => run("session.finish") }, "\u7ED3\u675F\u7EC3\u4E60")
      ),
      h(ErrorNotice, null, command.error)
    ),
    showCatalog ? h(LeetcodeCatalog, { sessionId }) : null
  );
}

// src/client/features/live-interview.js
function Evaluation({ attempt }) {
  if (!attempt?.evaluation) return null;
  const evaluation = attempt.evaluation;
  return h(
    "div",
    { className: "di-section" },
    h("div", { className: "di-section-label" }, "\u672C\u6B21\u8BC4\u4EF7"),
    h(
      "div",
      { className: "di-score-row" },
      h("span", { className: "di-score-number" }, evaluation.score),
      h(ScoreRail, { score: evaluation.score })
    ),
    h("div", { style: { marginTop: "12px" } }, h(Markdown, null, evaluation.feedback)),
    Object.keys(evaluation.dimensions || {}).length ? h("div", { className: "di-attempt" }, Object.entries(evaluation.dimensions).map(([name2, score]) => h("div", { className: "di-attempt-head", key: name2 }, h("span", null, name2), h("strong", null, `${score}/10`)))) : null
  );
}
function Explanation({ explanation }) {
  if (!explanation) return null;
  return h(
    "div",
    { className: "di-section" },
    h("div", { className: "di-section-label" }, "\u53C2\u8003\u8BB2\u89E3"),
    h(Markdown, null, explanation.detail),
    explanation.memorizationPoints ? h(
      "div",
      { className: "di-attempt" },
      h("div", { className: "di-section-label" }, "\u76F4\u63A5\u80CC"),
      h(Markdown, null, explanation.memorizationPoints)
    ) : null
  );
}
function LiveInterviewCard({ sessionId }) {
  const query = useInterviewQuery(`session:${sessionId}`, () => interviewApi.session(sessionId), [sessionId], { cache: false });
  const command = useCommand(sessionId);
  if (query.loading && !query.data) return h("div", { className: "di-card" }, h(Loading));
  if (query.error) return h("div", { className: "di-card" }, h(ErrorNotice, null, query.error));
  const session = query.data?.resource?.data;
  if (!session?.selected) return h("div", { className: "di-card" }, h(Empty, { title: "\u8FD8\u6CA1\u6709\u5F00\u59CB\u7EC3\u4E60", detail: "\u7528\u81EA\u7136\u8BED\u8A00\u63CF\u8FF0\u9762\u8BD5\u6A21\u5F0F\u548C\u4E3B\u9898\u5373\u53EF\u5F00\u59CB\u3002" }));
  const question = session.currentQuestion;
  if (question?.leetcode) return h(LeetcodeProblemCard, { sessionId, initialQuestion: question });
  const latestAttempt = question?.attempts?.at(-1) || null;
  const run = (name2, payload) => command.run(name2, payload).catch(() => {
  });
  return h(
    "article",
    { className: "di-card", "aria-label": "\u5F53\u524D\u9762\u8BD5\u9898" },
    h(
      "header",
      { className: "di-card-head" },
      h(
        "div",
        null,
        h("div", { className: "di-eyebrow" }, `${session.practice.modeLabel} \xB7 Q${String(question?.sequence || 0).padStart(2, "0")}`),
        h("div", { className: "di-title" }, session.practice.topic),
        h("div", { className: "di-subtitle" }, `${session.practice.questionCount} \u9898 \xB7 ${session.practice.evaluatedCount} \u6B21\u5DF2\u8BC4\u4EF7`)
      ),
      h(PhaseBadge, { phase: session.phase })
    ),
    h(
      "div",
      { className: "di-card-body" },
      question ? h(
        import_react4.default.Fragment,
        null,
        h("div", { className: "di-question-text" }, h(Markdown, null, question.prompt)),
        latestAttempt ? h(
          "div",
          { className: "di-attempt" },
          h("div", { className: "di-attempt-head" }, h("span", null, `\u7B2C ${latestAttempt.sequence} \u6B21\u4F5C\u7B54`), h("span", null, latestAttempt.evaluation ? `${latestAttempt.evaluation.score}/10` : "\u7B49\u5F85\u8BC4\u4EF7")),
          h(Markdown, null, latestAttempt.answer)
        ) : null,
        h(Evaluation, { attempt: latestAttempt }),
        h(Explanation, { explanation: question.explanation })
      ) : h(Empty, { title: "\u9762\u8BD5\u5B98\u6B63\u5728\u51C6\u5907\u4E0B\u4E00\u9898", detail: "\u9898\u76EE\u751F\u6210\u540E\u4F1A\u81EA\u52A8\u51FA\u73B0\u5728\u8FD9\u91CC\u3002" }),
      h(ErrorNotice, null, command.error),
      h(
        "div",
        { className: "di-actions" },
        session.phase === "awaiting_next" ? h(Button, { tone: "primary", busy: command.busy === "question.next", onClick: () => run("question.next") }, "\u4E0B\u4E00\u9898") : null,
        question && session.phase === "awaiting_next" ? h(Button, { busy: command.busy === "question.retry", onClick: () => run("question.retry", { questionId: question.id }) }, "\u91CD\u65B0\u4F5C\u7B54") : null,
        session.phase !== "completed" ? h(Button, { busy: command.busy === "session.finish", onClick: () => run("session.finish") }, "\u7ED3\u675F\u7EC3\u4E60") : null
      )
    )
  );
}
function CompactResultCard({ title, detail, tone = "quiet" }) {
  return h(
    "div",
    { className: "di-card" },
    h(
      "div",
      { className: "di-card-head" },
      h("div", { className: "di-title" }, title),
      h(PhaseBadge, { phase: tone === "completed" ? "completed" : "awaiting_next" })
    ),
    detail ? h("div", { className: "di-card-body" }, detail) : null
  );
}
function QuestionResultCard({ sessionId, question }) {
  if (!question) return null;
  const command = useCommand(sessionId);
  const revealAnswer = () => command.run("question.reveal", { questionId: question.id }).catch(() => {
  });
  return h(
    "article",
    { className: "di-card di-question-card", "aria-label": "\u9762\u8BD5\u9898" },
    h(
      "div",
      { className: "di-question-main" },
      h("div", { className: "di-question-text" }, h(Markdown, null, question.prompt))
    ),
    h(Button, {
      className: "di-answer-button",
      busy: command.busy === "question.reveal",
      onClick: revealAnswer,
      "aria-label": "\u67E5\u770B\u672C\u9898\u7B54\u6848"
    }, h(Icon, { name: "eye" }), "\u770B\u7B54\u6848"),
    h(ErrorNotice, null, command.error)
  );
}
function ReviewResultCard({ sessionId, question, attempt }) {
  if (!question || !question.explanation || attempt && !attempt.evaluation) return null;
  const command = useCommand(sessionId);
  const run = (name2, payload) => command.run(name2, payload).catch(() => {
  });
  const evaluation = attempt?.evaluation || null;
  const explanation = question.explanation;
  return h(
    "article",
    { id: `di-review-${question.id}`, className: "di-card di-review-card", "aria-label": "\u70B9\u8BC4\u8BB2\u89E3" },
    evaluation ? h(
      "header",
      { className: "di-review-score" },
      h("span", { className: "di-review-check" }, h(Icon, { name: "check", size: 22 })),
      h(
        "div",
        { className: "di-review-score-summary" },
        h("div", { className: "di-review-score-label" }, "\u8BC4\u5206"),
        h(
          "div",
          { className: "di-review-score-value" },
          h("strong", null, Number(evaluation.score).toFixed(1)),
          h("span", null, "/ 10")
        )
      ),
      h(StarRating, { score: evaluation.score })
    ) : null,
    h(
      "div",
      { className: "di-review-content" },
      evaluation ? h(
        "section",
        { className: "di-review-section" },
        h("h3", null, "\u8BC4\u4EF7"),
        h("div", { className: "di-feedback-banner" }, h(Markdown, null, evaluation.feedback)),
        Object.keys(evaluation.dimensions || {}).length ? h("div", { className: "di-dimensions" }, Object.entries(evaluation.dimensions).map(([name2, score]) => h("span", { key: name2 }, name2, h("strong", null, `${score}/10`)))) : null
      ) : null,
      h(
        "section",
        { className: "di-review-section" },
        h("h3", null, "\u8BB2\u89E3"),
        h("div", { className: "di-explanation-copy" }, h(Markdown, null, explanation.detail))
      ),
      h(
        "section",
        { className: "di-memorize-box" },
        h(
          "div",
          { className: "di-memorize-copy" },
          h("div", { className: "di-memorize-label" }, "\u76F4\u63A5\u80CC"),
          h(Markdown, null, explanation.memorizationPoints)
        )
      ),
      h(ErrorNotice, null, command.error),
      h(
        "div",
        { className: "di-review-actions" },
        h(Button, { tone: "primary", busy: command.busy === "question.next", onClick: () => run("question.next") }, "\u4E0B\u4E00\u9898"),
        h(Button, { busy: command.busy === "question.retry", onClick: () => run("question.retry", { questionId: question.id }) }, h(Icon, { name: "swap" }), "\u91CD\u65B0\u4F5C\u7B54"),
        h(Button, { busy: command.busy === "session.finish", onClick: () => run("session.finish") }, "\u7ED3\u675F\u7EC3\u4E60")
      )
    )
  );
}
function ToolErrorCard({ message }) {
  return h(
    "div",
    { className: "di-tool-error", role: "alert" },
    h("strong", null, "\u9762\u8BD5\u64CD\u4F5C\u5931\u8D25"),
    h("span", null, message)
  );
}
function usePresentedPractice(presentation, revision) {
  const practiceId = presentation?.practiceId;
  return useInterviewQuery(
    `presented-practice:${practiceId || "none"}:${revision || 0}`,
    () => practiceId ? interviewApi.practice(practiceId) : Promise.resolve(null),
    [practiceId, revision],
    { cache: false }
  );
}
function PresentedState({ query, children, missing }) {
  if (query.loading && !query.data) return h("div", { className: "di-card" }, h(Loading));
  if (query.error) return h("div", { className: "di-card" }, h(ErrorNotice, null, query.error));
  return children || h("div", { className: "di-card" }, h(Empty, { title: missing }));
}
function QuestionResourceCard({ presentation, revision, sessionId }) {
  const query = usePresentedPractice(presentation, revision);
  const practice = query.data?.resource?.data;
  const question = practice?.questions?.find((item) => item.id === presentation.questionId);
  return h(PresentedState, { query, missing: "\u627E\u4E0D\u5230\u9898\u76EE\u5361\u7247\u6570\u636E" }, question ? question.leetcode ? h(LeetcodeProblemCard, { sessionId, initialQuestion: question }) : h(QuestionResultCard, { sessionId, question }) : null);
}
function ReviewResourceCard({ presentation, revision, sessionId }) {
  const query = usePresentedPractice(presentation, revision);
  const practice = query.data?.resource?.data;
  const question = practice?.questions?.find((item) => item.id === presentation.questionId);
  const attempt = presentation.attemptId ? question?.attempts?.find((item) => item.id === presentation.attemptId) : null;
  const complete = question?.explanation && (!presentation.attemptId || attempt?.evaluation);
  return h(PresentedState, { query, missing: "\u627E\u4E0D\u5230\u70B9\u8BC4\u8BB2\u89E3\u6570\u636E" }, complete ? h(ReviewResultCard, { sessionId, question, attempt }) : null);
}
function PracticeSummaryCard({ presentation, revision }) {
  const query = usePresentedPractice(presentation, revision);
  const practice = query.data?.resource?.data;
  const summary = practice?.summary;
  return h(PresentedState, { query, missing: "\u627E\u4E0D\u5230\u7EC3\u4E60\u603B\u7ED3" }, summary ? h(
    "article",
    { className: "di-card", "aria-label": "\u7EC3\u4E60\u603B\u7ED3" },
    h(
      "header",
      { className: "di-card-head" },
      h(
        "div",
        null,
        h("div", { className: "di-title" }, "\u7EC3\u4E60\u603B\u7ED3"),
        h("div", { className: "di-subtitle" }, `${practice.modeLabel} \xB7 ${practice.topic}`)
      ),
      h(PhaseBadge, { phase: "completed" })
    ),
    h(
      "div",
      { className: "di-card-body" },
      h(Markdown, null, summary.overall),
      h(
        "section",
        { className: "di-section" },
        h("div", { className: "di-section-label" }, "\u8868\u73B0\u4EAE\u70B9"),
        h("ul", null, summary.strengths.map((item) => h("li", { key: item }, item)))
      ),
      h(
        "section",
        { className: "di-section" },
        h("div", { className: "di-section-label" }, "\u6539\u8FDB\u5EFA\u8BAE"),
        h("ul", null, summary.improvements.map((item) => h("li", { key: item }, item)))
      ),
      h("div", { className: "di-subtitle" }, `${practice.questionCount} \u9053\u9898 \xB7 ${practice.attemptCount} \u6B21\u4F5C\u7B54 \xB7 \u5E73\u5747\u5206 ${practice.averageScore ?? "\u2014"}`)
    )
  ) : null);
}

// src/client/features/practice-library.js
var import_react5 = __toESM(require("react"), 1);
function PracticeForm({ initial = null, busy = false, onSubmit, onCancel }) {
  const [mode, setMode] = import_react5.default.useState(initial?.mode || "");
  const [topic, setTopic] = import_react5.default.useState(initial?.config?.topic || "");
  const [resume, setResume] = import_react5.default.useState(initial?.config?.resume || "");
  const [interviewerStyle, setInterviewerStyle] = import_react5.default.useState(initial?.config?.interviewerStyle || "");
  const [coding, setCoding] = import_react5.default.useState(typeof initial?.config?.coding === "boolean" ? String(initial.config.coding) : "");
  const [difficulty, setDifficulty] = import_react5.default.useState(initial?.config?.difficulty || "");
  const topicMode = mode === "bagu" || mode === "scenario";
  const valid = topicMode ? Boolean(topic.trim()) : mode === "leetcode" || mode === "mock" && Boolean(resume.trim() && interviewerStyle.trim() && coding && difficulty);
  const submit = () => {
    if (!valid) return;
    onSubmit(mode === "mock" ? { mode, config: { resume: resume.trim(), interviewerStyle: interviewerStyle.trim(), coding: coding === "true", difficulty } } : mode === "leetcode" ? { mode, config: {} } : { mode, config: { topic: topic.trim() } });
  };
  return h(
    "div",
    { className: "di-practice-form" },
    h(
      "label",
      { className: "di-field" },
      h("span", null, "\u6A21\u5F0F"),
      h(
        "select",
        { className: "di-select", value: mode, onChange: (event) => setMode(event.target.value) },
        h("option", { value: "" }, "\u8BF7\u9009\u62E9"),
        h("option", { value: "bagu" }, "\u80CC\u516B\u80A1"),
        h("option", { value: "mock" }, "\u6A21\u62DF\u9762\u8BD5"),
        h("option", { value: "scenario" }, "\u573A\u666F\u9898"),
        h("option", { value: "leetcode" }, "\u5237\u529B\u6263")
      )
    ),
    topicMode ? h(
      "label",
      { className: "di-field" },
      h("span", null, "\u4E3B\u9898"),
      h("input", { className: "di-input", value: topic, onChange: (event) => setTopic(event.target.value) })
    ) : null,
    mode === "mock" ? h(
      import_react5.default.Fragment,
      null,
      h(
        "label",
        { className: "di-field di-field-wide" },
        h("span", null, "\u7B80\u5386"),
        h("textarea", { className: "di-input di-textarea", value: resume, onChange: (event) => setResume(event.target.value) })
      ),
      h(
        "label",
        { className: "di-field" },
        h("span", null, "\u9762\u8BD5\u5B98\u98CE\u683C"),
        h("input", { className: "di-input", value: interviewerStyle, onChange: (event) => setInterviewerStyle(event.target.value) })
      ),
      h(
        "label",
        { className: "di-field" },
        h("span", null, "\u662F\u5426\u624B\u6495\u4EE3\u7801"),
        h(
          "select",
          { className: "di-select", value: coding, onChange: (event) => setCoding(event.target.value) },
          h("option", { value: "" }, "\u8BF7\u9009\u62E9"),
          h("option", { value: "true" }, "\u662F"),
          h("option", { value: "false" }, "\u5426")
        )
      ),
      h(
        "label",
        { className: "di-field" },
        h("span", null, "\u9762\u8BD5\u96BE\u5EA6"),
        h(
          "select",
          { className: "di-select", value: difficulty, onChange: (event) => setDifficulty(event.target.value) },
          h("option", { value: "" }, "\u8BF7\u9009\u62E9"),
          h("option", { value: "junior" }, "\u521D\u7EA7"),
          h("option", { value: "intermediate" }, "\u4E2D\u7EA7"),
          h("option", { value: "senior" }, "\u9AD8\u7EA7")
        )
      )
    ) : null,
    h(
      "div",
      { className: "di-actions di-field-wide" },
      h(Button, { onClick: onCancel }, "\u53D6\u6D88"),
      h(Button, { tone: "primary", disabled: !valid, busy, onClick: submit }, initial ? "\u4FDD\u5B58\u914D\u7F6E" : "\u5F00\u59CB\u7EC3\u4E60")
    )
  );
}
function PracticeDetail({ practice, sessionId, onDeleted }) {
  const command = useCommand(sessionId);
  const [confirming, setConfirming] = import_react5.default.useState(false);
  const [editing, setEditing] = import_react5.default.useState(false);
  const [editingQuestionId, setEditingQuestionId] = import_react5.default.useState(null);
  const [questionDraft, setQuestionDraft] = import_react5.default.useState("");
  const [deletingQuestionId, setDeletingQuestionId] = import_react5.default.useState(null);
  const [downloads, setDownloads] = import_react5.default.useState([]);
  if (!practice) return h(Empty, { title: "\u9009\u62E9\u4E00\u6761\u7EC3\u4E60", detail: "\u53F3\u4FA7\u4F1A\u5C55\u793A\u9898\u76EE\u3001\u5386\u6B21\u4F5C\u7B54\u548C\u8BB2\u89E3\u3002" });
  const run = (name2, payload) => command.run(name2, payload).catch(() => null);
  const activate = async () => {
    await run(practice.status === "completed" ? "session.reopen" : "session.select", { practiceId: practice.id });
  };
  const exportOne = async () => {
    const result = await run("library.export", { practiceIds: [practice.id] });
    if (result) setDownloads(result.resource.data || []);
  };
  const remove = async () => {
    const result = await run("library.delete", { practiceId: practice.id });
    if (result) onDeleted();
  };
  const updateConfiguration = async (payload) => {
    const result = await run("practice.update", { practiceId: practice.id, ...payload });
    if (result) setEditing(false);
  };
  const updateQuestion = async (questionId) => {
    const result = await run("question.update", { practiceId: practice.id, questionId, prompt: questionDraft });
    if (result) {
      setEditingQuestionId(null);
      setQuestionDraft("");
    }
  };
  const deleteQuestion = async (questionId) => {
    const result = await run("question.delete", { practiceId: practice.id, questionId });
    if (result) setDeletingQuestionId(null);
  };
  const retry = async (questionId) => {
    if (practice.status !== "active") return;
    await run("session.select", { practiceId: practice.id });
    await run("question.retry", { questionId });
  };
  return h(
    "section",
    { className: "di-detail" },
    h("div", { className: "di-eyebrow" }, practice.modeLabel),
    h("h3", { className: "di-ledger-title", style: { margin: "5px 0 0" } }, practice.topic),
    h("div", { className: "di-subtitle" }, practice.mode === "leetcode" ? `${practice.questionCount} \u9053\u5DF2\u62BD\u53D6\u9898\u76EE` : `${practice.questionCount} \u9898 \xB7 ${practice.evaluatedCount} \u6B21\u5DF2\u8BC4\u4EF7 \xB7 \u5747\u5206 ${practice.averageScore ?? "\u2014"}`),
    h(
      "div",
      { className: "di-actions" },
      h(Button, { tone: "primary", busy: Boolean(command.busy?.startsWith("session.")), onClick: activate }, practice.status === "completed" ? "\u91CD\u65B0\u6253\u5F00" : "\u5207\u6362\u5230\u7EC3\u4E60"),
      h(Button, { onClick: () => setEditing((value) => !value) }, "\u7F16\u8F91\u914D\u7F6E"),
      h(Button, { busy: command.busy === "library.export", onClick: exportOne }, "\u5BFC\u51FA Markdown"),
      h(Button, { tone: "danger", onClick: () => setConfirming(true) }, "\u5220\u9664")
    ),
    downloads.length ? h("div", { className: "di-notice" }, downloads.map((file) => h("a", { className: "di-link", href: interviewApi.downloadUrl(file.token), key: file.token }, `\u4E0B\u8F7D ${file.name}`))) : null,
    confirming ? h(
      "div",
      { className: "di-confirm" },
      h("div", null, "\u5220\u9664\u540E\u65E0\u6CD5\u6062\u590D\u8FD9\u6761\u7EC3\u4E60\u53CA\u5168\u90E8\u4F5C\u7B54\u3002"),
      h(
        "div",
        { className: "di-actions" },
        h(Button, { onClick: () => setConfirming(false) }, "\u53D6\u6D88"),
        h(Button, { tone: "danger", busy: command.busy === "library.delete", onClick: remove }, "\u786E\u8BA4\u5220\u9664")
      )
    ) : null,
    editing ? h(PracticeForm, { initial: practice, busy: command.busy === "practice.update", onSubmit: updateConfiguration, onCancel: () => setEditing(false) }) : null,
    h(ErrorNotice, null, command.error),
    practice.summary ? h(
      "section",
      { className: "di-section" },
      h("div", { className: "di-section-label" }, "\u7EC3\u4E60\u603B\u7ED3"),
      h(Markdown, null, practice.summary.overall),
      h(
        "div",
        { className: "di-attempt" },
        h("strong", null, "\u8868\u73B0\u4EAE\u70B9"),
        h("ul", null, practice.summary.strengths.map((item) => h("li", { key: item }, item))),
        h("strong", null, "\u6539\u8FDB\u5EFA\u8BAE"),
        h("ul", null, practice.summary.improvements.map((item) => h("li", { key: item }, item)))
      )
    ) : null,
    practice.questions.length ? practice.questions.map((question) => {
      const latest = question.attempts.at(-1);
      return h(
        "article",
        { className: "di-detail-question", key: question.id },
        h(
          "div",
          { className: "di-detail-question-head" },
          h("span", { className: "di-sequence" }, `Q${String(question.sequence).padStart(2, "0")}`),
          h("div", { className: "di-detail-question-text" }, editingQuestionId === question.id ? h("input", { className: "di-input", value: questionDraft, onChange: (event) => setQuestionDraft(event.target.value) }) : h(Markdown, null, question.prompt)),
          question.leetcode ? h("a", { className: "di-link", href: question.leetcode.url, target: "_blank", rel: "noreferrer" }, `${question.leetcode.category} \xB7 ${leetcodeDifficultyLabel(question.leetcode.difficulty)}`) : h(ScoreRail, { score: question.latestScore, compact: true })
        ),
        question.attempts.map((attempt) => h(
          "div",
          { className: "di-attempt", key: attempt.id },
          h("div", { className: "di-attempt-head" }, h("span", null, `\u7B2C ${attempt.sequence} \u6B21\u4F5C\u7B54`), h("strong", null, attempt.evaluation ? `${attempt.evaluation.score}/10` : "\u672A\u8BC4\u4EF7")),
          h(Markdown, null, attempt.answer),
          attempt.evaluation ? h("div", { className: "di-section" }, h(Markdown, null, attempt.evaluation.feedback)) : null
        )),
        question.explanation ? h(
          "div",
          { className: "di-section" },
          h("div", { className: "di-section-label" }, "\u53C2\u8003\u8BB2\u89E3"),
          h(Markdown, null, question.explanation.detail)
        ) : null,
        h(
          "div",
          { className: "di-detail-actions" },
          !question.leetcode && editingQuestionId === question.id ? h(
            import_react5.default.Fragment,
            null,
            h(Button, { tone: "primary", disabled: !questionDraft.trim(), busy: command.busy === "question.update", onClick: () => updateQuestion(question.id) }, "\u4FDD\u5B58\u9898\u76EE"),
            h(Button, { onClick: () => {
              setEditingQuestionId(null);
              setQuestionDraft("");
            } }, "\u53D6\u6D88")
          ) : !question.leetcode ? h(Button, { onClick: () => {
            setEditingQuestionId(question.id);
            setQuestionDraft(question.prompt);
          } }, "\u7F16\u8F91\u9898\u76EE") : null,
          !question.leetcode && practice.status === "active" && latest?.evaluation ? h(Button, { onClick: () => retry(question.id) }, "\u91CD\u65B0\u4F5C\u7B54") : null,
          h(Button, { tone: "danger", onClick: () => setDeletingQuestionId(question.id) }, "\u5220\u9664\u9898\u76EE")
        ),
        deletingQuestionId === question.id ? h(
          "div",
          { className: "di-confirm" },
          h("div", null, "\u786E\u8BA4\u5220\u9664\u8BE5\u9898\u53CA\u5176\u5168\u90E8\u4F5C\u7B54\u3001\u8BC4\u4EF7\u548C\u8BB2\u89E3\uFF1F"),
          h(
            "div",
            { className: "di-actions" },
            h(Button, { onClick: () => setDeletingQuestionId(null) }, "\u53D6\u6D88"),
            h(Button, { tone: "danger", busy: command.busy === "question.delete", onClick: () => deleteQuestion(question.id) }, "\u786E\u8BA4\u5220\u9664")
          )
        ) : null
      );
    }) : h(Empty, { title: "\u8FD9\u6761\u7EC3\u4E60\u8FD8\u6CA1\u6709\u9898\u76EE" })
  );
}
function PracticeLibrary({ sessionId, initialPracticeId = null }) {
  const [queryText, setQueryText] = import_react5.default.useState("");
  const [mode, setMode] = import_react5.default.useState("");
  const [status, setStatus] = import_react5.default.useState("");
  const [selectedId, setSelectedId] = import_react5.default.useState(initialPracticeId);
  const [confirmingId, setConfirmingId] = import_react5.default.useState(null);
  const [downloads, setDownloads] = import_react5.default.useState([]);
  const [creating, setCreating] = import_react5.default.useState(false);
  const command = useCommand(sessionId);
  const filters = { query: queryText, mode, status };
  const list = useInterviewQuery(`practices:${queryText}:${mode}:${status}`, () => interviewApi.practices(filters), [queryText, mode, status]);
  const practices = list.data?.resource?.data || [];
  const detail = useInterviewQuery(`practice:${selectedId || "none"}`, () => selectedId ? interviewApi.practice(selectedId) : Promise.resolve(null), [selectedId]);
  const selected = detail.data?.resource?.data || null;
  const run = (name2, payload) => command.run(name2, payload).catch(() => null);
  const createPractice = async (payload) => {
    const result = await run("session.start", payload);
    if (!result) return;
    setCreating(false);
    setSelectedId(result.presentation?.practiceId || result.resource?.data?.practice?.id || null);
  };
  const activate = async (practice) => {
    await run(practice.status === "completed" ? "session.reopen" : "session.select", { practiceId: practice.id });
  };
  const exportOne = async (practice) => {
    const result = await run("library.export", { practiceIds: [practice.id] });
    if (result) setDownloads(result.resource.data || []);
  };
  const remove = async (practice) => {
    if (!practice) return;
    const result = await run("library.delete", { practiceId: practice.id });
    if (!result) return;
    if (selectedId === practice.id) setSelectedId(null);
    setConfirmingId(null);
    interviewApi.invalidate();
  };
  const dateText = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "\u2014" : date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).replaceAll("/", "-");
  };
  const scoreClass = (score) => Number(score) >= 8 ? "is-good" : Number(score) >= 6 ? "is-mid" : "is-empty";
  const rows = practices.map((practice) => h(
    "tr",
    { key: practice.id, className: selectedId === practice.id ? "is-selected" : "" },
    h("td", null, h("button", { className: "di-history-topic", onClick: () => setSelectedId(selectedId === practice.id ? null : practice.id) }, practice.topic)),
    h("td", null, practice.modeLabel),
    h("td", { className: "di-history-time" }, dateText(practice.updatedAt)),
    h("td", null, h("strong", { className: `di-history-score ${scoreClass(practice.averageScore)}` }, practice.averageScore ?? "\u2014")),
    h("td", null, h(
      "div",
      { className: "di-row-actions" },
      h(Button, { className: "di-icon-button", title: "\u5207\u6362\u5230\u8BE5\u7EC3\u4E60", "aria-label": `\u5207\u6362\u5230${practice.topic}`, onClick: () => activate(practice) }, h(Icon, { name: "swap" })),
      h(Button, { className: "di-icon-button is-delete", title: "\u5220\u9664", "aria-label": `\u5220\u9664${practice.topic}`, onClick: () => setConfirmingId(practice.id) }, h(Icon, { name: "trash" })),
      h(Button, { className: "di-icon-button", title: "\u5BFC\u51FA", "aria-label": `\u5BFC\u51FA${practice.topic}`, onClick: () => exportOne(practice) }, h(Icon, { name: "download" }))
    ))
  ));
  return h(
    "section",
    { className: "di-ledger di-history", "aria-label": "\u7EC3\u4E60\u5386\u53F2" },
    h(
      "header",
      { className: "di-history-head" },
      h("div", null, h("div", { className: "di-ledger-title" }, "\u7EC3\u4E60\u5386\u53F2"), h("div", { className: "di-subtitle" }, `\u5171 ${practices.length} \u6761\u7EC3\u4E60\u8BB0\u5F55`)),
      h(Button, { tone: "primary", onClick: () => setCreating((value) => !value) }, "\u65B0\u5EFA\u7EC3\u4E60")
    ),
    creating ? h(PracticeForm, { busy: command.busy === "session.start", onSubmit: createPractice, onCancel: () => setCreating(false) }) : null,
    h(
      "div",
      { className: "di-history-filters" },
      h("input", { className: "di-input", value: queryText, onChange: (event) => setQueryText(event.target.value), placeholder: "\u641C\u7D22\u7EC3\u4E60\u4E3B\u9898", "aria-label": "\u641C\u7D22\u7EC3\u4E60\u4E3B\u9898" }),
      h(
        "select",
        { className: "di-select", value: mode, onChange: (event) => setMode(event.target.value), "aria-label": "\u7B5B\u9009\u6A21\u5F0F" },
        h("option", { value: "" }, "\u5168\u90E8\u6A21\u5F0F"),
        h("option", { value: "bagu" }, "\u80CC\u516B\u80A1"),
        h("option", { value: "mock" }, "\u6A21\u62DF\u9762\u8BD5"),
        h("option", { value: "scenario" }, "\u573A\u666F\u9898"),
        h("option", { value: "leetcode" }, "\u5237\u529B\u6263")
      ),
      h(
        "select",
        { className: "di-select", value: status, onChange: (event) => setStatus(event.target.value), "aria-label": "\u7B5B\u9009\u72B6\u6001" },
        h("option", { value: "" }, "\u5168\u90E8\u72B6\u6001"),
        h("option", { value: "active" }, "\u8FDB\u884C\u4E2D"),
        h("option", { value: "completed" }, "\u5DF2\u7ED3\u675F")
      )
    ),
    h(ErrorNotice, null, list.error),
    downloads.length ? h("div", { className: "di-notice" }, downloads.map((file) => h("a", { className: "di-link", href: interviewApi.downloadUrl(file.token), key: file.token }, `\u4E0B\u8F7D ${file.name}`))) : null,
    confirmingId ? h(
      "div",
      { className: "di-delete-confirm" },
      h("span", null, `\u786E\u8BA4\u5220\u9664\u201C${practices.find((item) => item.id === confirmingId)?.topic || "\u8BE5\u7EC3\u4E60"}\u201D\u53CA\u5168\u90E8\u4F5C\u7B54\uFF1F`),
      h(
        "div",
        { className: "di-actions" },
        h(Button, { onClick: () => setConfirmingId(null) }, "\u53D6\u6D88"),
        h(Button, { tone: "danger", busy: command.busy === "library.delete", onClick: () => remove(practices.find((item) => item.id === confirmingId)) }, "\u786E\u8BA4\u5220\u9664")
      )
    ) : null,
    list.loading && !list.data ? h(Loading) : practices.length ? h(
      "div",
      { className: "di-history-scroll" },
      h(
        "table",
        { className: "di-history-table" },
        h("thead", null, h(
          "tr",
          null,
          h("th", null, "\u7EC3\u4E60\u5185\u5BB9"),
          h("th", null, "\u7C7B\u578B"),
          h("th", null, "\u7EC3\u4E60\u65F6\u95F4"),
          h("th", null, "\u5F97\u5206"),
          h("th", { "aria-label": "\u64CD\u4F5C" })
        )),
        h("tbody", null, rows)
      )
    ) : h(Empty, { title: "\u8FD8\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u7EC3\u4E60", detail: "\u5F00\u59CB\u4E00\u6B21\u9762\u8BD5\u540E\uFF0C\u8BB0\u5F55\u4F1A\u81EA\u52A8\u51FA\u73B0\u5728\u8FD9\u91CC\u3002" }),
    selectedId ? h(
      "div",
      { className: "di-history-detail" },
      detail.loading ? h(Loading, { label: "\u6B63\u5728\u8BFB\u53D6\u7EC3\u4E60\u8BE6\u60C5\u2026" }) : h(PracticeDetail, { practice: selected, sessionId, onDeleted: () => {
        setSelectedId(null);
        interviewApi.invalidate();
      } })
    ) : null
  );
}
function InsightsCard() {
  const query = useInterviewQuery("insights", () => interviewApi.insights(), []);
  if (query.loading && !query.data) return h("div", { className: "di-card" }, h(Loading));
  if (query.error) return h("div", { className: "di-card" }, h(ErrorNotice, null, query.error));
  const insight = query.data?.resource?.data;
  return h(
    "article",
    { className: "di-card" },
    h("header", { className: "di-card-head" }, h("div", { className: "di-title" }, "\u80FD\u529B\u590D\u76D8")),
    h(
      "div",
      { className: "di-card-body" },
      h("div", { className: "di-score-row" }, h("span", { className: "di-score-number" }, insight.averageScore ?? "\u2014"), h(ScoreRail, { score: insight.averageScore })),
      h("div", { className: "di-subtitle", style: { marginTop: "8px" } }, `${insight.practiceCount} \u6B21\u7EC3\u4E60 \xB7 ${insight.questionCount} \u9053\u9898 \xB7 ${insight.evaluatedCount} \u6B21\u8BC4\u4EF7`),
      insight.topics.length ? h(
        "div",
        { className: "di-section" },
        insight.topics.map((topic) => h("div", { className: "di-attempt-head", key: topic.topic }, h("span", null, `${topic.topic} \xB7 ${topic.evaluatedCount} \u9898`), h("span", { className: "di-score-row" }, h("strong", null, topic.averageScore), h(ScoreRail, { score: topic.averageScore, compact: true }))))
      ) : h(Empty, { title: "\u5B8C\u6210\u8BC4\u4EF7\u540E\u751F\u6210\u80FD\u529B\u590D\u76D8" })
    )
  );
}

// src/client/features/timeline.js
var import_react6 = __toESM(require("react"), 1);
var TIMELINE_VIEWS = [
  { id: "question", label: "\u9898\u76EE" },
  { id: "attempts", label: "\u4F5C\u7B54\u8BB0\u5F55" },
  { id: "answer", label: "\u7B54\u6848" }
];
function EmptyTimelineContent({ children }) {
  return h("div", { className: "di-time-empty" }, children);
}
function TimelineContent({ question, view }) {
  if (view === "question") return question.leetcode ? h(
    "div",
    { className: "di-time-lc-question" },
    h("a", { className: "di-link", href: question.leetcode.url, target: "_blank", rel: "noreferrer" }, question.prompt, " \u2197"),
    h("div", { className: "di-subtitle" }, `${question.leetcode.category} \xB7 ${leetcodeDifficultyLabel(question.leetcode.difficulty)}`)
  ) : h(Markdown, null, question.prompt);
  if (view === "attempts") {
    if (!question.attempts.length) return h(EmptyTimelineContent, null, "\u5C1A\u672A\u4F5C\u7B54");
    return h("div", { className: "di-time-records" }, question.attempts.map((attempt) => h(
      "section",
      { className: "di-time-record", key: attempt.id },
      h(
        "div",
        { className: "di-time-record-label" },
        h("span", null, `\u7B2C ${attempt.sequence} \u6B21\u56DE\u7B54`),
        h("strong", null, attempt.evaluation ? `${attempt.evaluation.score}/10` : "\u5F85\u70B9\u8BC4")
      ),
      h(
        "div",
        { className: "di-time-record-answer" },
        h("div", { className: "di-time-content-label" }, "\u56DE\u7B54"),
        h(Markdown, null, attempt.answer)
      ),
      attempt.evaluation ? h(
        "div",
        { className: "di-time-record-review" },
        h("div", { className: "di-time-content-label" }, "\u70B9\u8BC4"),
        h(Markdown, null, attempt.evaluation.feedback)
      ) : null
    )));
  }
  if (!question.explanation) return h(EmptyTimelineContent, null, "\u6682\u65E0\u7B54\u6848");
  return h(
    "div",
    { className: "di-time-answer" },
    h(Markdown, null, question.explanation.detail),
    question.explanation.memorizationPoints ? h(
      "section",
      { className: "di-time-memorize" },
      h("div", { className: "di-time-record-label" }, "\u76F4\u63A5\u80CC"),
      h(Markdown, null, question.explanation.memorizationPoints)
    ) : null
  );
}
function TimelinePanel({ sessionId, revisionSignal }) {
  const [selection, setSelection] = import_react6.default.useState(null);
  const sessionQuery = useInterviewQuery(`timeline-session:${sessionId}:${revisionSignal}`, () => interviewApi.session(sessionId), [sessionId, revisionSignal], { cache: false });
  const session = sessionQuery.data?.resource?.data;
  const practiceId = session?.practice?.id || null;
  const detailQuery = useInterviewQuery(`timeline-practice:${practiceId || "none"}:${revisionSignal}`, () => practiceId ? interviewApi.practice(practiceId) : Promise.resolve(null), [practiceId, revisionSignal], { cache: false });
  const practice = detailQuery.data?.resource?.data;
  if (!session?.selected || !practice?.questions?.length) return null;
  return h("nav", {
    className: "di-timeline",
    "aria-label": "\u9898\u76EE\u65F6\u95F4\u8F74",
    onKeyDown: (event) => {
      if (event.key === "Escape") setSelection(null);
    }
  }, practice.questions.map((question) => {
    const views = question.leetcode ? TIMELINE_VIEWS.slice(0, 1) : TIMELINE_VIEWS;
    const activeView = selection?.questionId === question.id ? selection.view : null;
    const activeLabel = views.find((item) => item.id === activeView)?.label;
    return h(
      "div",
      {
        className: `di-time-item${session.questionId === question.id ? " is-current" : ""}${activeView ? " has-view" : ""}`,
        key: question.id
      },
      h(
        "button",
        {
          className: "di-time-node",
          type: "button",
          "aria-label": `\u7B2C ${question.sequence} \u9898\uFF1A${question.prompt}`,
          onClick: () => setSelection({ questionId: question.id, view: "question" })
        },
        h("span", { className: "di-time-dot", "aria-hidden": "true" }),
        h("span", null, `Q${String(question.sequence).padStart(2, "0")}`)
      ),
      activeView ? h(
        "section",
        { className: "di-time-flyout", "aria-label": `${activeLabel}\u5185\u5BB9` },
        h(
          "header",
          { className: "di-time-flyout-head" },
          h(
            "div",
            { className: "di-time-tabs", role: "tablist", "aria-label": `\u7B2C ${question.sequence} \u9898\u8BE6\u60C5` },
            views.map((item) => h("button", {
              className: `di-time-tab${activeView === item.id ? " is-active" : ""}`,
              type: "button",
              role: "tab",
              key: item.id,
              "aria-selected": activeView === item.id,
              onClick: () => setSelection({ questionId: question.id, view: item.id })
            }, item.label))
          ),
          h("button", { type: "button", onClick: () => setSelection(null), "aria-label": "\u5173\u95ED" }, "\xD7")
        ),
        h("div", { className: "di-time-flyout-body", role: "tabpanel" }, h(TimelineContent, { question, view: activeView }))
      ) : null
    );
  }));
}

// src/protocol/interview-tool-names.js
var INTERVIEW_TOOL_NAMES = Object.freeze([
  "interview_start_practice",
  "interview_update_practice",
  "interview_get_status",
  "interview_continue_practice",
  "interview_select_practice",
  "interview_reopen_practice",
  "interview_finish_practice",
  "interview_complete_summary",
  "interview_present_question",
  "interview_get_question",
  "interview_update_question",
  "interview_delete_question",
  "interview_open_question",
  "interview_request_next",
  "interview_retry_question",
  "interview_reveal_answer",
  "interview_submit_answer",
  "interview_save_evaluation",
  "interview_complete_review",
  "interview_list_practices",
  "interview_read_practice_context",
  "interview_get_practice",
  "interview_get_insights",
  "interview_get_leetcode_catalog",
  "interview_set_leetcode_completion",
  "interview_export_practices",
  "interview_delete_practice"
]);

// src/client/shared/styles.js
var STYLE_TEXT = `
:root{--di-ink:#10182f;--di-muted:#64708a;--di-paper:#f7f9fc;--di-line:#e5eaf1;--di-blue:#245cff;--di-blue-soft:#f5f7ff;--di-green:#15884e;--di-green-soft:#f2faf6;--di-amber:#ffb800;--di-red:#ef4444;--di-white:#fff;--di-shadow:0 8px 28px rgba(28,39,67,.07)}
.di-card,.di-ledger,.di-timeline,.di-lc-catalog{font-family:"Segoe UI Variable","Segoe UI","Microsoft YaHei",sans-serif;color:var(--di-ink);box-sizing:border-box}
.di-card *,.di-ledger *,.di-timeline *,.di-lc-catalog *{box-sizing:border-box}.di-preline{white-space:pre-wrap;line-height:1.75}.di-icon{display:inline-block;flex:0 0 auto;vertical-align:middle}
.di-card{width:min(1080px,100%);border:1px solid var(--di-line);border-radius:14px;background:var(--di-white);overflow:hidden;box-shadow:var(--di-shadow)}
.di-card-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:20px 24px;border-bottom:1px solid var(--di-line);background:var(--di-white)}
.di-card-body{padding:24px}.di-eyebrow{font-size:11px;font-weight:700;line-height:1.2;letter-spacing:.12em;text-transform:uppercase;color:var(--di-blue)}.di-title{font-size:18px;font-weight:720}.di-subtitle{margin-top:4px;font-size:13px;color:var(--di-muted)}
.di-question-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:30px;padding:26px 34px}.di-question-main{min-width:0}.di-question-text{font-size:19px;font-weight:620;line-height:1.55;color:var(--di-ink)}.di-question-text p{margin:0}.di-answer-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-width:140px;padding:12px 18px!important;border-color:var(--di-blue)!important;color:var(--di-blue)!important;background:var(--di-white)!important;font-size:15px!important}
.di-button{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--di-line);border-radius:8px;padding:9px 13px;background:var(--di-white);color:var(--di-ink);font:600 13px/1 "Segoe UI Variable","Segoe UI","Microsoft YaHei",sans-serif;cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease,box-shadow .15s ease}.di-button:hover:not(:disabled){transform:translateY(-1px);border-color:#b8c6e6;box-shadow:0 4px 12px rgba(36,92,255,.08)}.di-button:focus-visible,.di-input:focus-visible,.di-select:focus-visible,.di-history-topic:focus-visible{outline:3px solid rgba(36,92,255,.18);outline-offset:2px}.di-button:disabled{opacity:.55;cursor:not-allowed}.di-button.is-primary{background:var(--di-blue);border-color:var(--di-blue);color:#fff}.di-button.is-danger{color:var(--di-red);border-color:#ffd9dc;background:#fffafa}
.di-phase{display:inline-flex;border:1px solid var(--di-line);border-radius:999px;padding:5px 9px;font-size:11px;font-weight:700;color:var(--di-muted);white-space:nowrap}.di-phase-awaiting_answer,.di-phase-awaiting_solution{border-color:#b9c8ff;color:var(--di-blue);background:var(--di-blue-soft)}.di-phase-generating_explanation{border-color:#ffe1a3;color:#a76500;background:#fffaf0}.di-phase-awaiting_next{border-color:#bde6cf;color:var(--di-green);background:var(--di-green-soft)}.di-phase-completed{color:var(--di-muted);background:var(--di-paper)}
.di-review-card{display:flex;flex-direction:column}.di-review-score{display:flex;align-items:center;gap:18px;padding:20px 28px;border-bottom:1px solid var(--di-line);background:#fbfcfe}.di-review-check{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:9px;color:#fff;background:var(--di-green);box-shadow:0 0 0 7px var(--di-green-soft)}.di-review-score-summary{display:flex;align-items:baseline;gap:12px}.di-review-score-label{font-size:14px;font-weight:700}.di-review-score-value{display:flex;align-items:baseline;gap:7px}.di-review-score-value strong{font-size:30px;font-weight:550;line-height:1;color:var(--di-green)}.di-review-score-value span{font-size:15px;color:var(--di-muted)}.di-stars{display:flex;gap:4px;margin-left:auto}.di-star{font-size:23px;line-height:1;background:linear-gradient(90deg,var(--di-amber) var(--di-star-fill),#dfe4ec var(--di-star-fill));background-clip:text;-webkit-background-clip:text;color:transparent;-webkit-text-fill-color:transparent}.di-review-content{min-width:0;padding:26px 28px}.di-review-section+.di-review-section{margin-top:20px}.di-review-section h3{margin:0 0 9px;font-size:15px}.di-feedback-banner{padding:12px 15px;border:1px solid #e0f0e7;border-radius:9px;background:var(--di-green-soft);font-size:14px;line-height:1.65}.di-dimensions{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}.di-dimensions span{display:inline-flex;gap:8px;padding:6px 9px;border-radius:6px;background:var(--di-paper);font-size:12px;color:var(--di-muted)}.di-dimensions strong{color:var(--di-ink)}.di-explanation-copy{font-size:14px;line-height:1.75}.di-explanation-copy p,.di-explanation-copy ul,.di-explanation-copy ol{margin-top:6px;margin-bottom:6px}.di-memorize-box{margin-top:18px;padding:14px 15px;border:1px solid #dcefe5;border-radius:9px;background:linear-gradient(100deg,#f2faf6,#f8fbf9)}.di-memorize-label{margin-bottom:5px;font-size:13px;font-weight:700;color:#116d40}.di-memorize-copy{font-size:14px;line-height:1.65}.di-review-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:18px;padding-top:15px;border-top:1px solid var(--di-line)}
.di-score-row{display:flex;align-items:center;gap:12px}.di-score-number{font-size:27px;font-weight:700}.di-score-rail{display:inline-grid;grid-template-columns:repeat(10,8px);gap:3px}.di-score-rail i{display:block;height:15px;border-radius:2px;background:#e8ebf2}.di-score-rail.is-compact{grid-template-columns:repeat(10,5px);gap:2px}.di-score-rail.is-compact i{height:9px}.di-score-rail i.is-good{background:var(--di-green)}.di-score-rail i.is-mid{background:var(--di-amber)}.di-score-rail i.is-low{background:var(--di-red)}
.di-section{margin-top:16px;padding-top:14px;border-top:1px solid var(--di-line)}.di-section-label{margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--di-muted)}.di-attempt{margin-top:12px;padding:12px 14px;border-left:3px solid var(--di-blue);background:var(--di-paper);border-radius:0 7px 7px 0}.di-attempt-head{display:flex;justify-content:space-between;margin-bottom:7px;font-size:12px;color:var(--di-muted)}.di-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.di-state,.di-empty{padding:28px;text-align:center;color:var(--di-muted)}.di-empty{display:grid;gap:6px}.di-spinner{display:inline-block;width:14px;height:14px;margin-right:8px;border:2px solid var(--di-line);border-top-color:var(--di-blue);border-radius:50%;animation:di-spin .8s linear infinite}.di-notice{margin:12px 18px;padding:10px 12px;border-radius:7px;background:var(--di-blue-soft);font-size:13px}.di-notice.is-error{background:#fff1f2;color:var(--di-red)}.di-link{color:var(--di-blue);text-decoration:none}
.di-tool-error{display:flex;align-items:baseline;gap:8px;width:min(1080px,100%);padding:10px 13px;border-left:3px solid var(--di-red);border-radius:0 7px 7px 0;background:#fff1f2;color:var(--di-red);font:13px/1.5 "Segoe UI","Microsoft YaHei",sans-serif}.di-tool-error span{color:var(--di-muted)}
.di-ledger{width:min(1080px,100%);border:1px solid var(--di-line);border-radius:14px;background:var(--di-white);overflow:hidden;box-shadow:var(--di-shadow)}.di-history-head{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:20px 24px;border-bottom:1px solid var(--di-line)}.di-ledger-title{font-size:18px;font-weight:730}.di-history-filters{display:flex;gap:8px;padding:12px 24px;border-bottom:1px solid var(--di-line);background:#fbfcfe}.di-input,.di-select{min-width:0;border:1px solid var(--di-line);border-radius:7px;padding:8px 10px;background:var(--di-white);color:var(--di-ink)}.di-input{flex:1}.di-textarea{min-height:150px;resize:vertical;line-height:1.6}.di-practice-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:18px 24px;border-bottom:1px solid var(--di-line);background:#fbfcfe}.di-field{display:grid;gap:6px;font-size:13px;font-weight:600}.di-field-wide{grid-column:1/-1}.di-history-scroll{overflow-x:auto}.di-history-table{width:100%;border-collapse:collapse;font-size:13px}.di-history-table th{padding:10px 24px;color:var(--di-muted);font-weight:500;text-align:left;background:#fbfcfe}.di-history-table td{padding:10px 24px;border-top:1px solid var(--di-line);white-space:nowrap}.di-history-table tr.is-selected td{background:var(--di-blue-soft)}.di-history-topic{appearance:none;border:0;padding:0;background:transparent;color:var(--di-ink);font:inherit;font-size:13px;font-weight:600;line-height:1.4;cursor:pointer;text-align:left}.di-history-topic:hover{color:var(--di-blue)}.di-history-time{color:var(--di-muted)}.di-history-score{font-size:14px}.di-history-score.is-good{color:var(--di-green)}.di-history-score.is-mid{color:#e69600}.di-history-score.is-empty{color:var(--di-muted)}.di-row-actions{display:flex;justify-content:flex-end;gap:10px}.di-icon-button{width:34px;height:32px;padding:0}.di-icon-button.is-delete{color:var(--di-red);border-color:#ffe0e2;background:#fffafa}.di-delete-confirm{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:12px 24px;padding:11px 13px;border:1px solid #ffd8dc;border-radius:8px;background:#fff8f8;font-size:13px}.di-delete-confirm .di-actions{margin:0}.di-history-detail{border-top:1px solid var(--di-line);background:#fbfcfe}.di-detail{padding:22px 24px;max-height:620px;overflow:auto}.di-detail-question{padding:15px 0;border-bottom:1px solid var(--di-line)}.di-detail-question-head{display:flex;gap:10px;align-items:flex-start}.di-detail-question-text{flex:1;line-height:1.6}.di-detail-actions{display:flex;gap:6px;margin-top:10px}.di-sequence{font-size:12px;font-weight:750;color:var(--di-blue)}.di-confirm{margin-top:10px;padding:10px;border:1px solid #ffd8dc;border-radius:7px}
.di-lc-problem-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:28px;padding:25px 28px;overflow:visible}.di-lc-problem-main{min-width:0}.di-lc-problem-title{display:flex;align-items:baseline;gap:11px;margin-top:7px;font-size:21px;font-weight:700;line-height:1.35}.di-lc-problem-title>span{font-size:13px;font-weight:750;color:var(--di-muted)}.di-lc-problem-meta{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:12px;color:var(--di-muted)}.di-lc-problem-meta .is-complete{color:var(--di-green);font-weight:700}.di-lc-problem-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;max-width:510px}.di-lc-problem-actions>.di-button{text-decoration:none}.di-lc-difficulty{display:inline-flex;align-items:center;justify-content:center;min-width:42px;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700}.di-lc-difficulty.is-easy{color:#087a45;background:#edf9f3}.di-lc-difficulty.is-medium{color:#a86300;background:#fff7e7}.di-lc-difficulty.is-hard{color:#cf3139;background:#fff0f1}
.di-lc-catalog{width:min(1080px,100%);margin-top:12px;border:1px solid var(--di-line);border-radius:14px;background:var(--di-white);overflow:hidden;box-shadow:var(--di-shadow)}.di-lc-catalog-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:24px 28px 18px}.di-lc-title{margin:5px 0 2px;font-size:24px;line-height:1.15}.di-lc-source{color:var(--di-muted);font-size:12px;text-decoration:none}.di-lc-source:hover{color:var(--di-blue)}.di-lc-progress-copy{display:flex;align-items:baseline;gap:5px;color:var(--di-muted)}.di-lc-progress-copy strong{font-size:26px;font-weight:650;color:var(--di-green)}.di-lc-progress{height:3px;margin:0 28px 6px;border-radius:99px;background:#edf0f5;overflow:hidden}.di-lc-progress>i{display:block;height:100%;border-radius:inherit;background:var(--di-green);transition:width .2s ease}.di-lc-groups{padding:4px 28px 28px}.di-lc-group{display:grid;grid-template-columns:132px minmax(0,1fr);padding:22px 0;border-top:1px solid var(--di-line)}.di-lc-group-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding-right:24px}.di-lc-group-head h3{margin:0;font-size:14px}.di-lc-group-head span{color:var(--di-muted);font-size:11px;font-variant-numeric:tabular-nums}.di-lc-problems{min-width:0}.di-lc-row{display:grid;grid-template-columns:24px minmax(0,1fr) 52px;align-items:center;gap:10px;min-height:38px;padding:3px 4px;border-radius:7px}.di-lc-row:hover{background:var(--di-paper)}.di-lc-row.is-complete .di-lc-problem-link{color:var(--di-muted)}.di-lc-check{appearance:none;width:19px;height:19px;border:1.5px solid #b9c2d2;border-radius:5px;background:var(--di-white);color:#fff;font:800 12px/16px "Segoe UI",sans-serif;cursor:pointer}.di-lc-check:hover{border-color:var(--di-green)}.di-lc-check:focus-visible,.di-lc-problem-link:focus-visible,.di-lc-source:focus-visible{outline:3px solid rgba(36,92,255,.18);outline-offset:2px}.di-lc-check.is-complete{border-color:var(--di-green);background:var(--di-green)}.di-lc-check:disabled{opacity:.55;cursor:wait}.di-lc-problem-link{display:flex;align-items:baseline;gap:9px;min-width:0;color:var(--di-ink);font-size:13px;font-weight:600;text-decoration:none}.di-lc-problem-link:hover{color:var(--di-blue)}.di-lc-problem-id{width:30px;flex:0 0 auto;color:var(--di-muted);font-size:11px;font-variant-numeric:tabular-nums;text-align:right}.di-lc-open{opacity:0;color:var(--di-blue);transition:opacity .15s ease}.di-lc-row:hover .di-lc-open{opacity:1}
.di-timeline{position:fixed;right:18px;top:112px;z-index:40;display:grid;gap:14px;width:56px;max-height:calc(100vh - 144px);padding:4px 0;overflow:visible;font-family:"Segoe UI Variable","Segoe UI","Microsoft YaHei",sans-serif;color:var(--di-ink)}.di-time-item{position:relative;min-height:34px}.di-time-item:not(:last-child)::after{content:"";position:absolute;z-index:-1;top:27px;right:43px;width:1px;height:25px;background:var(--di-line)}.di-time-node{appearance:none;display:flex;align-items:center;gap:7px;width:56px;height:30px;padding:0 8px;border:0;border-radius:999px;background:transparent;color:var(--di-muted);font:700 11px/1 "Segoe UI Variable","Segoe UI","Microsoft YaHei",sans-serif;cursor:pointer;transition:color .15s ease,background .15s ease}.di-time-node:hover,.di-time-node:focus-visible,.di-time-item.has-view .di-time-node{color:var(--di-blue);background:var(--di-blue-soft)}.di-time-node:focus-visible,.di-time-tab:focus-visible,.di-time-flyout-head>button:focus-visible{outline:3px solid rgba(36,92,255,.18);outline-offset:2px}.di-time-dot{width:7px;height:7px;flex:0 0 auto;border:2px solid #b7c0d0;border-radius:50%;background:var(--di-white)}.di-time-item.is-current .di-time-dot{border-color:var(--di-blue);background:var(--di-blue);box-shadow:0 0 0 4px rgba(36,92,255,.1)}.di-time-flyout{position:fixed;right:82px;top:112px;width:min(390px,calc(100vw - 112px));max-height:calc(100vh - 144px);overflow:hidden;border:1px solid var(--di-line);border-radius:11px;background:var(--di-white);box-shadow:0 16px 42px rgba(23,32,51,.14)}.di-time-flyout-head{display:flex;align-items:stretch;border-bottom:1px solid var(--di-line)}.di-time-tabs{display:flex;align-items:stretch;min-width:0;padding-left:14px}.di-time-tab{appearance:none;position:relative;border:0;padding:13px 2px 11px;margin-right:20px;background:transparent;color:var(--di-muted);font:650 12px/1 "Segoe UI Variable","Segoe UI","Microsoft YaHei",sans-serif;cursor:pointer}.di-time-tab::after{content:"";position:absolute;right:0;bottom:-1px;left:0;height:2px;border-radius:2px;background:transparent}.di-time-tab:hover{color:var(--di-ink)}.di-time-tab.is-active{color:var(--di-blue)}.di-time-tab.is-active::after{background:var(--di-blue)}.di-time-flyout-head>button{appearance:none;width:42px;border:0;margin-left:auto;background:transparent;color:var(--di-muted);font-size:20px;line-height:1;cursor:pointer}.di-time-flyout-head>button:hover{color:var(--di-ink);background:var(--di-paper)}.di-time-flyout-body{max-height:calc(100vh - 188px);padding:15px 16px;overflow:auto;font-size:13px;line-height:1.7}.di-time-records{display:grid;gap:16px}.di-time-record{padding-bottom:15px;border-bottom:1px solid var(--di-line)}.di-time-record:last-child{padding-bottom:0;border-bottom:0}.di-time-record-label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px;color:var(--di-muted);font-size:11px;font-weight:700}.di-time-record-label strong{color:var(--di-green)}.di-time-content-label{margin-bottom:4px;color:var(--di-muted);font-size:11px;font-weight:700}.di-time-record-review{margin-top:10px;padding:10px 12px;border-radius:8px;background:var(--di-paper)}.di-time-answer>.di-time-memorize{margin-top:14px;padding:12px;border-radius:8px;background:var(--di-green-soft)}.di-time-empty{padding:16px 4px;text-align:center;color:var(--di-muted)}
@keyframes di-spin{to{transform:rotate(360deg)}}
@media(max-width:760px){.di-question-card,.di-lc-problem-card{grid-template-columns:1fr;padding:22px}.di-lc-problem-actions{justify-content:flex-start;max-width:none}.di-lc-group{grid-template-columns:1fr;gap:10px}.di-lc-group-head{justify-content:flex-start}.di-answer-button{justify-self:start}.di-history-table th,.di-history-table td{padding-left:16px;padding-right:16px}.di-history-filters{flex-wrap:wrap}.di-input{flex-basis:100%}.di-timeline{display:none}}
@media(max-width:520px){.di-card-body{padding:18px}.di-question-text{font-size:17px}.di-review-score{flex-wrap:wrap;padding:18px}.di-review-score-summary{flex:1}.di-stars{width:100%;margin-left:56px}.di-review-content{padding:20px 18px}.di-review-actions{justify-content:flex-start}.di-history-head{padding:17px 18px}.di-history-filters{padding:10px 18px}.di-select{flex:1}.di-practice-form{grid-template-columns:1fr;padding:16px 18px}.di-field-wide{grid-column:1}.di-delete-confirm{align-items:flex-start;flex-direction:column;margin:10px 18px}.di-lc-catalog-head{align-items:flex-start;padding:20px;}.di-lc-progress{margin-right:20px;margin-left:20px}.di-lc-groups{padding-right:20px;padding-left:20px}.di-lc-row{grid-template-columns:22px minmax(0,1fr) 44px}.di-lc-problem-id{display:none}}
@media(prefers-reduced-motion:reduce){.di-button,.di-time-node{transition:none}.di-spinner{animation-duration:1.5s}}
`;
function installStyles() {
  if (document.getElementById("dsh-interview-styles")) return;
  const style = document.createElement("style");
  style.id = "dsh-interview-styles";
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
}

// src/client/index.js
var name = "dsh-interview";
var inject = ["slots"];
function resolveToolView(toolName, block) {
  const state = toolCallState(block);
  if (state === "running") return { kind: "hidden" };
  if (state === "error" && toolErrorAudience(block) === "agent") return { kind: "hidden" };
  if (state === "error") return { kind: "error", message: toolErrorMessage(block) };
  const result = parseInteractionResult(block);
  if (!result || result.error?.audience === "agent" || !result.presentation) return { kind: "hidden" };
  return { ...result.presentation, revision: result.revision, toolName };
}
function ToolResourceView({ toolName, sessionId, block }) {
  const view = resolveToolView(toolName, block);
  switch (view.kind) {
    case "error":
      return h(ToolErrorCard, { message: view.message });
    case "question":
      return h(QuestionResourceCard, { presentation: view, revision: view.revision, sessionId });
    case "review":
      return h(ReviewResourceCard, { presentation: view, revision: view.revision, sessionId });
    case "library":
      return h(PracticeLibrary, { sessionId, initialPracticeId: view.practiceId });
    case "insights":
      return h(InsightsCard);
    case "leetcode-catalog":
      return h(LeetcodeCatalog, { sessionId });
    case "deleted":
      return h(CompactResultCard, { title: "\u7EC3\u4E60\u5DF2\u5220\u9664", detail: "\u6863\u6848\u548C\u5BF9\u5E94\u4F1A\u8BDD\u6E38\u6807\u5DF2\u7ECF\u6E05\u7406\u3002", tone: "completed" });
    case "exported":
      return h(CompactResultCard, { title: "Markdown \u5DF2\u751F\u6210", detail: "\u6253\u5F00\u7EC3\u4E60\u6863\u6848\u53EF\u4EE5\u4E0B\u8F7D\u672C\u6B21\u5BFC\u51FA\u3002" });
    case "finished":
      return h(PracticeSummaryCard, { presentation: view, revision: view.revision });
    case "live-session":
      return h(LiveInterviewCard, { sessionId });
    default:
      return null;
  }
}
function apply(ctx) {
  installStyles();
  const slots = ctx.get("slots");
  if (!slots) return;
  for (const toolName of INTERVIEW_TOOL_NAMES) {
    slots.inject("tool.call.toolview", () => slots.register(
      { name: "tool.call.toolview", key: toolName },
      (props) => h(ToolResourceView, { toolName, sessionId: props.sessionId || "global", block: props.block })
    ));
  }
  slots.inject("conversation.input.dock", () => slots.register(
    { name: "conversation.input.dock", id: "interview-timeline", order: 25 },
    (props) => {
      const revisionSignal = typeof props.useSession === "function" ? props.useSession((snapshot) => {
        const order = snapshot?.chat?.order || [];
        return `${order.length}:${order.at(-1) || ""}`;
      }) : "";
      return h(TimelinePanel, { sessionId: props.sessionId || "global", revisionSignal });
    }
  ));
}
return module.exports; }});
