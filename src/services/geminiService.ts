import type { GeneratedCopy } from "../types";

// ==========================================
// 1. 基础配置 (读取 .env.local)
// ==========================================
const API_KEY = import.meta.env.VITE_API_KEY;
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 模型配置
const TEXT_MODEL = "gemini-2.5-flash";
// 注意：确保你的 API Key 有权限访问这个预览版生图模型
const IMAGE_MODEL = "gemini-2.5-flash-image";

// ==========================================
// 2. 工具函数
// ==========================================

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // 兼容不同浏览器行为，确保只拿到 base64 数据部分
      const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * 新增：健壮的 JSON 提取器
 * 用于从模型可能包含废话的回复中提取纯净的 JSON 对象
 */
function extractJson(text: string): any {
  try {
    // 1. 尝试直接解析 (最快)
    return JSON.parse(text);
  } catch (e) {
    // 2. 如果失败，尝试清理 markdown 标记后再解析
    let cleanText = text.replace(/```json|```/g, '').trim();
    try {
        return JSON.parse(cleanText);
    } catch (e2) {
        // 3. 如果还失败，使用暴力查找法：找到第一个 '{' 和最后一个 '}'
        const startIndex = cleanText.indexOf('{');
        const endIndex = cleanText.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            const jsonSubstring = cleanText.substring(startIndex, endIndex + 1);
            try {
                return JSON.parse(jsonSubstring);
            } catch (e3) {
                console.error("JSON 暴力提取失败:", jsonSubstring);
                throw new Error("无法从模型回复中解析出有效的 JSON 数据");
            }
        } else {
            throw new Error("模型回复中未找到 JSON 对象结构 ({...})");
        }
    }
  }
}


/**
 * 核心请求函数
 */
