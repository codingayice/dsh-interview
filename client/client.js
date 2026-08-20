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
var import_react6 = __toESM(require("react"), 1);

// src/client/features/live-interview.js
var import_react3 = __toESM(require("react"), 1);

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
    awaiting_answer: "\u7B49\u5F85\u56DE\u7B54",
    awaiting_evaluation: "\u6B63\u5728\u8BC4\u4EF7",
    generating_explanation: "\u6B63\u5728\u751F\u6210\u5B8C\u6574\u590D\u76D8",
    generating_summary: "\u6B63\u5728\u751F\u6210\u7EC3\u4E60\u603B\u7ED3",
    awaiting_next: "\u590D\u76D8\u5B8C\u6210",
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
        import_react3.default.Fragment,
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
      h("div", null, h("div", { className: "di-eyebrow" }, "INTERVIEW WORKSPACE"), h("div", { className: "di-title" }, title)),
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
  const [copied, setCopied] = import_react3.default.useState(false);
  const run = (name2, payload) => command.run(name2, payload).catch(() => {
  });
  const evaluation = attempt?.evaluation || null;
  const explanation = question.explanation;
  const copyMemorization = async () => {
    try {
      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(explanation.memorizationPoints);
      } else {
        const textarea = globalThis.document?.createElement?.("textarea");
        if (!textarea) return;
        textarea.value = explanation.memorizationPoints;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        globalThis.document.body.appendChild(textarea);
        textarea.select();
        globalThis.document.execCommand?.("copy");
        textarea.remove();
      }
      setCopied(true);
      globalThis.setTimeout?.(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return h(
    "article",
    { id: `di-review-${question.id}`, className: `di-card di-review-card${evaluation ? "" : " is-answer-only"}`, "aria-label": "\u672C\u9898\u590D\u76D8" },
    evaluation ? h(
      "aside",
      { className: "di-review-score" },
      h("span", { className: "di-review-check" }, h(Icon, { name: "check", size: 22 })),
      h("div", { className: "di-review-score-label" }, "\u8BC4\u5206"),
      h(
        "div",
        { className: "di-review-score-value" },
        h("strong", null, Number(evaluation.score).toFixed(1)),
        h("span", null, "/ 10")
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
        ),
        h(Button, { className: "di-copy-button", onClick: copyMemorization }, h(Icon, { name: "copy" }), copied ? "\u5DF2\u590D\u5236" : "\u590D\u5236")
      ),
      attempt ? h(
        "div",
        { className: "di-review-answer" },
        h("span", null, `\u7B2C ${attempt.sequence} \u6B21\u4F5C\u7B54`),
        h(Markdown, null, attempt.answer)
      ) : null,
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
  return h(PresentedState, { query, missing: "\u627E\u4E0D\u5230\u9898\u76EE\u5361\u7247\u6570\u636E" }, question ? h(QuestionResultCard, { sessionId, question }) : null);
}
function ReviewResourceCard({ presentation, revision, sessionId }) {
  const query = usePresentedPractice(presentation, revision);
  const practice = query.data?.resource?.data;
  const question = practice?.questions?.find((item) => item.id === presentation.questionId);
  const attempt = presentation.attemptId ? question?.attempts?.find((item) => item.id === presentation.attemptId) : null;
  const complete = question?.explanation && (!presentation.attemptId || attempt?.evaluation);
  return h(PresentedState, { query, missing: "\u627E\u4E0D\u5230\u5B8C\u6574\u590D\u76D8\u5361\u7247\u6570\u636E" }, complete ? h(ReviewResultCard, { sessionId, question, attempt }) : null);
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
var import_react4 = __toESM(require("react"), 1);
function PracticeDetail({ practice, sessionId, onDeleted }) {
  const command = useCommand(sessionId);
  const [confirming, setConfirming] = import_react4.default.useState(false);
  const [downloads, setDownloads] = import_react4.default.useState([]);
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
    h("div", { className: "di-subtitle" }, `${practice.questionCount} \u9898 \xB7 ${practice.evaluatedCount} \u6B21\u5DF2\u8BC4\u4EF7 \xB7 \u5747\u5206 ${practice.averageScore ?? "\u2014"}`),
    h(
      "div",
      { className: "di-actions" },
      h(Button, { tone: "primary", busy: Boolean(command.busy?.startsWith("session.")), onClick: activate }, practice.status === "completed" ? "\u91CD\u65B0\u6253\u5F00" : "\u5207\u6362\u5230\u7EC3\u4E60"),
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
          h("div", { className: "di-detail-question-text" }, h(Markdown, null, question.prompt)),
          h(ScoreRail, { score: question.latestScore, compact: true })
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
          practice.status === "active" && latest?.evaluation ? h(Button, { onClick: () => retry(question.id) }, "\u91CD\u65B0\u4F5C\u7B54") : null
        )
      );
    }) : h(Empty, { title: "\u8FD9\u6761\u7EC3\u4E60\u8FD8\u6CA1\u6709\u9898\u76EE" })
  );
}
function PracticeLibrary({ sessionId, initialPracticeId = null }) {
  const [queryText, setQueryText] = import_react4.default.useState("");
  const [mode, setMode] = import_react4.default.useState("");
  const [status, setStatus] = import_react4.default.useState("");
  const [selectedId, setSelectedId] = import_react4.default.useState(initialPracticeId);
  const [confirmingId, setConfirmingId] = import_react4.default.useState(null);
  const [downloads, setDownloads] = import_react4.default.useState([]);
  const command = useCommand(sessionId);
  const filters = { query: queryText, mode, status };
  const list = useInterviewQuery(`practices:${queryText}:${mode}:${status}`, () => interviewApi.practices(filters), [queryText, mode, status]);
  const practices = list.data?.resource?.data || [];
  const detail = useInterviewQuery(`practice:${selectedId || "none"}`, () => selectedId ? interviewApi.practice(selectedId) : Promise.resolve(null), [selectedId]);
  const selected = detail.data?.resource?.data || null;
  const run = (name2, payload) => command.run(name2, payload).catch(() => null);
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
      h(
        "div",
        { className: "di-history-legend", "aria-hidden": "true" },
        h("span", null, h(Icon, { name: "swap" }), "\u5207\u6362\u5230\u8BE5\u7EC3\u4E60"),
        h("span", null, h(Icon, { name: "trash" }), "\u5220\u9664"),
        h("span", null, h(Icon, { name: "download" }), "\u5BFC\u51FA")
      )
    ),
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
        h("option", { value: "scenario" }, "\u573A\u666F\u9898")
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
    h("header", { className: "di-card-head" }, h("div", null, h("div", { className: "di-eyebrow" }, "CAPABILITY REVIEW"), h("div", { className: "di-title" }, "\u80FD\u529B\u590D\u76D8"))),
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
var import_react5 = __toESM(require("react"), 1);
function TimelinePanel({ sessionId, revisionSignal }) {
  const [open, setOpen] = import_react5.default.useState(true);
  const sessionQuery = useInterviewQuery(`timeline-session:${sessionId}:${revisionSignal}`, () => interviewApi.session(sessionId), [sessionId, revisionSignal], { cache: false });
  const session = sessionQuery.data?.resource?.data;
  const practiceId = session?.practice?.id || null;
  const detailQuery = useInterviewQuery(`timeline-practice:${practiceId || "none"}:${revisionSignal}`, () => practiceId ? interviewApi.practice(practiceId) : Promise.resolve(null), [practiceId, revisionSignal], { cache: false });
  const practice = detailQuery.data?.resource?.data;
  if (!session?.selected || !practice?.questions?.length) return null;
  if (!open) return h("button", { className: "di-button", style: { position: "fixed", right: "16px", top: "112px", zIndex: 40 }, onClick: () => setOpen(true) }, `\u9898\u76EE ${practice.questions.length}`);
  return h(
    "aside",
    { className: "di-timeline", "aria-label": "\u9898\u76EE\u65F6\u95F4\u8F74" },
    h(
      "div",
      { className: "di-timeline-head" },
      h("div", null, h("div", { className: "di-eyebrow" }, "QUESTION TRACK"), h("strong", null, practice.topic)),
      h("button", { className: "di-button", onClick: () => setOpen(false), "aria-label": "\u6536\u8D77\u9898\u76EE\u65F6\u95F4\u8F74" }, "\u6536\u8D77")
    ),
    h(
      "div",
      { className: "di-timeline-body" },
      h(PhaseBadge, { phase: session.phase }),
      practice.questions.map((question) => h(
        "div",
        { className: `di-time-item${session.questionId === question.id ? " is-current" : ""}`, key: question.id },
        h("div", { className: "di-sequence" }, `Q${String(question.sequence).padStart(2, "0")}`),
        h("div", { className: "di-time-q", title: question.prompt }, question.prompt),
        h("div", { className: "di-time-meta" }, h(ScoreRail, { score: question.latestScore, compact: true }), h("span", null, `${question.attempts.length} \u6B21\u4F5C\u7B54`))
      ))
    )
  );
}

