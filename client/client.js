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
  name: () => name
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
function useInterviewQuery(key, loader, dependencies = []) {
  const [state, setState] = import_react.default.useState({ loading: true, data: null, error: "" });
  const load = import_react.default.useCallback((force = false) => {
    setState((current) => ({ ...current, loading: current.data === null, error: "" }));
    const request = force ? Promise.resolve().then(loader) : interviewApi.cached(key, loader);
    return request.then((data) => setState({ loading: false, data, error: "" })).catch((error) => setState((current) => ({ ...current, loading: false, error: error.message || "\u52A0\u8F7D\u5931\u8D25" })));
  }, [key, ...dependencies]);
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
function parseToolArgs(block) {
  const candidates = [block?.args, block?.arguments, block?.call?.args, block?.call?.arguments, block?.input];
  for (const value of candidates) {
    if (value && typeof value === "object") return value;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
      }
    }
  }
  return {};
}
function PhaseBadge({ phase }) {
  const labels = {
    awaiting_question: "\u51C6\u5907\u51FA\u9898",
    awaiting_answer: "\u7B49\u5F85\u56DE\u7B54",
    awaiting_evaluation: "\u6B63\u5728\u8BC4\u4EF7",
    ready_for_explanation: "\u53EF\u67E5\u770B\u8BB2\u89E3",
    generating_explanation: "\u6B63\u5728\u751F\u6210\u8BB2\u89E3",
    awaiting_next: "\u672C\u9898\u5B8C\u6210",
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
  const query = useInterviewQuery(`session:${sessionId}`, () => interviewApi.session(sessionId), [sessionId]);
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
        session.phase === "ready_for_explanation" ? h(Button, { tone: "primary", busy: command.busy === "question.request_explanation", onClick: () => run("question.request_explanation") }, "\u67E5\u770B\u8BB2\u89E3") : null,
        session.phase === "awaiting_next" || session.phase === "ready_for_explanation" ? h(Button, { tone: session.phase === "awaiting_next" ? "primary" : "quiet", busy: command.busy === "question.next", onClick: () => run("question.next") }, "\u4E0B\u4E00\u9898") : null,
        question && ["ready_for_explanation", "awaiting_next"].includes(session.phase) ? h(Button, { busy: command.busy === "question.retry", onClick: () => run("question.retry", { questionId: question.id }) }, "\u91CD\u65B0\u4F5C\u7B54") : null,
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
  const filters = { query: queryText, mode, status };
  const list = useInterviewQuery(`practices:${queryText}:${mode}:${status}`, () => interviewApi.practices(filters), [queryText, mode, status]);
  const practices = list.data?.resource?.data || [];
  import_react4.default.useEffect(() => {
    if (!selectedId && practices[0]) setSelectedId(practices[0].id);
  }, [practices.length, selectedId]);
  const detail = useInterviewQuery(`practice:${selectedId || "none"}`, () => selectedId ? interviewApi.practice(selectedId) : Promise.resolve(null), [selectedId]);
  const selected = detail.data?.resource?.data || null;
  return h(
    "section",
    { className: "di-ledger", "aria-label": "\u7EC3\u4E60\u6863\u6848" },
    h(
      "header",
      { className: "di-ledger-head" },
      h("div", null, h("div", { className: "di-eyebrow" }, "PRACTICE LEDGER"), h("div", { className: "di-ledger-title" }, "\u7EC3\u4E60\u6863\u6848"), h("div", { className: "di-subtitle" }, "\u6BCF\u4E00\u6B21\u56DE\u7B54\u90FD\u4FDD\u7559\uFF0C\u8FDB\u6B65\u6709\u8FF9\u53EF\u5FAA\u3002")),
      h("div", { className: "di-score-row" }, h("span", { className: "di-score-number" }, practices.length), h("span", { className: "di-subtitle" }, "\u6761\u7EC3\u4E60"))
    ),
    h(
      "div",
      { className: "di-ledger-tools" },
      h("input", { className: "di-input", value: queryText, onChange: (event) => setQueryText(event.target.value), placeholder: "\u641C\u7D22\u7EC3\u4E60\u4E3B\u9898", "aria-label": "\u641C\u7D22\u7EC3\u4E60\u4E3B\u9898" }),
      h(
        "select",
        { className: "di-select", value: mode, onChange: (event) => setMode(event.target.value), "aria-label": "\u7B5B\u9009\u6A21\u5F0F" },
        h("option", { value: "" }, "\u5168\u90E8\u6A21\u5F0F"),
        h("option", { value: "bagu" }, "\u80CC\u516B\u80A1"),
        h("option", { value: "mock" }, "\u6A21\u62DF\u9762\u8BD5"),
        h("option", { value: "scenario" }, "\u573A\u666F\u9898"),
        h("option", { value: "resume" }, "\u7B80\u5386\u51FA\u9898")
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
    h(
      "div",
      { className: "di-ledger-grid" },
      h(
        "div",
        { className: "di-practice-list" },
        list.loading && !list.data ? h(Loading) : practices.length ? practices.map((practice, index) => h(
          "button",
          { className: `di-practice-row${selectedId === practice.id ? " is-selected" : ""}`, key: practice.id, onClick: () => setSelectedId(practice.id) },
          h("span", { className: "di-sequence" }, String(index + 1).padStart(2, "0")),
          h("span", null, h("span", { className: "di-row-title" }, practice.topic), h("span", { className: "di-row-meta", style: { display: "block" } }, `${practice.modeLabel} \xB7 ${practice.status === "completed" ? "\u5DF2\u7ED3\u675F" : "\u8FDB\u884C\u4E2D"} \xB7 ${practice.questionCount} \u9898`)),
          h("span", null, h("strong", null, practice.averageScore ?? "\u2014"), h(ScoreRail, { score: practice.averageScore, compact: true }))
        )) : h(Empty, { title: "\u8FD8\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u7EC3\u4E60", detail: "\u5F00\u59CB\u4E00\u6B21\u9762\u8BD5\u540E\uFF0C\u6863\u6848\u4F1A\u81EA\u52A8\u51FA\u73B0\u5728\u8FD9\u91CC\u3002" })
      ),
      detail.loading && selectedId ? h(Loading, { label: "\u6B63\u5728\u8BFB\u53D6\u7EC3\u4E60\u8BE6\u60C5\u2026" }) : h(PracticeDetail, { practice: selected, sessionId, onDeleted: () => {
        setSelectedId(null);
        interviewApi.invalidate();
      } })
    )
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
  const sessionQuery = useInterviewQuery(`timeline-session:${sessionId}:${revisionSignal}`, () => interviewApi.session(sessionId), [sessionId, revisionSignal]);
  const session = sessionQuery.data?.resource?.data;
  const practiceId = session?.practice?.id || null;
  const detailQuery = useInterviewQuery(`timeline-practice:${practiceId || "none"}:${revisionSignal}`, () => practiceId ? interviewApi.practice(practiceId) : Promise.resolve(null), [practiceId, revisionSignal]);
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

// src/client/shared/styles.js
var STYLE_TEXT = `
:root{--di-ink:#172033;--di-muted:#667085;--di-paper:#f7f8fc;--di-line:#d9dfeb;--di-cobalt:#315be8;--di-amber:#d8932b;--di-green:#2e8b72;--di-red:#c94b56;--di-white:#fff}
.di-card,.di-ledger,.di-timeline{font-family:"Segoe UI","Microsoft YaHei",sans-serif;color:var(--color-text-primary,var(--di-ink));box-sizing:border-box}
.di-card *,.di-ledger *,.di-timeline *{box-sizing:border-box}.di-preline{white-space:pre-wrap}.di-card{width:min(680px,100%);border:1px solid var(--color-border-secondary,var(--di-line));border-radius:8px;background:var(--color-bg-primary,var(--di-white));overflow:hidden;box-shadow:0 8px 28px rgba(23,32,51,.08)}
.di-card-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px;border-bottom:1px solid var(--color-border-secondary,var(--di-line));background:var(--color-bg-secondary,var(--di-paper))}.di-eyebrow{font:600 11px/1.2 Bahnschrift,"Segoe UI",sans-serif;letter-spacing:.13em;text-transform:uppercase;color:var(--di-cobalt)}.di-title{font-size:16px;font-weight:680}.di-subtitle{margin-top:3px;font-size:12px;color:var(--color-text-secondary,var(--di-muted))}.di-card-body{padding:18px}.di-question-text{font-size:16px;line-height:1.75}.di-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.di-button{appearance:none;border:1px solid var(--color-border-secondary,var(--di-line));border-radius:6px;padding:8px 12px;background:var(--color-bg-primary,var(--di-white));color:inherit;font:600 13px/1 "Segoe UI","Microsoft YaHei",sans-serif;cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease}.di-button:hover:not(:disabled){transform:translateY(-1px);border-color:var(--di-cobalt)}.di-button:focus-visible{outline:3px solid rgba(49,91,232,.25);outline-offset:2px}.di-button:disabled{opacity:.55;cursor:not-allowed}.di-button.is-primary{background:var(--di-cobalt);border-color:var(--di-cobalt);color:#fff}.di-button.is-danger{color:var(--di-red);border-color:rgba(201,75,86,.4)}
.di-phase{display:inline-flex;border:1px solid var(--color-border-secondary,var(--di-line));border-radius:999px;padding:4px 8px;font:600 11px/1 Bahnschrift,"Segoe UI",sans-serif;color:var(--color-text-secondary,var(--di-muted));white-space:nowrap}.di-phase-awaiting_answer{border-color:rgba(49,91,232,.45);color:var(--di-cobalt)}.di-phase-ready_for_explanation,.di-phase-generating_explanation{border-color:rgba(216,147,43,.5);color:var(--di-amber)}.di-phase-awaiting_next{border-color:rgba(46,139,114,.45);color:var(--di-green)}.di-phase-completed{border-color:rgba(102,112,133,.35)}
.di-score-row{display:flex;align-items:center;gap:12px}.di-score-number{font:700 26px/1 Bahnschrift,"Segoe UI",sans-serif}.di-score-rail{display:inline-grid;grid-template-columns:repeat(10,9px);gap:3px}.di-score-rail i{display:block;height:16px;border-radius:2px;background:var(--color-bg-tertiary,#e8ebf2)}.di-score-rail.is-compact{grid-template-columns:repeat(10,5px);gap:2px}.di-score-rail.is-compact i{height:10px}.di-score-rail i.is-good{background:var(--di-green)}.di-score-rail i.is-mid{background:var(--di-amber)}.di-score-rail i.is-low{background:var(--di-red)}
.di-section{margin-top:16px;padding-top:14px;border-top:1px solid var(--color-border-secondary,var(--di-line))}.di-section-label{margin-bottom:8px;font:600 11px/1 Bahnschrift,"Segoe UI",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--color-text-secondary,var(--di-muted))}.di-attempt{margin-top:12px;padding:12px;border-left:3px solid var(--di-cobalt);background:var(--color-bg-secondary,var(--di-paper));border-radius:0 6px 6px 0}.di-attempt-head{display:flex;justify-content:space-between;margin-bottom:7px;font-size:12px;color:var(--color-text-secondary,var(--di-muted))}
.di-state,.di-empty{padding:28px;text-align:center;color:var(--color-text-secondary,var(--di-muted))}.di-empty{display:grid;gap:6px}.di-spinner{display:inline-block;width:14px;height:14px;margin-right:8px;border:2px solid var(--di-line);border-top-color:var(--di-cobalt);border-radius:50%;animation:di-spin .8s linear infinite}.di-notice{margin:12px 0;padding:10px 12px;border-radius:6px;background:rgba(49,91,232,.08);font-size:13px}.di-notice.is-error{background:rgba(201,75,86,.1);color:var(--di-red)}
.di-ledger{width:min(980px,100%);border:1px solid var(--color-border-secondary,var(--di-line));border-radius:8px;background:var(--color-bg-primary,var(--di-white));overflow:hidden}.di-ledger-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding:18px;border-bottom:1px solid var(--color-border-secondary,var(--di-line))}.di-ledger-title{font-size:21px;font-weight:720}.di-ledger-tools{display:flex;gap:8px;padding:12px 18px;border-bottom:1px solid var(--color-border-secondary,var(--di-line));background:var(--color-bg-secondary,var(--di-paper))}.di-input,.di-select{min-width:0;border:1px solid var(--color-border-secondary,var(--di-line));border-radius:6px;padding:8px 10px;background:var(--color-bg-primary,var(--di-white));color:inherit}.di-input{flex:1}.di-ledger-grid{display:grid;grid-template-columns:minmax(320px,1fr) minmax(330px,.95fr);min-height:360px}.di-practice-list{border-right:1px solid var(--color-border-secondary,var(--di-line));padding:8px}.di-practice-row{display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;width:100%;padding:12px;border:0;border-bottom:1px solid var(--color-border-secondary,var(--di-line));background:transparent;color:inherit;text-align:left;cursor:pointer}.di-practice-row:hover,.di-practice-row.is-selected{background:rgba(49,91,232,.06)}.di-sequence{font:700 13px/1 Bahnschrift,"Segoe UI",sans-serif;color:var(--di-cobalt)}.di-row-title{font-weight:650}.di-row-meta{margin-top:4px;font-size:12px;color:var(--color-text-secondary,var(--di-muted))}.di-detail{padding:18px;max-height:620px;overflow:auto}.di-detail-question{padding:14px 0;border-bottom:1px solid var(--color-border-secondary,var(--di-line))}.di-detail-question-head{display:flex;gap:10px;align-items:flex-start}.di-detail-question-text{flex:1;line-height:1.55}.di-detail-actions{display:flex;gap:6px;margin-top:10px}.di-link{color:var(--di-cobalt);text-decoration:none}.di-confirm{margin-top:10px;padding:10px;border:1px solid rgba(201,75,86,.35);border-radius:6px}
.di-timeline{position:fixed;right:16px;top:112px;width:278px;max-height:calc(100vh - 150px);z-index:40;border:1px solid var(--color-border-secondary,var(--di-line));border-radius:8px;background:var(--color-bg-primary,var(--di-white));box-shadow:0 12px 32px rgba(23,32,51,.12);overflow:hidden}.di-timeline-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--color-border-secondary,var(--di-line));background:var(--color-bg-secondary,var(--di-paper))}.di-timeline-body{padding:8px 12px;overflow:auto;max-height:calc(100vh - 205px)}.di-time-item{position:relative;padding:10px 0 10px 25px;border-left:1px solid var(--color-border-secondary,var(--di-line))}.di-time-item::before{content:"";position:absolute;left:-5px;top:15px;width:9px;height:9px;border-radius:50%;background:var(--color-bg-primary,var(--di-white));border:2px solid var(--di-line)}.di-time-item.is-current::before{border-color:var(--di-cobalt);background:var(--di-cobalt)}.di-time-q{font-size:12px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.di-time-meta{display:flex;align-items:center;gap:7px;margin-top:6px;font-size:11px;color:var(--color-text-secondary,var(--di-muted))}
@keyframes di-spin{to{transform:rotate(360deg)}}
@media(max-width:900px){.di-timeline{display:none}.di-ledger-grid{grid-template-columns:1fr}.di-practice-list{border-right:0;border-bottom:1px solid var(--color-border-secondary,var(--di-line))}}
@media(max-width:560px){.di-ledger-head{align-items:flex-start;flex-direction:column}.di-ledger-tools{flex-wrap:wrap}.di-select{flex:1}.di-card-body{padding:15px}.di-score-rail{grid-template-columns:repeat(10,7px)}}
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
function ToolResourceView({ toolName, sessionId, block }) {
  const args = parseToolArgs(block);
  if (toolName === "interview_library") {
    if (args.command === "list") return h(PracticeLibrary, { sessionId });
    if (args.command === "get") return h(PracticeLibrary, { sessionId, initialPracticeId: args.practice_id });
    if (args.command === "insights") return h(InsightsCard);
    if (args.command === "delete") return h(CompactResultCard, { title: "\u7EC3\u4E60\u5DF2\u5220\u9664", detail: "\u6863\u6848\u548C\u5BF9\u5E94\u4F1A\u8BDD\u6E38\u6807\u5DF2\u7ECF\u6E05\u7406\u3002", tone: "completed" });
    if (args.command === "export") return h(CompactResultCard, { title: "Markdown \u5DF2\u751F\u6210", detail: "\u6253\u5F00\u7EC3\u4E60\u6863\u6848\u53EF\u4EE5\u4E0B\u8F7D\u672C\u6B21\u5BFC\u51FA\u3002" });
  }
  return h(LiveInterviewCard, { sessionId });
}
function apply(ctx) {
  installStyles();
  const slots = ctx.get("slots");
  if (!slots) return;
  for (const toolName of ["interview_session", "interview_question", "interview_answer", "interview_library"]) {
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