async function fetchOpenAICompat(payload: any, endpoint: string = '/v1/chat/completions') {
  if (!API_KEY || !BASE_URL) {
    throw new Error("配置缺失：请检查 .env.local 是否包含 VITE_API_KEY 和 VITE_API_BASE_URL");
  }

  const cleanBaseUrl = BASE_URL.replace(/\/+$/, "");
  const url = `${cleanBaseUrl}${endpoint}`;

  // 调试日志
  if (url.includes('generateContent')) {
      // console.log("正在发送生图 Payload:", JSON.stringify(payload, null, 2));
      console.log(`[API Request] 生图请求: ${IMAGE_MODEL}`);
  } else {
      console.log(`[API Request] 文本请求: ${payload.model}`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    // 尝试优化错误提示
    let errMsg = errText;
    try {
        const errObj = JSON.parse(errText);
        if (errObj.error && errObj.error.message) {
            errMsg = errObj.error.message;
        }
    } catch { /* ignore */ }
    console.error("API Error Details:", errText);
    throw new Error(`API请求失败 [${response.status}]: ${errMsg}`);
  }

  return response.json();
}

// ==========================================
// 3. 业务逻辑
// ==========================================

/**
 * 功能 1: 生成随机故事 (保持 OpenAI 兼容格式，依赖中转服务转换多模态)
 */
export const generateRandomStory = async (imageBase64?: string, mimeType?: string): Promise<string> => {
  let messages: any[] = [];
  let promptText = "";

  if (imageBase64 && mimeType) {
    // === 模式 A: 看图编故事 ===
    promptText = `
    【任务目标】作为一名脑洞大开的四格漫画编剧，请仔细观察我上传的图片。
    【核心要求】以此图片中的角色或核心元素为主角，构思一个有趣且带有反转的四格漫画故事。
    
    要求：
    1. **紧扣图片**：主角的外貌、特征必须基于图片内容。
    2. 题材：生活趣事、奇幻遭遇、误会闹剧或温馨治愈。
    3. 结构：起-承-转-合 (4个阶段)。
    4. **结局反转**：结局必须出人意料，具有幽默感。
    5. 字数：100字以内，精炼短小。
    6. 输出：直接输出故事内容，不要包含任何前言后语。
    `;

    messages = [
      {
        role: "user",
        content: [
          { type: "text", text: promptText },
          // 这里依赖你的中转服务将 OpenAI 的 image_url 转换为 Gemini 能识别的格式
          { 
            type: "image_url", 
            image_url: { url: `data:${mimeType};base64,${imageBase64}` } 
          }
        ]
      }
    ];
  } else {
    // === 模式 B: 纯文本随机故事 ===
    promptText = `
    作为一名脑洞大开的四格漫画编剧，请构思一个有趣且带有反转的四格漫画故事描述。
    要求：100字以内，起承转合，结局意想不到的幽默反转。直接输出故事。
    `;
    messages = [{ role: "user", content: promptText }];
  }

  try {
    const data = await fetchOpenAICompat({
      model: TEXT_MODEL,
      messages: messages,
      temperature: 0.95
    });
    // 假设中转服务返回标准的 OpenAI 格式
    return data.choices[0].message.content.trim();
  } catch (e) {
    console.error("生成故事失败:", e);
    throw e;
  }
};

/**
 * 功能 2: 将故事拆解为四格脚本 (使用新的 JSON 提取器)
 */
export const generateComicScript = async (storyDescription: string): Promise<string[]> => {
  const prompt = `
    You are an expert manga storyboard artist.
    Break down the following story into exactly 4 panels for a 4-koma comic strip.
    Story: "${storyDescription}"

    Rules:
    1. Output ONLY a JSON array of exactly 4 strings. No other text.
    2. Each string must be a detailed English visual description for the panel.
    3. Include character appearance, action, emotion, and background elements.
    4. If there is dialogue, specify it like: "Character says '...'".

    Example Output Format:
    ["Panel 1 visual description...", "Panel 2 visual...", "Panel 3...", "Panel 4..."]
  `;

  try {
    const data = await fetchOpenAICompat({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      // 尝试强制 JSON 模式，取决于中转站支持程度
      response_format: { type: "json_object" }
    });

    const content = data.choices[0].message.content;
    
    // 使用新的健壮提取器
    let parsed;
    try {
        parsed = extractJson(content);
    } catch (e: any) {
        console.warn("JSON解析失败，尝试按行分割降级处理:", e);
        // 降级处理：按行分割，清理空行和短行
        return content.split("\n")
            .map(l => l.trim())
            .filter((l: string) => l.length > 10 && !l.startsWith('[') && !l.startsWith(']'))
            .slice(0, 4);
    }

    // 兼容对象形式的返回 (比如 { "panels": [...] })
    if (Array.isArray(parsed)) return parsed.slice(0, 4);
    if (parsed.panels && Array.isArray(parsed.panels)) return parsed.panels.slice(0, 4);
    // 如果返回了 key-value 对象，取 values
    const values = Object.values(parsed);
    if (values.length >= 4 && typeof values[0] === 'string') return values.slice(0, 4) as string[];

    throw new Error("无法解析出4格脚本数组");

  } catch (e: any) {
    console.error("生成脚本失败:", e);
    // 返回占位符，避免整个流程崩溃
    return [
        `Failure: ${e.message || 'Script generation error'}. Create a generic scene.`,
        "Script error panel 2.",
        "Script error panel 3.",
        "Script error panel 4."
    ];
  }
};

/**
 * 功能 3: 生成单格图片 (已修复：加入参考图片，增强解析)
 */
export const generatePanelImage = async (
  referenceImageBase64: string, // 修复：移除下划线，正式使用此参数
  panelPrompt: string,
  mimeType: string
): Promise<string> => {

  // 风格提示词
  const styleHeader = "Style constraint: Consistent high-quality Japanese webtoon comic style. Clean digital line art, vibrant cel-shading colors.";
  const finalPrompt = `${styleHeader} Based on the reference image's character and style, create this scene: ${panelPrompt}. Ensure character consistency. Make it expressive and detailed.`;

  // 1. 构建 Gemini 原生请求体
  const parts: any[] = [];

  // 修复核心 1：如果有参考图，将其作为 inline_data 放入 parts 数组前面
  // 这样 Gemini 就会先“看”这张图
  if (referenceImageBase64 && mimeType) {
    parts.push({
        inline_data: {
            mime_type: mimeType,
            data: referenceImageBase64
        }
    });
  }

  // 然后放入文本提示词
  parts.push({ text: finalPrompt });

  const payload = {
    contents: [{ parts: parts }],
    // 显式指定输出格式
    generationConfig: {
        response_mime_type: "image/jpeg",
        // 如果图片总是太黄/暴被拦截，可以尝试降低 safety settings (需谨慎)
        // safetySettings: [
        //   { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        // ]
    }
  };

  try {
    // 发送请求到原生 endpoint
    const data = await fetchOpenAICompat(
      payload,
      '/v1beta/models/gemini-2.5-flash-image:generateContent'
    );

    // 2. 增强的响应解析与调试
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("API返回空结果，可能被安全策略完全拦截。");
    }

    const candidate = data.candidates[0];

    // 检查安全拦截
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
        console.warn("⚠️ 生图被拦截:", candidate.finishReason, candidate.safetyRatings);
        throw new Error(`无法生成图片，内容触发了安全审查 (${candidate.finishReason})。请尝试更换图片或提示词。`);
    }

    const firstPart = candidate.content?.parts?.[0];
    if (!firstPart) throw new Error("返回结构异常，未找到内容部分。");

    // 解析 Base64 数据 (优先匹配原生 inline_data)
    if (firstPart.inline_data?.data) return firstPart.inline_data.data;
    // 兼容某些代理可能转换的格式 (驼峰)
    // @ts-ignore
    if (firstPart.inlineData?.data) return firstPart.inlineData.data;

    // 最后的尝试：检查是否返回了文本错误信息
    if (firstPart.text) {
        console.error("模型返回文本而非图片:", firstPart.text);
        throw new Error("模型拒绝生成图片，返回了文本信息，请查看控制台。");
    }

    console.error("无法解析的 Candidate:", candidate);
    throw new Error("无法从响应中解析出图片数据。");

  } catch (e) {
    console.error("图片生成失败:", e);
    throw e;
  }
};