// src/protocol/interview-tool-names.js
var INTERVIEW_TOOL_NAMES = Object.freeze([
  "interview_start_practice",
  "interview_get_status",
  "interview_select_practice",
  "interview_reopen_practice",
  "interview_finish_practice",
  "interview_complete_summary",
  "interview_present_question",
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
  "interview_export_practices",
  "interview_delete_practice"
]);

// src/client/shared/styles.js
var STYLE_TEXT = `
:root{--di-ink:#10182f;--di-muted:#64708a;--di-paper:#f7f9fc;--di-line:#e5eaf1;--di-blue:#245cff;--di-blue-soft:#f5f7ff;--di-green:#15884e;--di-green-soft:#f2faf6;--di-amber:#ffb800;--di-red:#ef4444;--di-white:#fff;--di-shadow:0 8px 28px rgba(28,39,67,.07)}
.di-card,.di-ledger,.di-timeline{font-family:"Segoe UI Variable","Segoe UI","Microsoft YaHei",sans-serif;color:var(--di-ink);box-sizing:border-box}
.di-card *,.di-ledger *,.di-timeline *{box-sizing:border-box}.di-preline{white-space:pre-wrap;line-height:1.75}.di-icon{display:inline-block;flex:0 0 auto;vertical-align:middle}
.di-card{width:min(1080px,100%);border:1px solid var(--di-line);border-radius:14px;background:var(--di-white);overflow:hidden;box-shadow:var(--di-shadow)}
.di-card-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:20px 24px;border-bottom:1px solid var(--di-line);background:var(--di-white)}
.di-card-body{padding:24px}.di-eyebrow{font-size:11px;font-weight:700;line-height:1.2;letter-spacing:.12em;text-transform:uppercase;color:var(--di-blue)}.di-title{font-size:18px;font-weight:720}.di-subtitle{margin-top:4px;font-size:13px;color:var(--di-muted)}
.di-question-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:30px;padding:26px 34px}.di-question-main{min-width:0}.di-question-text{font-size:19px;font-weight:620;line-height:1.55;color:var(--di-ink)}.di-question-text p{margin:0}.di-answer-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-width:140px;padding:12px 18px!important;border-color:var(--di-blue)!important;color:var(--di-blue)!important;background:var(--di-white)!important;font-size:15px!important}
.di-button{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--di-line);border-radius:8px;padding:9px 13px;background:var(--di-white);color:var(--di-ink);font:600 13px/1 "Segoe UI Variable","Segoe UI","Microsoft YaHei",sans-serif;cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease,box-shadow .15s ease}.di-button:hover:not(:disabled){transform:translateY(-1px);border-color:#b8c6e6;box-shadow:0 4px 12px rgba(36,92,255,.08)}.di-button:focus-visible,.di-input:focus-visible,.di-select:focus-visible,.di-history-topic:focus-visible{outline:3px solid rgba(36,92,255,.18);outline-offset:2px}.di-button:disabled{opacity:.55;cursor:not-allowed}.di-button.is-primary{background:var(--di-blue);border-color:var(--di-blue);color:#fff}.di-button.is-danger{color:var(--di-red);border-color:#ffd9dc;background:#fffafa}
.di-phase{display:inline-flex;border:1px solid var(--di-line);border-radius:999px;padding:5px 9px;font-size:11px;font-weight:700;color:var(--di-muted);white-space:nowrap}.di-phase-awaiting_answer{border-color:#b9c8ff;color:var(--di-blue);background:var(--di-blue-soft)}.di-phase-generating_explanation{border-color:#ffe1a3;color:#a76500;background:#fffaf0}.di-phase-awaiting_next{border-color:#bde6cf;color:var(--di-green);background:var(--di-green-soft)}.di-phase-completed{color:var(--di-muted);background:var(--di-paper)}
.di-review-card{display:grid;grid-template-columns:220px minmax(0,1fr);padding:24px 28px}.di-review-score{padding:8px 28px 8px 0;border-right:1px solid var(--di-line)}.di-review-check{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;margin-bottom:22px;border-radius:9px;color:#fff;background:var(--di-green);box-shadow:0 0 0 8px var(--di-green-soft)}.di-review-score-label{margin-bottom:10px;font-size:14px;font-weight:700}.di-review-score-value{display:flex;align-items:baseline;gap:8px}.di-review-score-value strong{font-size:35px;font-weight:500;line-height:1;color:var(--di-green)}.di-review-score-value span{font-size:16px;color:var(--di-muted)}.di-stars{display:flex;gap:4px;margin-top:16px}.di-star{font-size:25px;line-height:1;background:linear-gradient(90deg,var(--di-amber) var(--di-star-fill),#dfe4ec var(--di-star-fill));background-clip:text;-webkit-background-clip:text;color:transparent;-webkit-text-fill-color:transparent}.di-review-content{padding-left:30px;min-width:0}.di-review-section+.di-review-section{margin-top:20px}.di-review-section h3{margin:0 0 9px;font-size:15px}.di-feedback-banner{padding:12px 15px;border:1px solid #e0f0e7;border-radius:9px;background:var(--di-green-soft);font-size:14px;line-height:1.65}.di-dimensions{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}.di-dimensions span{display:inline-flex;gap:8px;padding:6px 9px;border-radius:6px;background:var(--di-paper);font-size:12px;color:var(--di-muted)}.di-dimensions strong{color:var(--di-ink)}.di-explanation-copy{font-size:14px;line-height:1.75}.di-explanation-copy p,.di-explanation-copy ul,.di-explanation-copy ol{margin-top:6px;margin-bottom:6px}.di-memorize-box{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:20px;margin-top:18px;padding:14px 15px;border:1px solid #dcefe5;border-radius:9px;background:linear-gradient(100deg,#f2faf6,#f8fbf9)}.di-memorize-label{margin-bottom:5px;font-size:13px;font-weight:700;color:#116d40}.di-memorize-copy{font-size:14px;line-height:1.65}.di-copy-button{color:var(--di-green)!important;border-color:#d7ebe0!important;background:rgba(255,255,255,.7)!important}.di-review-answer{margin-top:15px;padding:11px 13px;border-left:3px solid #cbd5e7;background:var(--di-paper);font-size:13px;color:var(--di-muted)}.di-review-answer>span{display:block;margin-bottom:4px;font-weight:700;color:var(--di-ink)}.di-review-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:18px;padding-top:15px;border-top:1px solid var(--di-line)}
.di-review-card.is-answer-only{grid-template-columns:minmax(0,1fr)}.di-review-card.is-answer-only .di-review-content{padding-left:0}
.di-score-row{display:flex;align-items:center;gap:12px}.di-score-number{font-size:27px;font-weight:700}.di-score-rail{display:inline-grid;grid-template-columns:repeat(10,8px);gap:3px}.di-score-rail i{display:block;height:15px;border-radius:2px;background:#e8ebf2}.di-score-rail.is-compact{grid-template-columns:repeat(10,5px);gap:2px}.di-score-rail.is-compact i{height:9px}.di-score-rail i.is-good{background:var(--di-green)}.di-score-rail i.is-mid{background:var(--di-amber)}.di-score-rail i.is-low{background:var(--di-red)}
.di-section{margin-top:16px;padding-top:14px;border-top:1px solid var(--di-line)}.di-section-label{margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--di-muted)}.di-attempt{margin-top:12px;padding:12px 14px;border-left:3px solid var(--di-blue);background:var(--di-paper);border-radius:0 7px 7px 0}.di-attempt-head{display:flex;justify-content:space-between;margin-bottom:7px;font-size:12px;color:var(--di-muted)}.di-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.di-state,.di-empty{padding:28px;text-align:center;color:var(--di-muted)}.di-empty{display:grid;gap:6px}.di-spinner{display:inline-block;width:14px;height:14px;margin-right:8px;border:2px solid var(--di-line);border-top-color:var(--di-blue);border-radius:50%;animation:di-spin .8s linear infinite}.di-notice{margin:12px 18px;padding:10px 12px;border-radius:7px;background:var(--di-blue-soft);font-size:13px}.di-notice.is-error{background:#fff1f2;color:var(--di-red)}.di-link{color:var(--di-blue);text-decoration:none}
.di-tool-error{display:flex;align-items:baseline;gap:8px;width:min(1080px,100%);padding:10px 13px;border-left:3px solid var(--di-red);border-radius:0 7px 7px 0;background:#fff1f2;color:var(--di-red);font:13px/1.5 "Segoe UI","Microsoft YaHei",sans-serif}.di-tool-error span{color:var(--di-muted)}
.di-ledger{width:min(1080px,100%);border:1px solid var(--di-line);border-radius:14px;background:var(--di-white);overflow:hidden;box-shadow:var(--di-shadow)}.di-history-head{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:20px 24px;border-bottom:1px solid var(--di-line)}.di-ledger-title{font-size:18px;font-weight:730}.di-history-legend{display:flex;gap:28px;color:var(--di-muted);font-size:13px}.di-history-legend span{display:inline-flex;align-items:center;gap:7px}.di-history-filters{display:flex;gap:8px;padding:12px 24px;border-bottom:1px solid var(--di-line);background:#fbfcfe}.di-input,.di-select{min-width:0;border:1px solid var(--di-line);border-radius:7px;padding:8px 10px;background:var(--di-white);color:var(--di-ink)}.di-input{flex:1}.di-history-scroll{overflow-x:auto}.di-history-table{width:100%;border-collapse:collapse;font-size:13px}.di-history-table th{padding:10px 24px;color:var(--di-muted);font-weight:500;text-align:left;background:#fbfcfe}.di-history-table td{padding:10px 24px;border-top:1px solid var(--di-line);white-space:nowrap}.di-history-table tr.is-selected td{background:var(--di-blue-soft)}.di-history-topic{appearance:none;border:0;padding:0;background:transparent;color:var(--di-ink);font:inherit;font-size:13px;font-weight:600;line-height:1.4;cursor:pointer;text-align:left}.di-history-topic:hover{color:var(--di-blue)}.di-history-time{color:var(--di-muted)}.di-history-score{font-size:14px}.di-history-score.is-good{color:var(--di-green)}.di-history-score.is-mid{color:#e69600}.di-history-score.is-empty{color:var(--di-muted)}.di-row-actions{display:flex;justify-content:flex-end;gap:10px}.di-icon-button{width:34px;height:32px;padding:0}.di-icon-button.is-delete{color:var(--di-red);border-color:#ffe0e2;background:#fffafa}.di-delete-confirm{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:12px 24px;padding:11px 13px;border:1px solid #ffd8dc;border-radius:8px;background:#fff8f8;font-size:13px}.di-delete-confirm .di-actions{margin:0}.di-history-detail{border-top:1px solid var(--di-line);background:#fbfcfe}.di-detail{padding:22px 24px;max-height:620px;overflow:auto}.di-detail-question{padding:15px 0;border-bottom:1px solid var(--di-line)}.di-detail-question-head{display:flex;gap:10px;align-items:flex-start}.di-detail-question-text{flex:1;line-height:1.6}.di-detail-actions{display:flex;gap:6px;margin-top:10px}.di-sequence{font-size:12px;font-weight:750;color:var(--di-blue)}.di-confirm{margin-top:10px;padding:10px;border:1px solid #ffd8dc;border-radius:7px}
.di-timeline{position:fixed;right:16px;top:112px;width:278px;max-height:calc(100vh - 150px);z-index:40;border:1px solid var(--di-line);border-radius:12px;background:var(--di-white);box-shadow:0 12px 32px rgba(23,32,51,.12);overflow:hidden}.di-timeline-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--di-line);background:#fbfcfe}.di-timeline-body{padding:8px 12px;overflow:auto;max-height:calc(100vh - 205px)}.di-time-item{position:relative;padding:10px 0 10px 25px;border-left:1px solid var(--di-line)}.di-time-item::before{content:"";position:absolute;left:-5px;top:15px;width:9px;height:9px;border-radius:50%;background:var(--di-white);border:2px solid var(--di-line)}.di-time-item.is-current::before{border-color:var(--di-blue);background:var(--di-blue)}.di-time-q{font-size:12px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.di-time-meta{display:flex;align-items:center;gap:7px;margin-top:6px;font-size:11px;color:var(--di-muted)}
@keyframes di-spin{to{transform:rotate(360deg)}}
@media(max-width:760px){.di-question-card{grid-template-columns:1fr;padding:22px}.di-answer-button{justify-self:start}.di-review-card{grid-template-columns:1fr;padding:22px}.di-review-score{display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:14px;padding:0 0 20px;border-right:0;border-bottom:1px solid var(--di-line)}.di-review-check{margin:0}.di-review-score-label{margin:0}.di-review-score-value{justify-self:end}.di-stars{grid-column:1/-1;margin-top:0}.di-review-content{padding:22px 0 0}.di-history-legend{display:none}.di-history-table th,.di-history-table td{padding-left:16px;padding-right:16px}.di-history-filters{flex-wrap:wrap}.di-input{flex-basis:100%}.di-timeline{display:none}}
@media(max-width:520px){.di-card-body{padding:18px}.di-question-text{font-size:17px}.di-review-card{padding:18px}.di-memorize-box{grid-template-columns:1fr}.di-copy-button{justify-self:start}.di-review-actions{justify-content:flex-start}.di-history-head{padding:17px 18px}.di-history-filters{padding:10px 18px}.di-select{flex:1}.di-delete-confirm{align-items:flex-start;flex-direction:column;margin:10px 18px}}
@media(prefers-reduced-motion:reduce){.di-button{transition:none}.di-spinner{animation-duration:1.5s}}
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
