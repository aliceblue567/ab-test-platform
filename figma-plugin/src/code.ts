/// <reference types="@figma/plugin-typings" />

type Settings = {
  apiKey: string;
  endpoint: string;
};

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

const DEFAULT_ENDPOINT = "https://ab-test-platform.vercel.app";
const CHECK_PATH = "/api/v1/ux-writing/check";
const SETTINGS_KEY = "ux-writing-settings";

figma.showUI(__html__, { width: 380, height: 560 });

async function loadSettings(): Promise<Settings> {
  const stored = (await figma.clientStorage.getAsync(SETTINGS_KEY)) as
    | Settings
    | undefined;
  return stored ?? { apiKey: "", endpoint: DEFAULT_ENDPOINT };
}

async function saveSettings(settings: Settings): Promise<void> {
  await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
}

function collectTextNodes(nodes: readonly SceneNode[]): TextNode[] {
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
  // 빈 텍스트는 검수 대상에서 제외
  return result.filter((n) => n.characters.trim().length > 0);
}

async function loadAllFontsForNode(node: TextNode): Promise<void> {
  const len = node.characters.length;
  if (len === 0) return;
  const fonts = node.getRangeAllFontNames(0, len);
  for (const font of fonts) {
    await figma.loadFontAsync(font);
  }
}

async function runCheck(settings: Settings): Promise<void> {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "먼저 검수할 프레임이나 텍스트를 선택해 주세요.",
    });
    return;
  }
  if (!settings.apiKey) {
    figma.ui.postMessage({
      type: "error",
      message: "API 키를 먼저 저장해 주세요.",
    });
    return;
  }

  const textNodes = collectTextNodes(selection);
  if (textNodes.length === 0) {
    figma.ui.postMessage({
      type: "error",
      message: "선택 영역에 검수할 텍스트가 없어요.",
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
      await runCheck(settings);
      break;
    }
    case "apply": {
      await applySuggestion(msg.nodeId as string, msg.newText as string);
      break;
    }
    default:
      break;
  }
};