/**
 * 功能 4: 生成小红书文案 (修复：使用健壮的 JSON 提取器)
 */
export const generateXiaohongshuCopy = async (storyDescription: string): Promise<GeneratedCopy> => {
  const prompt = `
    You are a top Xiaohongshu (RED) creator. Write a viral post for this comic story.
    Story: "${storyDescription}"

    Rules:
    1. Output ONLY a JSON object. No other text.
    2. The JSON MUST have exactly these three keys: "title", "content", "tags".
    3. "title": Catchy, uses emojis, max 20 chars.
    4. "content": Engaging summary, uses emojis, Gen Z slang, ends with an interaction question. Max 200 chars.
    5. "tags": An array of 5-8 relevant string tags (e.g., ["#漫画", "#搞笑"]).
  `;

  try {
    const data = await fetchOpenAICompat({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const content = data.choices[0].message.content;
    
    // 修复核心 2：使用健壮的提取器
    const parsed = extractJson(content);

    // 简单的验证
    if (!parsed.title || !parsed.content || !Array.isArray(parsed.tags)) {
        console.warn("文案生成 JSON 结构不完整:", parsed);
        // 返回一个兜底数据，而不是抛错
        return {
            title: parsed.title || "AI漫画分享✨",
            content: parsed.content || storyDescription,
            tags: Array.isArray(parsed.tags) ? parsed.tags : ["#AI漫画"]
        };
    }

    return parsed as GeneratedCopy;

  } catch (e) {
    console.error("文案生成失败:", e);
    // 返回错误状态的兜底数据，确保 UI 不会崩溃
    return {
        title: "文案生成遇到问题 🤯",
        content: "抱歉，AI 在创作文案时卡壳了。请稍后再试，或者自己发挥一下！(Error: Failed to generate copy)",
        tags: ["#需要人工介入"]
    };
  }
};