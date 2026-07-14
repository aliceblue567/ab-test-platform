/// <reference types="@figma/plugin-typings" />

// 빌드 시 esbuild define으로 주입됨 (build.js 참고). 팀 배포용 빌드에만 값이 채워지고,
// 이 소스 파일이나 git 커밋에는 실제 키가 절대 들어가지 않음.
declare const __DEFAULT_API_KEY__: string;

type Settings = {
  apiKey: string;
  endpoint: string;
};

type Scope = "selection" | "page" | "file";

type CheckResultMsg = {
  type: "result";
  nodeId: string;
  original: string;
  suggestion: string;
  reason: string;
  violated_rule: string;
};

type CheckErrorMsg = {
  type: "result-error";
  nodeId: string;
  original: string;
  message: string;
};

type ConsistencyIssue = {
  item_ids: string[];
  summary: string;
  suggested_term: string;
};

const DEFAULT_ENDPOINT = "https://ab-test-platform.vercel.app";
const CHECK_PATH = "/api/v1/ux-writing/check";
const CONSISTENCY_PATH = "/api/v1/ux-writing/check-consistency";
const SETTINGS_KEY = "ux-writing-settings";

figma.showUI(__html__, { width: 400, height: 620 });

async function loadSettings(): Promise<Settings> {
  const stored = (await figma.clientStorage.getAsync(SETTINGS_KEY)) as
    | Settings
    | undefined;
  return (
    stored ?? { apiKey: __DEFAULT_API_KEY__, endpoint: DEFAULT_ENDPOINT }
  );
}

async function saveSettings(settings: Settings): Promise<void> {
  await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
}

function collectTextNodesFromSelection(
  nodes: readonly SceneNode[]
): TextNode[] {
  const result: TextNode[] = [];
  for (const node of nodes) {
    if (node.type === "TEXT") {
      result.push(node);
      continue;
    }
    if ("findAll" in node) {
      const found = (node as ChildrenMixin & SceneNode).findAll(
        (n) => n.type === "TEXT"
      ) as TextNode[];
      result.push(...found);
    }
  }
  return result;
}

/** scope에 따라 검수 대상 텍스트 노드를 모은다. file은 모든 페이지를 순회하며 loadAsync 필요. */
async function collectTextNodesForScope(scope: Scope): Promise<TextNode[]> {
  let nodes: TextNode[] = [];

  if (scope === "selection") {
    nodes = collectTextNodesFromSelection(figma.currentPage.selection);
  } else if (scope === "page") {
    nodes = figma.currentPage.findAll((n) => n.type === "TEXT") as TextNode[];
  } else {
    for (const page of figma.root.children) {
      await page.loadAsync();
      nodes.push(...(page.findAll((n) => n.type === "TEXT") as TextNode[]));
    }
  }

  // 빈 텍스트는 검수 대상에서 제외
  return nodes.filter((n) => n.characters.trim().length > 0);
}

async function loadAllFontsForNode(node: TextNode): Promise<void> {
  const len = node.characters.length;
  if (len === 0) return;
  const fonts = node.getRangeAllFontNames(0, len);
  for (const font of fonts) {
    await figma.loadFontAsync(font);
  }
}

/** id로 텍스트 노드를 찾아 필요하면 해당 페이지로 전환하고 선택·스크롤한다. */
async function focusNode(nodeId: string): Promise<TextNode | null> {
  const node = figma.getNodeById(nodeId);
  if (!node || node.type !== "TEXT") return null;

  let ancestor: BaseNode | null = node;
  while (ancestor && ancestor.type !== "PAGE") {
    ancestor = ancestor.parent;
  }
  if (ancestor && ancestor.type === "PAGE" && ancestor.id !== figma.currentPage.id) {
    await figma.setCurrentPageAsync(ancestor as PageNode);
  }

  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
  return node;
}

