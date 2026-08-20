// dsh-interview client：题目卡片、评价卡片、讲解卡片和练习面板。
// interview 工具调用（question.open 动作）位置渲染为题目卡片：
// 问题文本 + 「看答案」按钮；作答走正常输入框。无 emoji，样式用应用主题 token。
window.__ModuleLoader__.load({ id: "dsh-interview", factory: (require) => {
  var module = { exports: {} };
  var exports = module.exports;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  var react = require("react");
  var primitives = require("@deepseek-ai/dsh-client-ui-primitives");

  const name = "dsh-interview";
  const inject = ["slots"];
  // MarkdownText 渲染 markdown（聊天消息同款）；若组件不可用则降级为纯文本
  const MarkdownText = primitives && primitives.MarkdownText ? primitives.MarkdownText : null;
  const ACTION_PRESENTATION = {
    "practice.create": { kind: "status", label: "练习已创建" },
    "practice.list": { kind: "dashboard" },
    "practice.get": { kind: "practice-detail" },
    "practice.update": { kind: "status", label: "练习设置已更新" },
    "practice.delete": { kind: "status", label: "练习已删除", danger: true },
    "practice.finish": { kind: "summary" },
    "practice.reopen": { kind: "status", label: "练习已重新打开" },
    "practice.dashboard": { kind: "dashboard" },
    "practice.timeline": { kind: "practice-detail" },
    "practice.summary": { kind: "summary" },
    "question.open": { kind: "question" },
    "question.list": { kind: "practice-detail" },
    "question.get": { kind: "question-detail" },
    "question.update": { kind: "status", label: "题目已更新" },
    "question.delete": { kind: "status", label: "题目已删除", danger: true },
    "attempt.create": { kind: "silent" },
    "attempt.list": { kind: "attempts" },
    "attempt.get": { kind: "attempts" },
    "attempt.update": { kind: "status", label: "作答已更新" },
    "attempt.delete": { kind: "status", label: "作答已删除", danger: true },
    "evaluation.create": { kind: "evaluation" },
    "evaluation.get": { kind: "attempts" },
    "evaluation.update": { kind: "evaluation" },
    "evaluation.list": { kind: "attempts" },
    "explanation.create": { kind: "explanation" },
    "explanation.get": { kind: "question-detail" },
    "explanation.update": { kind: "explanation" },
    "explanation.delete": { kind: "status", label: "讲解已删除", danger: true },
    "session.get": { kind: "silent" },
    "session.select_practice": { kind: "status", label: "已切换练习" },
    "session.focus_question": { kind: "silent" },
    "session.clear_focus": { kind: "silent" },
    "export.create": { kind: "export" },
  };

  // markdown 渲染（可用时）或纯文本（降级）
  function renderMd(text) {
    if (MarkdownText) return react.createElement(MarkdownText, { text: text });
    return text;
  }

  const CSS = `
.ivq-card{display:flex;flex-direction:column;gap:10px;padding:14px 16px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-size:13px;color:var(--dsw-alias-label-primary);margin:4px 0;max-width:520px;}
.ivq-text{font-size:13px;line-height:1.8;font-weight:600;}
.ivq-text p{margin:0;}
.ivq-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ivq-btn{padding:5px 14px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;line-height:22px;}
.ivq-btn:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);}
.ivq-btn-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff;font-weight:600;}
.ivq-btn-primary:hover{color:#fff;}
.ivq-btn:disabled{opacity:.65;cursor:default;}
.ivq-wait{font-size:12px;color:var(--dsw-alias-label-secondary);}
.ivq-ans{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.7;border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px;}
.ivq-ans b{color:var(--dsw-alias-label-primary);}
.ivq-atitle{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);}
.ivq-sec{display:flex;flex-direction:column;gap:4px;}
.ivq-sec-label{display:inline-block;font-size:11px;font-weight:700;color:var(--dsw-alias-label-primary);padding:2px 8px;border-radius:4px;background-image:linear-gradient(104deg,color-mix(in srgb,var(--dsw-alias-state-warn-primary) 45%,transparent) 0%,color-mix(in srgb,var(--dsw-alias-state-warn-primary) 30%,transparent) 55%,color-mix(in srgb,var(--dsw-alias-state-warn-primary) 42%,transparent) 100%);width:fit-content;}
.ivq-sec-body{font-size:12px;line-height:1.7;color:var(--dsw-alias-label-primary);}
.ivq-sec-body p{margin:0;}
.ivq-jrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ivq-score{display:inline-block;padding:2px 12px;border-radius:999px;font-weight:700;font-size:13px;}
.ivq-score-ok{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 18%,transparent);}
.ivq-score-mid{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 18%,transparent);}
.ivq-score-bad{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,transparent);}
.ivq-score-none{color:var(--dsw-alias-label-secondary);background:color-mix(in srgb,var(--dsw-alias-label-secondary) 12%,transparent);}
.ivq-jverdict{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);}
.ivq-mini{font-size:12px;color:var(--dsw-alias-label-secondary);padding:2px 0;}
.iv-report{box-sizing:border-box;width:min(640px,100%);max-width:640px;gap:0;padding:0;overflow:hidden;}
.iv-report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:15px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);}
.iv-report-title{font-size:14px;font-weight:720;line-height:1.4;}.iv-report-sub{margin-top:3px;font-size:10px;color:var(--dsw-alias-label-secondary);}
.iv-report-body{padding:14px 16px;}.iv-report-actions{display:flex;align-items:center;gap:8px;padding:11px 16px;border-top:1px solid var(--dsw-alias-border-l1);}
.iv-metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid var(--dsw-alias-border-l1);}
.iv-metric{padding:11px 14px;border-right:1px solid var(--dsw-alias-border-l1);}.iv-metric:last-child{border-right:0;}
.iv-metric strong{display:block;font:700 18px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;}.iv-metric span{display:block;margin-top:3px;font-size:10px;color:var(--dsw-alias-label-secondary);}
.iv-rail{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;width:100%;max-width:150px;margin-top:7px;}.iv-rail span{height:5px;background:var(--dsw-alias-border-l1);}.iv-rail .is-on.is-good{background:#2f7d67}.iv-rail .is-on.is-mid{background:#c98724}.iv-rail .is-on.is-low{background:#c95c54}
.iv-section-title{margin:0 0 8px;font-size:10px;font-weight:700;color:var(--dsw-alias-label-secondary);text-transform:uppercase;}
.iv-review-list{display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l1);}.iv-review-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:9px;padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l1);align-items:start;}.iv-review-row:last-child{border-bottom:0}.iv-review-q{font-size:11px;line-height:1.55;}.iv-review-score{font:700 11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;}
.iv-attempt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));}.iv-attempt{min-width:0;padding:13px 16px;border-right:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);}.iv-attempt:nth-child(2n){border-right:0}.iv-attempt-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px;}.iv-attempt-label{font:700 10px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;color:#2f7d67}.iv-attempt-score{font:700 13px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;}.iv-attempt-answer{font-size:11px;line-height:1.65;word-break:break-word;}.iv-attempt-comment{margin-top:9px;padding-top:9px;border-top:1px solid var(--dsw-alias-border-l1);font-size:10px;line-height:1.6;color:var(--dsw-alias-label-secondary);}.iv-delta{font:700 11px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;color:#2f7d67;}
.iv-export-list{display:flex;flex-direction:column;}.iv-export-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);}.iv-export-row:last-child{border-bottom:0}.iv-export-title{font-size:11px;font-weight:650;line-height:1.5;}.iv-export-path{margin-top:3px;font:10px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--dsw-alias-label-secondary);word-break:break-all;}.iv-export-actions{display:flex;gap:4px;}
.iv-detail-table{display:flex;flex-direction:column;}.iv-detail-columns,.iv-detail-row{display:grid;grid-template-columns:38px minmax(0,1fr) 58px 54px;gap:10px;align-items:center;}.iv-detail-columns{padding:8px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:9px;color:var(--dsw-alias-label-secondary);text-transform:uppercase;}.iv-detail-row{padding:10px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);cursor:pointer;min-height:42px;}.iv-detail-row:hover,.iv-detail-row.is-open{background:color-mix(in srgb,#2f7d67 6%,transparent);}.iv-detail-num{font:700 10px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;color:#2f7d67;}.iv-detail-question{font-size:11px;line-height:1.5;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.iv-detail-score{font:700 11px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;text-align:right;}.iv-detail-attempts{font-size:10px;color:var(--dsw-alias-label-secondary);text-align:right;}.iv-detail-expanded{grid-column:1/-1;padding:4px 0 2px 48px;cursor:default;}.iv-detail-attempt{padding:9px 0;border-top:1px solid var(--dsw-alias-border-l1);}.iv-detail-attempt-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;}.iv-detail-attempt-body{margin-top:5px;font-size:11px;line-height:1.65;word-break:break-word;}.iv-detail-attempt-comment{margin-top:5px;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1.6;}
.iv-status{display:flex;align-items:center;gap:8px;width:fit-content;max-width:520px;padding:7px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:11px;}.iv-status-icon{display:flex;color:#2f7d67}.iv-status.is-danger .iv-status-icon{color:#c95c54}.iv-question-meta{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:10px}.iv-question-detail-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.iv-explanation-empty{padding:12px 0;color:var(--dsw-alias-label-secondary);font-size:11px;}
.iv-inline-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:30px;padding:4px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:11px;cursor:pointer;}.iv-inline-btn:hover,.iv-inline-btn:focus-visible{border-color:#2f7d67;color:#2f7d67;outline:none}.iv-inline-btn.is-primary{border-color:#2f7d67;background:#2f7d67;color:#fff}.iv-inline-btn:disabled{opacity:.55;cursor:default}
.iva-retry-row{display:flex;justify-content:flex-end;margin-top:10px;}
.ivt-toggle{position:fixed;right:12px;top:64px;z-index:50;display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.12);}
.ivt-toggle:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);}
.ivt-panel{position:fixed;right:12px;top:60px;bottom:84px;width:240px;z-index:50;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 4px 20px rgba(0,0,0,.14);font-size:12px;color:var(--dsw-alias-label-primary);overflow:hidden;}
.ivt-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);font-weight:600;font-size:12px;flex:none;}
.ivt-btn{padding:2px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;cursor:pointer;}
.ivt-btn:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);}
.ivt-body{flex:1;overflow-y:auto;padding:12px;}
.ivt-list{position:relative;display:flex;flex-direction:column;gap:12px;margin:0;padding:0;list-style:none;}
.ivt-list:before{content:"";position:absolute;left:5px;top:5px;bottom:5px;width:2px;background:var(--dsw-alias-border-l2);}
.ivt-item{position:relative;padding-left:20px;}
.ivt-item:before{content:"";position:absolute;left:0;top:3px;width:12px;height:12px;border-radius:50%;background:var(--dsw-alias-bg-layer-1);border:2px solid var(--dsw-alias-border-l2);box-sizing:border-box;}
.ivt-item:hover .ivt-q{color:var(--dsw-alias-brand-primary);}
.ivt-item-current:before{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);}
.ivt-num{font-size:10px;color:var(--dsw-alias-label-secondary);margin-bottom:2px;}
.ivt-q{line-height:1.5;word-break:break-word;color:var(--dsw-alias-label-primary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.ivt-actions{display:none;gap:4px;margin-top:4px;flex-wrap:wrap;}
.ivt-item:hover .ivt-actions{display:flex;}
.ivt-act{padding:1px 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font-size:10px;cursor:pointer;line-height:16px;}
.ivt-act:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);}
.ivt-drawer{position:fixed;right:262px;top:60px;bottom:84px;width:300px;z-index:50;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 4px 20px rgba(0,0,0,.14);font-size:12px;color:var(--dsw-alias-label-primary);overflow:hidden;}
.ivt-dhead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);font-weight:600;font-size:12px;flex:none;}
.ivt-dbody{flex:1;overflow-y:auto;padding:12px;font-size:12px;line-height:1.7;color:var(--dsw-alias-label-primary);word-break:break-word;}
.ivt-dbody p{margin:0;}
.ivt-empty{color:var(--dsw-alias-label-secondary);padding:6px 2px;line-height:1.6;}
.iva-ledger{width:min(860px,calc(100vw - 32px));margin:6px 0;border:1px solid var(--dsw-alias-border-l1,#e3e5e8);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fcfcfd);color:var(--dsw-alias-label-primary,#202124);overflow:hidden;box-shadow:0 10px 30px rgba(25,28,33,.08);font-size:13px;}
.iva-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:18px 20px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#e3e5e8);}
.iva-title{margin:0;font-size:17px;line-height:1.35;font-weight:720;letter-spacing:0;}
.iva-kicker{margin-top:3px;color:var(--dsw-alias-label-secondary,#6d7178);font-size:11px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;}
.iva-stats{display:grid;grid-template-columns:repeat(4,minmax(58px,1fr));min-width:330px;border-left:1px solid var(--dsw-alias-border-l1,#e3e5e8);}
.iva-stat{padding:1px 14px;border-right:1px solid var(--dsw-alias-border-l1,#e3e5e8);}
.iva-stat:last-child{border-right:0;}
.iva-stat-value{display:block;font-size:16px;line-height:1.25;font-weight:720;font-variant-numeric:tabular-nums;}
.iva-stat-label{display:block;margin-top:2px;color:var(--dsw-alias-label-secondary,#6d7178);font-size:10px;}
.iva-tools{display:flex;align-items:center;gap:10px;padding:11px 20px;border-bottom:1px solid var(--dsw-alias-border-l1,#e3e5e8);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fcfcfd) 92%,#2f7d67 8%);}
.iva-search{position:relative;flex:1;min-width:160px;}
.iva-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);display:flex;color:var(--dsw-alias-label-secondary,#6d7178);pointer-events:none;}
.iva-search input{width:100%;height:32px;box-sizing:border-box;padding:0 10px 0 32px;border:1px solid var(--dsw-alias-border-l2,#d5d8dc);border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fcfcfd);color:var(--dsw-alias-label-primary,#202124);font:inherit;outline:none;}
.iva-search input:focus{border-color:#2f7d67;box-shadow:0 0 0 2px color-mix(in srgb,#2f7d67 18%,transparent);}
.iva-mode{height:32px;padding:0 28px 0 10px;border:1px solid var(--dsw-alias-border-l2,#d5d8dc);border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fcfcfd);color:var(--dsw-alias-label-primary,#202124);font-size:11px;outline:none;}
.iva-main{display:grid;grid-template-columns:minmax(0,1fr);min-height:250px;max-height:560px;}
.iva-main.iva-has-detail{grid-template-columns:minmax(330px,1.05fr) minmax(300px,.95fr);}
.iva-list{overflow:auto;min-width:0;}
.iva-columns{display:grid;grid-template-columns:58px minmax(150px,1fr) 70px 130px 112px;align-items:center;gap:12px;padding:8px 16px;color:var(--dsw-alias-label-secondary,#6d7178);font-size:10px;border-bottom:1px solid var(--dsw-alias-border-l1,#e3e5e8);text-transform:uppercase;}
.iva-row{display:grid;grid-template-columns:58px minmax(150px,1fr) 70px 130px 112px;align-items:center;gap:12px;min-height:68px;padding:9px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#e3e5e8);cursor:pointer;outline:none;transition:background-color .16s ease,box-shadow .16s ease;}
.iva-row:hover,.iva-row:focus-visible{background:color-mix(in srgb,#2f7d67 6%,transparent);}
.iva-row.iva-selected{background:color-mix(in srgb,#2f7d67 9%,transparent);box-shadow:inset 3px 0 #2f7d67;}
.iva-date{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--dsw-alias-label-secondary,#6d7178);font-variant-numeric:tabular-nums;}
.iva-date-day{display:block;font-size:14px;font-weight:700;color:var(--dsw-alias-label-primary,#202124);}
.iva-date-year{display:block;margin-top:2px;font-size:9px;}
.iva-topic{min-width:0;}
.iva-topic-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:680;}
.iva-topic-meta{display:flex;align-items:center;gap:6px;margin-top:5px;color:var(--dsw-alias-label-secondary,#6d7178);font-size:10px;}
.iva-mode-tag{padding:1px 6px;border-radius:3px;background:color-mix(in srgb,#2f7d67 11%,transparent);color:#2f7d67;font-weight:650;}
.iva-current{color:#2f7d67;font-weight:650;}
.iva-count{font-variant-numeric:tabular-nums;}
.iva-count strong{display:block;font-size:13px;color:var(--dsw-alias-label-primary,#202124);}
.iva-count span{font-size:9px;color:var(--dsw-alias-label-secondary,#6d7178);}
.iva-scoreline{display:flex;align-items:center;gap:8px;}
.iva-score-value{width:25px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;}
.iva-rail{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;width:86px;}
.iva-tick{height:14px;background:var(--dsw-alias-border-l1,#e3e5e8);}
.iva-tick-on.iva-good{background:#2f7d67;}.iva-tick-on.iva-mid{background:#c98724;}.iva-tick-on.iva-low{background:#c95c54;}
.iva-actions{display:flex;align-items:center;justify-content:flex-end;gap:3px;}
.iva-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:1px solid transparent;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary,#6d7178);cursor:pointer;}
.iva-icon-btn:hover,.iva-icon-btn:focus-visible{border-color:var(--dsw-alias-border-l2,#d5d8dc);background:var(--dsw-alias-bg-layer-1,#fcfcfd);color:#2f7d67;outline:none;}
.iva-icon-btn:disabled{opacity:.4;cursor:default;}
.iva-delete{color:#c95c54;}
.iva-confirm{grid-column:1/-1;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding-top:8px;color:#c95c54;font-size:11px;}
.iva-confirm button{height:26px;padding:0 9px;border:1px solid var(--dsw-alias-border-l2,#d5d8dc);border-radius:5px;background:transparent;color:inherit;font-size:11px;cursor:pointer;}
.iva-confirm .iva-danger{border-color:#c95c54;background:#c95c54;color:#fff;}
.iva-detail{min-width:0;overflow:auto;border-left:1px solid var(--dsw-alias-border-l1,#e3e5e8);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fcfcfd) 96%,#2f7d67 4%);animation:iva-enter .18s ease-out;}
.iva-detail-head{position:sticky;top:0;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:15px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#e3e5e8);background:var(--dsw-alias-bg-layer-1,#fcfcfd);}
.iva-detail-title{font-size:14px;font-weight:700;}.iva-detail-sub{margin-top:3px;color:var(--dsw-alias-label-secondary,#6d7178);font-size:10px;}
.iva-question{border-bottom:1px solid var(--dsw-alias-border-l1,#e3e5e8);}
.iva-question-toggle{display:grid;grid-template-columns:26px minmax(0,1fr) auto;align-items:start;gap:8px;width:100%;padding:12px 16px;border:0;background:transparent;color:var(--dsw-alias-label-primary,#202124);text-align:left;cursor:pointer;}
.iva-question-toggle:hover{background:color-mix(in srgb,#2f7d67 5%,transparent);}
.iva-qnum{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#2f7d67;font-size:10px;font-weight:700;}
.iva-qtext{font-size:12px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.iva-qscore{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px;font-weight:700;color:var(--dsw-alias-label-secondary,#6d7178);}
.iva-question-body{padding:0 16px 14px 50px;font-size:11px;line-height:1.7;}
.iva-block{margin-top:10px;}.iva-block:first-child{margin-top:0;}.iva-block-label{margin-bottom:3px;color:var(--dsw-alias-label-secondary,#6d7178);font-size:9px;font-weight:700;}.iva-block-body{word-break:break-word;}.iva-block-body p{margin:0;}
.iva-empty{display:flex;align-items:center;justify-content:center;min-height:210px;padding:28px;color:var(--dsw-alias-label-secondary,#6d7178);text-align:center;line-height:1.7;}
.iva-notice{padding:9px 20px;border-top:1px solid var(--dsw-alias-border-l1,#e3e5e8);background:color-mix(in srgb,#2f7d67 8%,transparent);color:#2f7d67;font-size:10px;white-space:pre-wrap;word-break:break-all;}
.iva-error{color:#c95c54;background:color-mix(in srgb,#c95c54 8%,transparent);}
@keyframes iva-enter{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
@media(max-width:760px){.iva-ledger{width:calc(100vw - 20px)}.iva-head{display:block;padding:15px}.iva-stats{margin-top:14px;min-width:0;border:1px solid var(--dsw-alias-border-l1,#e3e5e8)}.iva-stat{padding:7px 9px}.iva-tools{align-items:stretch;flex-wrap:wrap;padding:10px 15px}.iva-search{flex-basis:100%}.iva-mode{flex:1}.iva-columns{display:none}.iva-main.iva-has-detail{grid-template-columns:1fr}.iva-main.iva-has-detail .iva-list{display:none}.iva-row{grid-template-columns:48px minmax(120px,1fr) 88px;gap:10px;padding:10px 14px}.iva-count{display:none}.iva-scoreline{justify-self:end}.iva-actions{grid-column:2/-1;justify-content:flex-start;margin-top:-4px}.iva-detail{border-left:0}.iva-confirm{grid-column:1/-1}.iva-detail-head{padding:13px 14px}.iva-question-toggle{padding:12px 14px}.iva-question-body{padding:0 14px 14px 48px}.iv-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.iv-metric:nth-child(2){border-right:0}.iv-metric:nth-child(-n+2){border-bottom:1px solid var(--dsw-alias-border-l1)}.iv-attempt-grid{grid-template-columns:1fr}.iv-attempt{border-right:0}.iv-export-row{grid-template-columns:1fr}.iv-export-actions{justify-content:flex-start}.iv-detail-columns{display:none}.iv-detail-row{grid-template-columns:30px minmax(0,1fr) 48px 45px;gap:7px;padding:10px 12px}.iv-detail-expanded{padding-left:37px}}
@media(prefers-reduced-motion:reduce){.iva-row,.iva-detail{transition:none;animation:none}}
`;

  function installCss() {
    if (typeof document === "undefined") return;
    const key = 'style[data-plugin-css="dsh-interview"]';
    if (document.querySelector(key)) return;
    const tag = document.createElement("style");
    tag.setAttribute("data-plugin-css", "dsh-interview");
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }

  function apply(ctx) {
    installCss();

    function control(sessionId, payload) {
      return fetch("/interview/control", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.assign({ session: sessionId }, payload)),
      })
        .then((r) => r.json())
        .then((value) => {
          if (value && !value.error && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("dsh-interview-state-change", { detail: { sessionId } }));
          return value;
        })
        .catch(() => null);
    }

    function parseArgs(block) {
      const raw = block && block.call ? block.call.argsRaw : block ? block.argsRaw : "";
      try {
        const parsed = JSON.parse(raw || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    }

    function icon(name, size) {
      const Icon = primitives && primitives[name];
      return Icon ? react.createElement(Icon, { size: size || 14 }) : null;
    }

    function ledgerDate(value) {
      const date = new Date(Number(value));
      if (!Number.isFinite(date.getTime())) return { day: "--", year: "----" };
      return {
        day: String(date.getMonth() + 1).padStart(2, "0") + "/" + String(date.getDate()).padStart(2, "0"),
        year: String(date.getFullYear()),
      };
    }

    function ScoreRail(props) {
      const hasScore = props.score !== null && props.score !== undefined && props.score !== "";
      const score = hasScore ? Number(props.score) : NaN;
      const filled = Number.isFinite(score) ? Math.max(0, Math.min(10, Math.round(score))) : 0;
      const tone = !Number.isFinite(score) ? "" : score >= 8 ? "is-good" : score >= 6 ? "is-mid" : "is-low";
      return react.createElement("span", { className: "iv-rail", "aria-label": Number.isFinite(score) ? "得分 " + String(score) + " 分" : "未评分" },
        Array.from({ length: 10 }, (_, index) => react.createElement("span", { key: index, className: index < filled ? "is-on " + tone : "" })));
    }

    function findQuestion(practice, args) {
      if (!practice || !Array.isArray(practice.questions)) return null;
      if (typeof args.question_id === "string" && args.question_id) return practice.questions.find((item) => item.id === args.question_id) || null;
      const index = Number(args.question_index);
      if (Number.isInteger(index) && index >= 1) return practice.questions[index - 1] || null;
      if (typeof args.attempt_id === "string" && args.attempt_id) return practice.questions.find((item) => Array.isArray(item.attempts) && item.attempts.some((attempt) => attempt.id === args.attempt_id)) || null;
      return null;
    }

    function findAttempt(question, args) {
      if (!question || !Array.isArray(question.attempts)) return null;
      if (typeof args.attempt_id === "string" && args.attempt_id) return question.attempts.find((item) => item.id === args.attempt_id) || null;
      const index = Number(args.attempt_index);
      return Number.isInteger(index) && index >= 1 ? question.attempts[index - 1] || null : null;
    }

    function usePracticeData(sessionId, args) {
      const dataPair = react.useState(null);
      const data = dataPair[0];
      const setData = dataPair[1];
      const loadingPair = react.useState(true);
      const loading = loadingPair[0];
      const setLoading = loadingPair[1];
      const errorPair = react.useState("");
      const error = errorPair[0];
      const setError = errorPair[1];
      const sessionPair = react.useState(null);
      const session = sessionPair[0];
      const setSession = sessionPair[1];
      const practiceId = typeof args.practice_id === "string" ? args.practice_id : "";
      const practiceIndex = Number(args.index);
      const reload = () => {
        setLoading(true);
        return fetch("/interview/state?session=" + encodeURIComponent(sessionId)).then((response) => {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        }).then((state) => {
          setSession(state);
          if (practiceId) return practiceId;
          if (Number.isInteger(practiceIndex) && practiceIndex >= 1) {
            const match = Array.isArray(state.practices) ? state.practices.find((item) => item.index === practiceIndex) : null;
            return match ? match.id : "";
          }
          return state.practiceId || "";
        }).then((id) => {
          if (!id) throw new Error("practice not selected");
          return fetch("/interview/practice?practice_id=" + encodeURIComponent(id));
        }).then((response) => {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        }).then((value) => { setData(value); setError(""); return value; })
          .catch(() => { setData(null); setError("练习数据加载失败。"); return null; })
          .finally(() => setLoading(false));
      };
      react.useEffect(() => { reload(); }, [sessionId, practiceId, practiceIndex]);
      return { data, loading, error, reload, setData, session };
    }

    function AttemptComparisonView(props) {
      const args = parseArgs(props.block);
      const action = typeof args.action === "string" ? args.action : "attempt.list";
      const resource = usePracticeData(props.sessionId || "global", args);
      const retryPair = react.useState(false);
      const retrying = retryPair[0];
      const setRetrying = retryPair[1];
      if (resource.loading) return react.createElement("div", { className: "ivq-card iv-report" }, react.createElement("div", { className: "iv-report-body ivq-wait" }, "正在整理作答记录…"));
      if (resource.error || !resource.data) return react.createElement("div", { className: "ivq-card iv-report" }, react.createElement("div", { className: "iv-report-body ivq-wait" }, resource.error || "找不到练习。"));
      const question = findQuestion(resource.data, args) || (resource.session && resource.session.questionId ? resource.data.questions.find((item) => item.id === resource.session.questionId) || null : null);
      if (!question) return react.createElement("div", { className: "ivq-card iv-report" }, react.createElement("div", { className: "iv-report-body ivq-wait" }, "找不到要比较的题目。"));
      const showSingle = action === "attempt.get" || action === "evaluation.get";
      const selectedAttempt = findAttempt(question, args) || (showSingle && resource.session && resource.session.attemptId
        ? findAttempt(question, { attempt_id: resource.session.attemptId })
        : null);
      const attempts = showSingle ? (selectedAttempt ? [selectedAttempt] : []) : Array.isArray(question.attempts) ? question.attempts : [];
      const scored = attempts.filter((item) => item.score !== null);
      const delta = scored.length >= 2 ? Math.round((Number(scored[scored.length - 1].score) - Number(scored[0].score)) * 10) / 10 : null;
      const retry = () => {
        setRetrying(true);
        control(props.sessionId, { action: "retry", practice_id: resource.data.id, question_id: question.id })
          .then((value) => { if (!value || value.error) setRetrying(false); });
      };
      return react.createElement("section", { className: "ivq-card iv-report", "aria-label": "历次作答对比" },
        react.createElement("div", { className: "iv-report-head" },
          react.createElement("div", null, react.createElement("div", { className: "iv-report-title" }, showSingle ? (action === "evaluation.get" ? "评价详情" : "作答详情") : action === "evaluation.list" ? "评价记录" : "历次作答"), react.createElement("div", { className: "iv-report-sub" }, "第 " + String(question.index) + " 题 · " + String(attempts.length) + " 次记录")),
          delta === null ? null : react.createElement("span", { className: "iv-delta" }, (delta > 0 ? "+" : "") + String(delta) + " 分")),
        react.createElement("div", { className: "iv-report-body ivq-text" }, renderMd(question.question)),
        attempts.length
          ? react.createElement("div", { className: "iv-attempt-grid" }, attempts.map((attempt) =>
              react.createElement("article", { className: "iv-attempt", key: attempt.id },
                react.createElement("div", { className: "iv-attempt-head" }, react.createElement("span", { className: "iv-attempt-label" }, "ATTEMPT " + String(attempt.index).padStart(2, "0")), react.createElement("span", { className: "iv-attempt-score" }, attempt.score === null ? "未评分" : String(attempt.score) + "/10")),
                react.createElement("div", { className: "iv-attempt-answer" }, renderMd(attempt.answer || "暂无回答")),
                react.createElement(ScoreRail, { score: attempt.score }),
                attempt.comment ? react.createElement("div", { className: "iv-attempt-comment" }, renderMd(attempt.comment)) : null)))
          : react.createElement("div", { className: "iv-report-body ivq-wait" }, "这道题还没有作答记录。"),
        react.createElement("div", { className: "iv-report-actions" },
          react.createElement("button", { className: "iv-inline-btn is-primary", onClick: retry, disabled: retrying || resource.data.ended }, icon("IconRefreshOutline14", 14), retrying ? "正在打开…" : resource.data.ended ? "练习已结束" : "再次作答")));
    }

    function PracticeSummaryView(props) {
      const args = parseArgs(props.block);
      const sessionId = props.sessionId || "global";
      const resource = usePracticeData(sessionId, args);
      const busyPair = react.useState("");
      const busy = busyPair[0];
      const setBusy = busyPair[1];
      const noticePair = react.useState("");
      const notice = noticePair[0];
      const setNotice = noticePair[1];
      if (resource.loading) return react.createElement("div", { className: "ivq-card iv-report" }, react.createElement("div", { className: "iv-report-body ivq-wait" }, "正在生成练习总结…"));
      const practice = resource.data;
      if (resource.error || !practice) return react.createElement("div", { className: "ivq-card iv-report" }, react.createElement("div", { className: "iv-report-body ivq-wait" }, resource.error || "找不到练习。"));
      const scored = practice.questions.filter((item) => item.score !== null);
      const reviewAll = practice.questions.filter((item) => item.score === null || Number(item.score) < 7).sort((a, b) => (a.score === null ? -1 : a.score) - (b.score === null ? -1 : b.score));
      const review = reviewAll.slice(0, 4);
      const strong = practice.questions.filter((item) => item.score !== null && Number(item.score) >= 8).sort((a, b) => b.score - a.score).slice(0, 3);
      const metrics = [[practice.questionsCount, "题目"], [practice.answered, "已评分"], [practice.avg === null ? "—" : practice.avg, "平均分"], [reviewAll.length, "待复习"]];
      const reviewContent = review.length
        ? react.createElement("div", { className: "iv-review-list" }, review.map((question) =>
            react.createElement("div", { className: "iv-review-row", key: question.id },
              react.createElement("span", { className: "iv-attempt-label" }, "Q" + String(question.index).padStart(2, "0")),
              react.createElement("span", { className: "iv-review-q" }, question.question),
              react.createElement("span", { className: "iv-review-score" }, question.score === null ? "未答" : String(question.score) + "/10"))))
        : react.createElement("div", { className: "ivq-wait" }, scored.length ? "本次练习没有明显薄弱题。" : "完成评价后会生成复习优先级。");
      const strongContent = strong.length
        ? react.createElement("div", { className: "iv-review-list" }, strong.map((question) =>
            react.createElement("div", { className: "iv-review-row", key: question.id },
              react.createElement("span", { className: "iv-attempt-label" }, "Q" + String(question.index).padStart(2, "0")),
              react.createElement("span", { className: "iv-review-q" }, question.question),
              react.createElement("span", { className: "iv-review-score" }, String(question.score) + "/10"))))
        : react.createElement("div", { className: "ivq-wait" }, "达到 8 分的题目会显示在这里。");
      const reopen = () => { setBusy("reopen"); control(sessionId, { action: "practice.reopen", practice_id: practice.id }).then((value) => { if (value && !value.error) { resource.setData(Object.assign({}, practice, { ended: false, endedAt: null })); setNotice("练习已重新打开。" ); } }).finally(() => setBusy("")); };
      const exportPractice = () => { setBusy("export"); control(sessionId, { action: "export.create", practice_id: practice.id }).then((value) => { if (value && !value.error) setNotice("Markdown 已导出。" ); }).finally(() => setBusy("")); };
      return react.createElement("section", { className: "ivq-card iv-report", "aria-label": "练习总结" },
        react.createElement("div", { className: "iv-report-head" },
          react.createElement("div", null, react.createElement("div", { className: "iv-report-title" }, practice.ended ? "练习总结" : "练习概览"), react.createElement("div", { className: "iv-report-sub" }, practice.topic + " · " + practice.modeLabel)),
          react.createElement("span", { className: "ivq-score " + (practice.avg === null ? "ivq-score-none" : practice.avg >= 8 ? "ivq-score-ok" : practice.avg >= 6 ? "ivq-score-mid" : "ivq-score-bad") }, practice.avg === null ? "未评分" : String(practice.avg) + " 分")),
        react.createElement("div", { className: "iv-metric-grid" }, metrics.map((metric) => react.createElement("div", { className: "iv-metric", key: metric[1] }, react.createElement("strong", null, String(metric[0])), react.createElement("span", null, metric[1])))),
        react.createElement("div", { className: "iv-report-body" },
          react.createElement("div", { className: "iv-section-title" }, "掌握度"), react.createElement(ScoreRail, { score: practice.avg }),
          react.createElement("div", { className: "iv-section-title", style: { marginTop: "16px" } }, "优先复习"),
          reviewContent,
          react.createElement("div", { className: "iv-section-title", style: { marginTop: "16px" } }, "掌握较好"),
          strongContent),
        react.createElement("div", { className: "iv-report-actions" },
          practice.ended ? react.createElement("button", { className: "iv-inline-btn is-primary", onClick: reopen, disabled: Boolean(busy) }, icon("IconRefreshOutline14", 14), busy === "reopen" ? "正在打开…" : "重新打开") : null,
          react.createElement("button", { className: "iv-inline-btn", onClick: exportPractice, disabled: Boolean(busy) }, icon("IconDownloadOutline16", 14), busy === "export" ? "正在导出…" : "导出 Markdown"),
          notice ? react.createElement("span", { className: "iv-report-sub" }, notice) : null));
    }

    function ExportResultView(props) {
      const sessionId = props.sessionId || "global";
      const filesPair = react.useState([]);
      const files = filesPair[0];
      const setFiles = filesPair[1];
      const loadingPair = react.useState(true);
      const loading = loadingPair[0];
      const setLoading = loadingPair[1];
      const copiedPair = react.useState(-1);
      const copied = copiedPair[0];
      const setCopied = copiedPair[1];
      react.useEffect(() => {
        fetch("/interview/state?session=" + encodeURIComponent(sessionId)).then((response) => response.json()).then((state) => setFiles(Array.isArray(state.lastExportFiles) ? state.lastExportFiles : [])).catch(() => setFiles([])).finally(() => setLoading(false));
      }, [sessionId]);
      const copyPath = (path, index) => {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") return;
        navigator.clipboard.writeText(path).then(() => setCopied(index));
      };
      return react.createElement("section", { className: "ivq-card iv-report", "aria-label": "导出结果" },
        react.createElement("div", { className: "iv-report-head" }, react.createElement("div", null, react.createElement("div", { className: "iv-report-title" }, "Markdown 已导出"), react.createElement("div", { className: "iv-report-sub" }, loading ? "正在读取文件…" : String(files.length) + " 篇练习文档"))),
        loading ? react.createElement("div", { className: "iv-report-body ivq-wait" }, "正在读取导出结果…")
          : files.length ? react.createElement("div", { className: "iv-export-list" }, files.map((file, index) => react.createElement("div", { className: "iv-export-row", key: file.path },
              react.createElement("div", null, react.createElement("div", { className: "iv-export-title" }, file.title), react.createElement("div", { className: "iv-export-path" }, file.path)),
              react.createElement("div", { className: "iv-export-actions" },
                react.createElement("button", { className: "iv-inline-btn", onClick: () => window.open("/interview/export?session=" + encodeURIComponent(sessionId) + "&index=" + String(index), "_blank") }, icon("IconLinkOutline14", 14), "打开"),
                react.createElement("button", { className: "iv-inline-btn", onClick: () => copyPath(file.path, index) }, copied === index ? "已复制" : "复制路径")))))
            : react.createElement("div", { className: "iv-report-body ivq-wait" }, "没有找到本次导出文件。"));
    }

    function PracticeDetailView(props) {
      const args = parseArgs(props.block);
      const sessionId = props.sessionId || "global";
      const resource = usePracticeData(sessionId, args);
      const openPair = react.useState(null);
      const openQuestion = openPair[0];
      const setOpenQuestion = openPair[1];
      const busyPair = react.useState("");
      const busy = busyPair[0];
      const setBusy = busyPair[1];
      const noticePair = react.useState("");
      const notice = noticePair[0];
      const setNotice = noticePair[1];
      if (resource.loading) return react.createElement("div", { className: "ivq-card iv-report" }, react.createElement("div", { className: "iv-report-body ivq-wait" }, "正在加载练习详情…"));
      const practice = resource.data;
      if (resource.error || !practice) return react.createElement("div", { className: "ivq-card iv-report" }, react.createElement("div", { className: "iv-report-body ivq-wait" }, resource.error || "找不到练习。"));
      const retry = (question) => {
        if (practice.ended) return;
        setBusy("retry:" + question.id);
        control(sessionId, { action: "retry", practice_id: practice.id, question_id: question.id }).then((value) => {
          if (!value || value.error) throw new Error("action failed");
          setNotice("已聚焦第 " + String(question.index) + " 题，请继续回答。" );
        }).catch(() => setNotice("无法重新打开这道题。" )).finally(() => setBusy(""));
      };
      const reopen = () => {
        setBusy("reopen");
        control(sessionId, { action: "practice.reopen", practice_id: practice.id }).then((value) => {
          if (!value || value.error) throw new Error("action failed");
          resource.setData(Object.assign({}, practice, { ended: false, endedAt: null }));
          setNotice("练习已重新打开。" );
        }).catch(() => setNotice("无法重新打开练习。" )).finally(() => setBusy(""));
      };
      const summaryClass = practice.avg === null ? "ivq-score-none" : practice.avg >= 8 ? "ivq-score-ok" : practice.avg >= 6 ? "ivq-score-mid" : "ivq-score-bad";
      return react.createElement("section", { className: "ivq-card iv-report", "aria-label": "练习详情" },
        react.createElement("div", { className: "iv-report-head" },
          react.createElement("div", null, react.createElement("div", { className: "iv-report-title" }, "练习详情"), react.createElement("div", { className: "iv-report-sub" }, practice.topic + " · " + practice.modeLabel + " · " + String(practice.questionsCount) + " 题")),
          react.createElement("span", { className: "ivq-score " + summaryClass }, practice.avg === null ? "未评分" : String(practice.avg) + " 分")),
        react.createElement("div", { className: "iv-report-body" },
          react.createElement("div", { className: "iv-metric-grid" },
            [[practice.questionsCount, "题目"], [practice.answered, "已评分"], [practice.avg === null ? "—" : practice.avg, "平均分"], [practice.ended ? "已结束" : "进行中", "状态"]].map((metric) => react.createElement("div", { className: "iv-metric", key: metric[1] }, react.createElement("strong", null, String(metric[0])), react.createElement("span", null, metric[1]))))),
        react.createElement("div", { className: "iv-detail-table" },
          react.createElement("div", { className: "iv-detail-columns" }, react.createElement("span", null, "题号"), react.createElement("span", null, "题目"), react.createElement("span", null, "得分"), react.createElement("span", null, "作答")),
          practice.questions.map((question) => {
            const isOpen = openQuestion === question.id;
            return react.createElement("div", { className: "iv-detail-row" + (isOpen ? " is-open" : ""), key: question.id, onClick: () => setOpenQuestion(isOpen ? null : question.id) },
              react.createElement("span", { className: "iv-detail-num" }, "Q" + String(question.index).padStart(2, "0")),
              react.createElement("span", { className: "iv-detail-question", title: question.question }, question.question),
              react.createElement("span", { className: "iv-detail-score" }, question.score === null ? "—" : String(question.score)),
              react.createElement("span", { className: "iv-detail-attempts" }, String(question.attempts ? question.attempts.length : 0) + " 次"),
              isOpen ? react.createElement("div", { className: "iv-detail-expanded", onClick: (event) => event.stopPropagation() },
                question.attempts && question.attempts.length ? question.attempts.map((attempt) => react.createElement("div", { className: "iv-detail-attempt", key: attempt.id },
                  react.createElement("div", { className: "iv-detail-attempt-head" }, react.createElement("span", { className: "iv-attempt-label" }, "第 " + String(attempt.index) + " 次作答"), react.createElement("span", { className: "iv-detail-score" }, attempt.score === null ? "未评分" : String(attempt.score) + "/10")),
                  react.createElement("div", { className: "iv-detail-attempt-body" }, renderMd(attempt.answer || "暂无回答")),
                  attempt.comment ? react.createElement("div", { className: "iv-detail-attempt-comment" }, renderMd(attempt.comment)) : null)) : react.createElement("div", { className: "iv-detail-attempt" }, react.createElement("div", { className: "ivq-wait" }, "还没有作答记录。")),
                react.createElement("div", { className: "iva-retry-row" }, react.createElement("button", { className: "iv-inline-btn", disabled: practice.ended || Boolean(busy), onClick: () => retry(question) }, icon("IconRefreshOutline14", 14), practice.ended ? "练习已结束" : busy === "retry:" + question.id ? "正在打开…" : "重新作答"))) : null);
          })),
        react.createElement("div", { className: "iv-report-actions" },
          practice.ended ? react.createElement("button", { className: "iv-inline-btn is-primary", disabled: Boolean(busy), onClick: reopen }, icon("IconRefreshOutline14", 14), busy === "reopen" ? "正在打开…" : "重新打开") : null,
          notice ? react.createElement("span", { className: "iv-report-sub" }, notice) : null));
    }

    function QuestionResourceView(props) {
      const args = parseArgs(props.block);
      const action = typeof args.action === "string" ? args.action : "question.get";
      const sessionId = props.sessionId || "global";
      const resource = usePracticeData(sessionId, args);
      const busyPair = react.useState("");
      const busy = busyPair[0];
      const setBusy = busyPair[1];
      if (resource.loading) return react.createElement("div", { className: "ivq-card iv-report" }, react.createElement("div", { className: "iv-report-body ivq-wait" }, "正在加载题目…"));
      const practice = resource.data;
      const question = findQuestion(practice, args) || (practice && resource.session && resource.session.questionId ? practice.questions.find((item) => item.id === resource.session.questionId) || null : null);
      if (resource.error || !practice || !question) return react.createElement("div", { className: "ivq-card iv-report" }, react.createElement("div", { className: "iv-report-body ivq-wait" }, resource.error || "找不到题目。"));
      const retry = () => {
        setBusy("retry");
        control(sessionId, { action: "retry", practice_id: practice.id, question_id: question.id }).then((value) => { if (!value || value.error) setBusy(""); });
      };
      const reveal = () => {
        setBusy("reveal");
        control(sessionId, { action: "reveal", practice_id: practice.id, question_id: question.id }).then((value) => { if (!value || value.error) setBusy(""); });
      };
      const isExplanation = action === "explanation.get";
      if (isExplanation) return react.createElement("section", { className: "ivq-card iv-report", "aria-label": "参考答案" },
        react.createElement("div", { className: "iv-report-head" }, react.createElement("div", null, react.createElement("div", { className: "iv-report-title" }, "参考答案"), react.createElement("div", { className: "iv-report-sub" }, "第 " + String(question.index) + " 题 · " + practice.topic))),
        react.createElement("div", { className: "iv-report-body" },
          question.explain ? react.createElement("div", { className: "ivq-sec" }, react.createElement("div", { className: "ivq-sec-label" }, "讲解"), react.createElement("div", { className: "ivq-sec-body" }, renderMd(question.explain))) : null,
          question.memo ? react.createElement("div", { className: "ivq-sec", style: { marginTop: "12px" } }, react.createElement("div", { className: "ivq-sec-label" }, "直接背"), react.createElement("div", { className: "ivq-sec-body" }, renderMd(question.memo))) : null,
          !question.explain && !question.memo ? react.createElement("div", { className: "iv-explanation-empty" }, "这道题还没有参考讲解。") : null));
      return react.createElement("section", { className: "ivq-card iv-report", "aria-label": "题目详情" },
        react.createElement("div", { className: "iv-report-head" },
          react.createElement("div", null, react.createElement("div", { className: "iv-report-title" }, "题目详情"), react.createElement("div", { className: "iv-report-sub" }, practice.topic + " · 第 " + String(question.index) + " 题")),
          react.createElement("span", { className: "ivq-score " + (question.score === null ? "ivq-score-none" : question.score >= 8 ? "ivq-score-ok" : question.score >= 6 ? "ivq-score-mid" : "ivq-score-bad") }, question.score === null ? "未评分" : String(question.score) + " 分")),
        react.createElement("div", { className: "iv-report-body" },
          react.createElement("div", { className: "ivq-text" }, renderMd(question.question)),
          react.createElement("div", { className: "iv-question-meta", style: { marginTop: "10px" } }, String(question.attempts.length) + " 次作答", question.explain || question.memo ? "已有讲解" : "暂无讲解"),
          question.attempts.map((attempt) => react.createElement("div", { className: "iv-detail-attempt", key: attempt.id },
            react.createElement("div", { className: "iv-detail-attempt-head" }, react.createElement("span", { className: "iv-attempt-label" }, "第 " + String(attempt.index) + " 次作答"), react.createElement("span", { className: "iv-detail-score" }, attempt.score === null ? "未评分" : String(attempt.score) + "/10")),
            react.createElement("div", { className: "iv-detail-attempt-body" }, renderMd(attempt.answer || "暂无回答")),
            attempt.comment ? react.createElement("div", { className: "iv-detail-attempt-comment" }, renderMd(attempt.comment)) : null)),
          react.createElement("div", { className: "iv-question-detail-actions" },
            react.createElement("button", { className: "iv-inline-btn is-primary", disabled: practice.ended || Boolean(busy), onClick: retry }, icon("IconRefreshOutline14", 14), practice.ended ? "练习已结束" : busy === "retry" ? "正在打开…" : "重新作答"),
            !question.explain && !question.memo ? react.createElement("button", { className: "iv-inline-btn", disabled: Boolean(busy), onClick: reveal }, icon("IconQuestionOutline14", 14), busy === "reveal" ? "正在生成…" : "看讲解") : null)));
    }

    function CompactStatusView(props) {
      const config = props.config || {};
      return react.createElement("div", { className: "iv-status" + (config.danger ? " is-danger" : ""), role: "status" },
        react.createElement("span", { className: "iv-status-icon" }, icon(config.danger ? "IconWarningOutline16" : "IconCheckOutline16", 14)),
        react.createElement("span", null, config.label || "操作完成"));
    }

    function PracticeDashboardView(props) {
      const sessionId = props.sessionId || "global";
      const dataPair = react.useState(null);
      const data = dataPair[0];
      const setData = dataPair[1];
      const loadingPair = react.useState(true);
      const loading = loadingPair[0];
      const setLoading = loadingPair[1];
      const errorPair = react.useState("");
      const error = errorPair[0];
      const setError = errorPair[1];
      const queryPair = react.useState("");
      const query = queryPair[0];
      const setQuery = queryPair[1];
      const modePair = react.useState("all");
      const mode = modePair[0];
      const setMode = modePair[1];
      const detailPair = react.useState(null);
      const detail = detailPair[0];
      const setDetail = detailPair[1];
      const openQuestionPair = react.useState(null);
      const openQuestion = openQuestionPair[0];
      const setOpenQuestion = openQuestionPair[1];
      const busyPair = react.useState("");
      const busy = busyPair[0];
      const setBusy = busyPair[1];
      const noticePair = react.useState("");
      const notice = noticePair[0];
      const setNotice = noticePair[1];
      const confirmPair = react.useState(null);
      const confirming = confirmPair[0];
      const setConfirming = confirmPair[1];

      const loadDashboard = () => {
        setLoading(true);
        return fetch("/interview/state?view=dashboard&session=" + encodeURIComponent(sessionId))
          .then((response) => {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
          })
          .then((value) => { setData(value); setError(""); })
          .catch(() => setError("档案加载失败，请稍后重试。"))
          .finally(() => setLoading(false));
      };

      react.useEffect(() => { loadDashboard(); }, [sessionId]);

      const openDetail = (practice) => {
        setBusy("detail:" + practice.id);
        fetch("/interview/practice?practice_id=" + encodeURIComponent(practice.id))
          .then((response) => {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
          })
          .then((value) => {
            setDetail(value);
            setOpenQuestion(value.questions && value.questions[0] ? value.questions[0].id : null);
            setError("");
          })
          .catch(() => setError("练习详情加载失败。"))
          .finally(() => setBusy(""));
      };

      const runAction = (action, practice) => {
        const busyKey = action + ":" + practice.id;
        setBusy(busyKey);
        setNotice("");
        return control(sessionId, { action, practice_id: practice.id })
          .then((value) => {
            if (!value || value.error) throw new Error("action failed");
            if (action === "export.create") setNotice(value.__exportText || "Markdown 已导出。");
            else if (action === "session.select_practice" || action === "practice.reopen") setNotice("已切换到「" + practice.topic + "」，正在继续练习。" );
            else if (action === "practice.delete") {
              setNotice("已删除「" + practice.topic + "」。");
              setConfirming(null);
              if (detail && detail.id === practice.id) setDetail(null);
            }
            return loadDashboard();
          })
          .catch(() => setError("操作失败，请稍后重试。"))
          .finally(() => setBusy(""));
      };

      const retryQuestion = (question) => {
        if (!detail || detail.ended) return;
        setBusy("retry:" + question.id);
        setNotice("");
        control(sessionId, { action: "retry", practice_id: detail.id, question_id: question.id })
          .then((value) => {
            if (!value || value.error) throw new Error("action failed");
            setNotice("正在重新打开第 " + String(question.index) + " 题。" );
          })
          .catch(() => setError("无法重新打开这道题。"))
          .finally(() => setBusy(""));
      };

      const practices = data && Array.isArray(data.practices) ? data.practices : [];
      const normalizedQuery = query.trim().toLowerCase();
      const filtered = practices.filter((practice) => {
        if (mode !== "all" && practice.mode !== mode) return false;
        if (normalizedQuery && !(practice.topic + " " + practice.modeLabel).toLowerCase().includes(normalizedQuery)) return false;
        return true;
      });

      const stats = [
        [data ? data.practicesCount : 0, "练习"],
        [data ? data.questionsCount : 0, "题目"],
        [data ? data.answered : 0, "已评分"],
        [data && data.avg !== null ? data.avg : "—", "均分"],
      ];

      const renderQuestionBlock = (label, content) => content
        ? react.createElement("div", { className: "iva-block" },
            react.createElement("div", { className: "iva-block-label" }, label),
            react.createElement("div", { className: "iva-block-body" }, renderMd(content)))
        : null;

      return react.createElement(
        "section",
        { className: "iva-ledger", "aria-label": "练习档案" },
        react.createElement(
          "header",
          { className: "iva-head" },
          react.createElement("div", null,
            react.createElement("h2", { className: "iva-title" }, "练习档案"),
            react.createElement("div", { className: "iva-kicker" }, "PRACTICE LEDGER")),
          react.createElement("div", { className: "iva-stats" }, stats.map((stat) =>
            react.createElement("div", { className: "iva-stat", key: stat[1] },
              react.createElement("span", { className: "iva-stat-value" }, String(stat[0])),
              react.createElement("span", { className: "iva-stat-label" }, stat[1]))))
        ),
        react.createElement(
          "div",
          { className: "iva-tools" },
          react.createElement("label", { className: "iva-search" },
            react.createElement("span", { className: "iva-search-icon" }, icon("IconSearchOutline16", 14)),
            react.createElement("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: "搜索主题或模式", "aria-label": "搜索练习" })),
          react.createElement("select", { className: "iva-mode", value: mode, onChange: (event) => setMode(event.target.value), "aria-label": "筛选练习模式" },
            react.createElement("option", { value: "all" }, "全部模式"),
            react.createElement("option", { value: "baogu" }, "背八股"),
            react.createElement("option", { value: "mock" }, "模拟面试"),
            react.createElement("option", { value: "scenario" }, "场景题"),
            react.createElement("option", { value: "resume" }, "简历出题"))
        ),
        react.createElement(
          "div",
          { className: "iva-main" + (detail ? " iva-has-detail" : "") },
          react.createElement(
            "div",
            { className: "iva-list" },
            react.createElement("div", { className: "iva-columns", "aria-hidden": "true" },
              react.createElement("span", null, "日期"), react.createElement("span", null, "主题"), react.createElement("span", null, "进度"), react.createElement("span", null, "掌握度"), react.createElement("span", null, "操作")),
            loading
              ? react.createElement("div", { className: "iva-empty" }, icon("IconLoadingOutline16", 20), " 正在加载档案…")
              : filtered.length === 0
                ? react.createElement("div", { className: "iva-empty" }, practices.length ? "没有符合当前筛选的练习。" : "还没有练习记录。")
                : filtered.map((practice) => {
                    const date = ledgerDate(practice.createdAt);
                    const score = practice.avg === null ? null : Number(practice.avg);
                    const filled = score === null ? 0 : Math.max(0, Math.min(10, Math.round(score)));
                    const tone = score === null ? "" : score >= 8 ? "iva-good" : score >= 6 ? "iva-mid" : "iva-low";
                    const isBusy = busy.endsWith(":" + practice.id);
                    return react.createElement(
                      "div",
                      { key: practice.id, className: "iva-row" + (detail && detail.id === practice.id ? " iva-selected" : ""), role: "button", tabIndex: 0, onClick: () => openDetail(practice), onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetail(practice); } } },
                      react.createElement("div", { className: "iva-date" }, react.createElement("span", { className: "iva-date-day" }, date.day), react.createElement("span", { className: "iva-date-year" }, date.year)),
                      react.createElement("div", { className: "iva-topic" },
                        react.createElement("div", { className: "iva-topic-name", title: practice.topic }, practice.topic),
                        react.createElement("div", { className: "iva-topic-meta" }, react.createElement("span", { className: "iva-mode-tag" }, practice.modeLabel), practice.selected ? react.createElement("span", { className: "iva-current" }, "当前") : null, practice.ended ? react.createElement("span", null, "已结束") : null)),
                      react.createElement("div", { className: "iva-count" }, react.createElement("strong", null, String(practice.answered) + "/" + String(practice.questionsCount)), react.createElement("span", null, "已评分 / 题目")),
                      react.createElement("div", { className: "iva-scoreline" },
                        react.createElement("span", { className: "iva-score-value" }, score === null ? "—" : String(score)),
                        react.createElement("span", { className: "iva-rail", "aria-label": score === null ? "未评分" : "平均 " + String(score) + " 分" }, Array.from({ length: 10 }, (_, index) => react.createElement("span", { key: index, className: "iva-tick" + (index < filled ? " iva-tick-on " + tone : "") })))),
                      react.createElement("div", { className: "iva-actions", onClick: (event) => event.stopPropagation() },
                        react.createElement("button", { className: "iva-icon-btn", title: "导出 Markdown", "aria-label": "导出 Markdown", disabled: isBusy, onClick: () => runAction("export.create", practice) }, icon("IconDownloadOutline16", 15)),
                        react.createElement("button", { className: "iva-icon-btn iva-delete", title: "删除", "aria-label": "删除", disabled: isBusy, onClick: () => setConfirming(practice.id) }, icon("IconWarningOutline16", 15)),
                        react.createElement("button", { className: "iva-icon-btn", title: "继续练习", "aria-label": "继续练习", disabled: isBusy, onClick: () => runAction(practice.ended ? "practice.reopen" : "session.select_practice", practice) }, icon("IconChevronRightOutline14", 15))),
                      confirming === practice.id
                        ? react.createElement("div", { className: "iva-confirm", onClick: (event) => event.stopPropagation() },
                            react.createElement("span", null, "删除后无法恢复"),
                            react.createElement("button", { onClick: () => setConfirming(null) }, "取消"),
                            react.createElement("button", { className: "iva-danger", onClick: () => runAction("practice.delete", practice) }, "确认删除"))
                        : null
                    );
                  })
          ),
          detail
            ? react.createElement("aside", { className: "iva-detail", "aria-label": "练习详情" },
                react.createElement("div", { className: "iva-detail-head" },
                  react.createElement("div", null, react.createElement("div", { className: "iva-detail-title" }, detail.topic), react.createElement("div", { className: "iva-detail-sub" }, detail.modeLabel + " · " + detail.questionsCount + " 题 · 均分 " + (detail.avg === null ? "—" : detail.avg))),
                  react.createElement("button", { className: "iva-icon-btn", title: "返回档案", "aria-label": "返回档案", onClick: () => setDetail(null) }, icon("IconChevronLeftOutline14", 16))),
                detail.questions.length
                  ? detail.questions.map((question) => react.createElement("div", { className: "iva-question", key: question.id },
                      react.createElement("button", { className: "iva-question-toggle", onClick: () => setOpenQuestion(openQuestion === question.id ? null : question.id), "aria-expanded": openQuestion === question.id },
                        react.createElement("span", { className: "iva-qnum" }, "Q" + String(question.index).padStart(2, "0")),
                        react.createElement("span", { className: "iva-qtext" }, question.question),
                        react.createElement("span", { className: "iva-qscore" }, question.score === null ? "—" : String(question.score) + "/10")),
                      openQuestion === question.id
                        ? react.createElement("div", { className: "iva-question-body" },
                            question.attempts && question.attempts.length
                              ? question.attempts.map((attempt) => react.createElement("div", { className: "iva-block", key: attempt.id },
                                  react.createElement("div", { className: "iva-block-label" }, "第 " + String(attempt.index) + " 次作答"),
                                  react.createElement("div", { className: "iva-block-body" }, renderMd(attempt.answer || "暂无回答")),
                                  attempt.score === null ? null : react.createElement("div", { className: "iva-block-body" }, renderMd(String(attempt.score) + "/10" + (attempt.comment ? " · " + attempt.comment : "")))))
                              : renderQuestionBlock("作答", "暂无回答"),
                            renderQuestionBlock("讲解", question.explain),
                            renderQuestionBlock("直接背", question.memo),
                            react.createElement("div", { className: "iva-retry-row" }, react.createElement("button", { className: "iv-inline-btn", disabled: detail.ended || busy === "retry:" + question.id, title: detail.ended ? "先继续这条练习" : "重新作答", onClick: () => retryQuestion(question) }, icon("IconRefreshOutline14", 14), detail.ended ? "练习已结束" : busy === "retry:" + question.id ? "正在打开…" : "重新作答")))
                        : null))
                  : react.createElement("div", { className: "iva-empty" }, "这次练习还没有题目。"))
            : null
        ),
        error ? react.createElement("div", { className: "iva-notice iva-error" }, error) : notice ? react.createElement("div", { className: "iva-notice" }, notice) : null
      );
    }

    function QuestionCard(props) {
      return react.createElement("div", { className: "ivq-card" },
        react.createElement("div", { className: "ivq-text" }, renderMd(props.question)),
        react.createElement("div", { className: "ivq-row" },
          react.createElement("button", { className: "ivq-btn" + (props.asked ? "" : " ivq-btn-primary"), onClick: props.onReveal, disabled: props.asked }, props.asked ? "已请求，正在讲解…" : "看答案")));
    }

    function ExistingQuestionView(props) {
      const sessionId = props.sessionId;
      const args = parseArgs(props.block);
      const questionPair = react.useState(null);
      const question = questionPair[0];
      const setQuestion = questionPair[1];
      const loadingPair = react.useState(true);
      const loading = loadingPair[0];
      const setLoading = loadingPair[1];
      const askedPair = react.useState(false);
      const asked = askedPair[0];
      const setAsked = askedPair[1];
      const practiceId = typeof args.practice_id === "string" ? args.practice_id : "";
      const questionId = typeof args.question_id === "string" ? args.question_id : "";
      const questionIndex = Number(args.question_index);
      react.useEffect(() => {
        const url = "/interview/practice?practice_id=" + encodeURIComponent(practiceId);
        fetch(url).then((response) => response.json()).then((detail) => {
          const questions = detail && Array.isArray(detail.questions) ? detail.questions : [];
          const found = questionId ? questions.find((item) => item.id === questionId) : Number.isInteger(questionIndex) ? questions[questionIndex - 1] : null;
          setQuestion(found || null);
        }).catch(() => setQuestion(null)).finally(() => setLoading(false));
      }, [practiceId, questionId, questionIndex]);
      const target = { practice_id: practiceId, question_id: question ? question.id : questionId };
      const onReveal = () => control(sessionId, Object.assign({ action: "reveal" }, target)).then(() => setAsked(true));
      if (loading) return react.createElement("div", { className: "ivq-card" }, react.createElement("div", { className: "ivq-wait" }, "正在加载题目…"));
      if (!question) return react.createElement("div", { className: "ivq-card" }, react.createElement("div", { className: "ivq-wait" }, "找不到这道题，可能已被删除。"));
      return react.createElement(QuestionCard, { question: question.question, asked, onReveal });
    }

    // 题目卡片：渲染在对话流中 interview 工具调用（question.open）的位置。
    function QuestionView(props) {
      const sessionId = props.sessionId;
      const askedPair = react.useState(false);
      const asked = askedPair[0];
      const setAsked = askedPair[1];
      const nextPair = react.useState(false);
      const nextAsked = nextPair[0];
      const setNextAsked = nextPair[1];
      const endPair = react.useState(false);
      const endAsked = endPair[0];
      const setEndAsked = endPair[1];
      const args = parseArgs(props.block);
      const action = typeof args.action === "string" ? args.action : "";
      const presentation = ACTION_PRESENTATION[action];
      const target = {
        practice_id: typeof args.practice_id === "string" ? args.practice_id : undefined,
        question_id: typeof args.question_id === "string" ? args.question_id : undefined,
        question_index: Number.isInteger(Number(args.question_index)) ? Number(args.question_index) : undefined,
        attempt_id: typeof args.attempt_id === "string" ? args.attempt_id : undefined,
        question: typeof args.question === "string" ? args.question : undefined,
      };

      if (action === "practice.list" || action === "practice.dashboard") {
        return react.createElement(PracticeDashboardView, { sessionId });
      }
      if (action === "practice.get") {
        return react.createElement(PracticeDetailView, { sessionId, block: props.block });
      }
      if (action === "practice.timeline" || action === "question.list") {
        return react.createElement(PracticeDetailView, { sessionId, block: props.block });
      }
      if (action === "question.get" || action === "explanation.get") {
        return react.createElement(QuestionResourceView, { sessionId, block: props.block });
      }
      if (action === "attempt.list" || action === "attempt.get" || action === "evaluation.list" || action === "evaluation.get") {
        return react.createElement(AttemptComparisonView, { sessionId, block: props.block });
      }
      if (action === "practice.finish" || action === "practice.summary") {
        return react.createElement(PracticeSummaryView, { sessionId, block: props.block });
      }
      if (action === "export.create") {
        return react.createElement(ExportResultView, { sessionId, block: props.block });
      }
      if (action === "question.open" && !args.question && (args.question_id || Number(args.question_index) >= 1)) {
        return react.createElement(ExistingQuestionView, { sessionId, block: props.block });
      }
      const onReveal = () => {
        control(sessionId, Object.assign({ action: "reveal" }, target)).then(() => setAsked(true));
      };
      const onNext = () => {
        control(sessionId, Object.assign({ action: "next" }, target)).then(() => setNextAsked(true));
      };
      const onEnd = () => {
        control(sessionId, Object.assign({ action: "end" }, target)).then(() => setEndAsked(true));
      };

      if (action === "question.open") {
        const question = typeof args.question === "string" ? args.question.trim() : "";
        return question ? react.createElement(QuestionCard, { question, asked, onReveal }) : react.createElement("div", { className: "ivq-card" }, react.createElement("div", { className: "ivq-wait" }, "正在加载题目…"));
      }

      // 答案卡片：讲解 + 直接背，两项流程操作为下一题和结束练习。
      if (action === "explanation.create" || action === "explanation.update") {
        const explain = typeof args.explain === "string" && args.explain.trim() ? args.explain.trim() : "";
        const memo = typeof args.memo === "string" && args.memo.trim() ? args.memo.trim() : "";
        if (!explain && !memo) {
          return react.createElement("div", { className: "ivq-mini" }, "参考答案");
        }
        return react.createElement(
          "div",
          { className: "ivq-card" },
          react.createElement("div", { className: "ivq-atitle" }, "参考答案"),
          explain
            ? react.createElement(
                "div",
                { className: "ivq-sec" },
                react.createElement("div", { className: "ivq-sec-label" }, "讲解"),
                react.createElement(
                  "div",
                  { className: "ivq-sec-body" },
                  renderMd(explain)
                )
              )
            : null,
          memo
            ? react.createElement(
                "div",
                { className: "ivq-sec" },
                react.createElement("div", { className: "ivq-sec-label" }, "直接背"),
                react.createElement(
                  "div",
                  { className: "ivq-sec-body" },
                  renderMd(memo)
                )
              )
            : null,
          react.createElement(
            "div",
            { className: "ivq-row" },
            react.createElement(
              "button",
              {
                className: "ivq-btn ivq-btn-primary",
                onClick: onNext,
                disabled: nextAsked || endAsked,
              },
              nextAsked ? "已请求，正在出下一题…" : "下一题"
            ),
            react.createElement(
              "button",
              {
                className: "ivq-btn",
                onClick: onEnd,
                disabled: endAsked,
              },
              endAsked ? "已结束，正在生成总结…" : "结束练习"
            )
          )
        );
      }

      // 评分卡片：评分、点评和看讲解；下一题入口仅放在参考答案卡片。
      if (action === "evaluation.create" || action === "evaluation.update") {
        const jscore = Number(args.score);
        const comment = typeof args.comment === "string" && args.comment.trim() ? args.comment.trim() : "";
        if (!Number.isFinite(jscore) && !comment) {
          return react.createElement("div", { className: "ivq-mini" }, "评分完成");
        }
        const jverdict = jscore >= 8 ? "优秀" : jscore >= 6 ? "合格" : "需加强";
        const jclass = jscore >= 8 ? "ivq-score-ok" : jscore >= 6 ? "ivq-score-mid" : "ivq-score-bad";
        return react.createElement(
          "div",
          { className: "ivq-card" },
          react.createElement(
            "div",
            { className: "ivq-jrow" },
            Number.isFinite(jscore)
              ? react.createElement(
                  "span",
                  { className: "ivq-score " + jclass },
                  String(jscore) + " 分"
                )
              : null,
            Number.isFinite(jscore)
              ? react.createElement("span", { className: "ivq-jverdict" }, jverdict)
              : null
          ),
          comment
            ? react.createElement(
                "div",
                { className: "ivq-sec-body" },
                renderMd(comment)
              )
            : null,
          react.createElement("div", { className: "ivq-row" },
            react.createElement("button", { className: "iv-inline-btn", onClick: onReveal, disabled: asked }, icon("IconQuestionOutline14", 14), asked ? "正在生成讲解…" : "看讲解"))
        );
      }

      if (!presentation || presentation.kind === "silent") return null;
      return presentation.kind === "status" ? react.createElement(CompactStatusView, { config: presentation }) : null;
    }

    // 右侧题目时间轴：从当前选中练习的持久化数据恢复，不依赖当前聊天历史。
    function TimelinePanel(props) {
      const openPair = react.useState(true);
      const open = openPair[0];
      const setOpen = openPair[1];
      const detailPair = react.useState(null); // { kind, label, num, content }
      const detail = detailPair[0];
      const setDetail = detailPair[1];
      const practicePair = react.useState(null);
      const practice = practicePair[0];
      const setPractice = practicePair[1];
      const focusPair = react.useState(null);
      const focusedQuestionId = focusPair[0];
      const setFocusedQuestionId = focusPair[1];
      const requestRef = react.useRef(0);
      const useSession = props.useSession;
      const chatRevision = typeof useSession === "function" ? useSession((snap) => {
        const chat = snap && snap.chat;
        const order = chat && Array.isArray(chat.order) ? chat.order : [];
        return String(order.length) + ":" + String(order.length ? order[order.length - 1] : "");
      }) : "";
      const sessionId = props.sessionId || "global";
      const loadTimeline = () => {
        const requestId = ++requestRef.current;
        fetch("/interview/state?session=" + encodeURIComponent(sessionId))
          .then((response) => {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
          })
          .then((state) => {
            if (!state || !state.practiceId) return null;
            return fetch("/interview/practice?practice_id=" + encodeURIComponent(state.practiceId)).then((response) => {
              if (!response.ok) throw new Error("HTTP " + response.status);
              return response.json();
            }).then((practice) => ({ practice, focusedQuestionId: state.questionId || null }));
          })
          .then((value) => {
            if (requestId !== requestRef.current) return;
            const nextPractice = value ? value.practice : null;
            setPractice(nextPractice);
            setFocusedQuestionId(value ? value.focusedQuestionId : null);
            setDetail((current) => !nextPractice || !nextPractice.questions || !nextPractice.questions.some((question) => current && current.questionId === question.id) ? null : current);
          })
          .catch(() => { if (requestId === requestRef.current) { setPractice(null); setFocusedQuestionId(null); setDetail(null); } });
      };
      react.useEffect(() => {
        loadTimeline();
        const timer = setTimeout(loadTimeline, 300);
        return () => clearTimeout(timer);
      }, [sessionId, chatRevision]);
      react.useEffect(() => {
        const onChange = (event) => { if (!event.detail || event.detail.sessionId === sessionId) loadTimeline(); };
        const onFocus = () => loadTimeline();
        window.addEventListener("dsh-interview-state-change", onChange);
        window.addEventListener("focus", onFocus);
        return () => { window.removeEventListener("dsh-interview-state-change", onChange); window.removeEventListener("focus", onFocus); };
      }, [sessionId]);
      const entries = practice && Array.isArray(practice.questions) ? practice.questions.map((question) => ({
        id: question.id,
        question: question.question || "",
        answer: question.userAnswer || "",
        score: question.score === null ? null : Number(question.score),
        comment: question.comment || "",
        attempts: Array.isArray(question.attempts) ? question.attempts : [],
        explain: question.explain || "",
        memo: question.memo || "",
      })) : [];
      const count = entries.length;

      if (count === 0) return null;

      const openDetail = (entry, index, kind, label) => {
        let content = "";
        if (kind === "question") content = entry.question;
        else if (kind === "answer") content = entry.attempts.length
          ? entry.attempts.map((attempt) => "第 " + String(attempt.index) + " 次作答：\n" + (attempt.answer || "（暂无回答）")).join("\n\n")
          : "（暂无回答）";
        else if (kind === "comment") {
          const evaluated = entry.attempts.filter((attempt) => attempt.score !== null);
          content = evaluated.length
            ? evaluated.map((attempt) => "第 " + String(attempt.index) + " 次评价：" + String(attempt.score) + " 分\n\n" + (attempt.comment || "（无点评）")).join("\n\n")
            : "（暂无点评）";
        } else if (kind === "answer_card") {
          content = (entry.explain ? "讲解：\n" + entry.explain + "\n\n" : "") + (entry.memo ? "直接背：\n" + entry.memo : "") || "（暂无答案）";
        }
        setDetail({ kind, questionId: entry.id, label: label + " · 第 " + String(index + 1) + " 题", content: content });
      };

      if (!open) {
        return react.createElement(
          "button",
          {
            className: "ivt-toggle",
            onClick: () => setOpen(true),
            title: "展开题目时间轴",
          },
          "题目",
          react.createElement("span", null, String(count))
        );
      }

      return react.createElement(
        react.Fragment,
        null,
        react.createElement(
          "div",
          { className: "ivt-panel" },
          react.createElement(
            "div",
            { className: "ivt-head" },
            react.createElement("span", null, "题目时间轴", practice && practice.topic ? " · " + practice.topic : ""),
            react.createElement(
              "button",
              { className: "ivt-btn", onClick: () => setOpen(false) },
              "收起"
            )
          ),
          react.createElement(
            "div",
            { className: "ivt-body" },
            react.createElement(
              "ol",
              { className: "ivt-list" },
              entries.map((entry, i) =>
                react.createElement(
                  "li",
                  {
                    key: entry.id,
                    className: "ivt-item" + (!practice.ended && entry.id === focusedQuestionId ? " ivt-item-current" : ""),
                  },
                  react.createElement("div", { className: "ivt-num" }, "第 " + String(i + 1) + " 题" + (!practice.ended && entry.id === focusedQuestionId ? " · 当前" : "")),
                  react.createElement("div", { className: "ivt-q" }, entry.question),
                  react.createElement(
                    "div",
                    { className: "ivt-actions" },
                    react.createElement(
                      "button",
                      { className: "ivt-act", onClick: () => openDetail(entry, i, "question", "问题") },
                      "问题"
                    ),
                    react.createElement(
                      "button",
                      { className: "ivt-act", onClick: () => openDetail(entry, i, "answer", "回答") },
                      "回答"
                    ),
                    react.createElement(
                      "button",
                      { className: "ivt-act", onClick: () => openDetail(entry, i, "comment", "点评") },
                      "点评"
                    ),
                    react.createElement(
                      "button",
                      { className: "ivt-act", onClick: () => openDetail(entry, i, "answer_card", "答案") },
                      "答案"
                    )
                  )
                )
              )
            )
          )
        ),
        // 详情抽屉：从时间轴左侧展开，markdown 渲染
        detail
          ? react.createElement(
              "div",
              { className: "ivt-drawer" },
              react.createElement(
                "div",
                { className: "ivt-dhead" },
                detail.label,
                react.createElement(
                  "button",
                  { className: "ivt-btn", onClick: () => setDetail(null) },
                  "关闭"
                )
              ),
              react.createElement("div", { className: "ivt-dbody" }, renderMd(detail.content))
            )
          : null
      );
    }

    const slots = ctx.get("slots");
    if (slots === undefined) return;

    // keyed by 工具名：interview 工具的调用在聊天流中渲染为题目卡片
    slots.inject("tool.call.toolview", () =>
      slots.register(
        { name: "tool.call.toolview", key: "interview" },
        (props) => react.createElement(QuestionView, { sessionId: props.sessionId, block: props.block })
      )
    );

    // 右侧题目时间轴（通过 dock 槽位挂载，fixed 浮层不占布局）
    slots.inject("conversation.input.dock", () =>
      slots.register(
        { name: "conversation.input.dock", id: "interview-timeline", order: 25 },
        (props) => react.createElement(TimelinePanel, { sessionId: props.sessionId, useSession: props.useSession })
      )
    );
  }

  exports.name = name;
  exports.inject = inject;
  exports.apply = apply;
  return module.exports;
}});