async function runCheck(settings: Settings, scope: Scope): Promise<void> {
  if (!settings.apiKey) {
    figma.ui.postMessage({ type: "error", message: "API 키를 먼저 저장해 주세요." });
    return;
  }
  if (scope === "selection" && figma.currentPage.selection.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "먼저 검수할 프레임이나 텍스트를 선택해 주세요.",
    });
    return;
  }

  const textNodes = await collectTextNodesForScope(scope);
  if (textNodes.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "검수할 텍스트가 없어요.",
    });
    return;
  }

  figma.ui.postMessage({ type: "start", total: textNodes.length });

  const url = settings.endpoint.replace(/\/$/, "") + CHECK_PATH;

  for (const node of textNodes) {
    const original = node.characters;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.apiKey,
        },
        body: JSON.stringify({ text: original }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          (body && typeof body === "object" && "message" in body
            ? String((body as { message?: unknown }).message)
            : "") || `요청이 실패했어요 (${res.status})`;
        const errMsg: CheckErrorMsg = {
          type: "result-error",
          nodeId: node.id,
          original,
          message,
        };
        figma.ui.postMessage(errMsg);
        continue;
      }

      const data = (await res.json()) as {
        suggestion: string;
        reason: string;
        violated_rule: string;
      };

      const msg: CheckResultMsg = {
        type: "result",
        nodeId: node.id,
        original,
        suggestion: data.suggestion,
        reason: data.reason,
        violated_rule: data.violated_rule,
      };
      figma.ui.postMessage(msg);
    } catch (err) {
      const errMsg: CheckErrorMsg = {
        type: "result-error",
        nodeId: node.id,
        original,
        message: err instanceof Error ? err.message : "네트워크 오류",
      };
      figma.ui.postMessage(errMsg);
    }
  }

  figma.ui.postMessage({ type: "done" });
}

async function runConsistencyCheck(
  settings: Settings,
  scope: Scope
): Promise<void> {
  if (!settings.apiKey) {
    figma.ui.postMessage({ type: "error", message: "API 키를 먼저 저장해 주세요." });
    return;
  }
  if (scope === "selection" && figma.currentPage.selection.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "먼저 검수할 프레임이나 텍스트를 선택해 주세요.",
    });
    return;
  }

  const textNodes = await collectTextNodesForScope(scope);
  if (textNodes.length < 2) {
    figma.ui.postMessage({
      type: "error",
      message: "일관성 검사는 텍스트가 2개 이상 있어야 실행할 수 있어요.",
    });
    return;
  }

  figma.ui.postMessage({ type: "consistency-start", total: textNodes.length });

  const items = textNodes.map((n) => ({ id: n.id, text: n.characters }));
  const url = settings.endpoint.replace(/\/$/, "") + CONSISTENCY_PATH;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey,
      },
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        (body && typeof body === "object" && "message" in body
          ? String((body as { message?: unknown }).message)
          : "") || `요청이 실패했어요 (${res.status})`;
      figma.ui.postMessage({ type: "error", message });
      return;
    }

    const data = (await res.json()) as { issues: ConsistencyIssue[] };
    figma.ui.postMessage({
      type: "consistency-result",
      issues: data.issues,
      items,
    });
  } catch (err) {
    figma.ui.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "네트워크 오류",
    });
  }
}

async function applySuggestion(nodeId: string, newText: string): Promise<void> {
  const node = figma.getNodeById(nodeId);
  if (!node || node.type !== "TEXT") {
    figma.ui.postMessage({
      type: "apply-error",
      nodeId,
      message: "해당 텍스트 노드를 찾을 수 없어요 (선택 영역이 바뀌었을 수 있어요).",
    });
    return;
  }
  try {
    await loadAllFontsForNode(node);
    node.characters = newText;
    figma.ui.postMessage({ type: "applied", nodeId });
  } catch (err) {
    figma.ui.postMessage({
      type: "apply-error",
      nodeId,
      message: err instanceof Error ? err.message : "적용 중 오류가 발생했어요.",
    });
  }
}

figma.ui.onmessage = async (msg: { type: string; [key: string]: unknown }) => {
  switch (msg.type) {
    case "ui-ready": {
      const settings = await loadSettings();
      figma.ui.postMessage({ type: "settings", settings });
      break;
    }
    case "save-settings": {
      const settings = msg.settings as Settings;
      await saveSettings(settings);
      figma.ui.postMessage({ type: "settings-saved" });
      break;
    }
    case "run-check": {
      const settings = await loadSettings();
      await runCheck(settings, msg.scope as Scope);
      break;
    }
    case "run-consistency-check": {
      const settings = await loadSettings();
      await runConsistencyCheck(settings, msg.scope as Scope);
      break;
    }
    case "apply": {
      await applySuggestion(msg.nodeId as string, msg.newText as string);
      break;
    }
    case "select-node": {
      const found = await focusNode(msg.nodeId as string);
      if (!found) {
        figma.ui.postMessage({
          type: "select-error",
          nodeId: msg.nodeId,
          message: "해당 노드를 찾을 수 없어요.",
        });
      }
      break;
    }
    default:
      break;
  }
};
