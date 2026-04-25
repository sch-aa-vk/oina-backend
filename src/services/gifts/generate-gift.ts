import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { GenerateGiftPayload, GenerateGiftResponse, GiftRecord } from '../../types/gift.types';
import { Errors } from '../../utils/errors';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const ssmClient = new SSMClient({});

const GIFTS_TABLE = process.env.DYNAMODB_GIFTS_TABLE!;
const GIFTS_BUCKET = process.env.GIFTS_BUCKET_NAME!;
const GEMINI_API_KEY_PARAM = process.env.GEMINI_API_KEY_PARAM!;

let cachedApiKey: string | null = null;

async function getGeminiApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const param = await ssmClient.send(new GetParameterCommand({
    Name: GEMINI_API_KEY_PARAM,
    WithDecryption: true,
  }));
  const apiKey = param.Parameter!.Value!;
  cachedApiKey = apiKey;
  return apiKey;
}

function buildGiftPrompt(payload: GenerateGiftPayload): string {
  const isValentineYesNoTemplate = payload.templateLabel === 'Valentine Playful Yes/No';

  return `You are an expert creative web designer specialising in emotional, personalised gift experiences.

## TASK
Generate a complete, self-contained HTML gift webpage for the recipient described below.

## OUTPUT RULES (non-negotiable)
- Output ONLY raw HTML. No markdown, no backticks, no prose explanation, no code fences.
- All CSS must be embedded inside <style> tags within <head>.
- All JavaScript must be embedded inside <script> tags just before </body>.
- No external images or external CSS files.
- Google Fonts may be loaded via CSS @import inside a <style> block — never via a <link> tag.

## VISUAL QUALITY CHECKLIST (satisfy every item)
- Load 2–3 Google Fonts via @import and use them intentionally (display vs body vs accent).
- Define at least 3 distinct CSS @keyframe animations: entrance, ambient loop, and an interaction response.
- Use emoji decorations purposefully — consistent sizing, spacing, and placement that feels designed, not scattered.
- Build a cohesive color palette with 1–2 dominant colors and 1 sharp accent; derive all shades from CSS custom properties.
- Establish clear typographic hierarchy: headline → subheading → body → call-to-action.
- Every interactive element must have a visible :hover and :focus-visible state.

## RESPONSIVENESS — verify each rule before outputting
- <meta name="viewport" content="width=device-width, initial-scale=1.0"> must be present in <head>.
- Mobile-first CSS: base styles target 375px; larger screens override with min-width media queries.
- Breakpoints required: 480px, 768px, 1024px.
- All font sizes must use clamp(min, preferred-vw, max) — never bare px for type.
- All layout spacing uses clamp() or rem — never fixed px for gaps, padding, or margins.
- No element causes horizontal scroll on a 375px viewport.
- Buttons and tap targets must be at minimum 44px tall on mobile.
- Images: max-width:100%; height:auto; object-fit:cover where aspect ratio matters.
- All layout uses flexbox or CSS grid with fluid sizing — no float-based or table-based layouts.

## ACCESSIBILITY BASELINE
- All images have descriptive alt text.
- Color contrast between text and background meets WCAG AA (4.5:1 for body, 3:1 for large text).
- Interactive elements are keyboard-focusable and show a visible focus ring.
- Semantic HTML: use <main>, <section>, <header>, <footer>, <h1>–<h3>, <button>, <figure> appropriately.

## THEME
- Name: ${payload.themeName}
- Art direction: ${payload.themeDirection}

## TEMPLATE
- Label: ${payload.templateLabel}
- Blueprint: ${payload.templateBlueprint}

## VARIATION
- Label: ${payload.variationLabel}
- Style: ${payload.variationDescription}
- Blueprint: ${payload.variationBlueprint}

${isValentineYesNoTemplate ? `## VALENTINE YES/NO INTERACTION RULES
- YES and NO buttons must both be visible and tappable on mobile AND desktop before a choice is made.
- The memory gallery must render ONLY after the user taps YES — never before, never on NO.
- Gallery must appear as the very last section, flowing below the success state with at least 32px vertical margin.
- Gallery must NEVER overlap, float over, or sit above any other element.
- Neither the success state nor the gallery may use position:fixed or position:absolute.
- Both must remain in normal document flow at all times.` : ''}

## GIFT DETAILS
- Recipient name: ${payload.recipientName}
- Occasion: ${payload.occasion}
- Personal message: "${payload.personalMessage}"
- Emotional tone: ${payload.tone}

## STEP-BY-STEP PROCESS
Before writing any HTML, reason through these steps internally:
1. Choose a layout structure that fits the template blueprint and works on mobile first.
2. Plan the color palette (dominant, background, accent, text) and assign CSS custom properties.
3. Select font pairings that match the theme's emotional tone.
4. Decide which three animations best serve the occasion and tone.
5. Map the template blueprint to semantic HTML sections.
6. Write the complete HTML.
7. Mentally validate every item in the RESPONSIVENESS and VISUAL QUALITY checklists before outputting.

Output only the final HTML — no thinking text, no explanation.`;
}

function extractHtml(text: string): string {
  let trimmed = text.trim();

  const fenced = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();

  const htmlStart = trimmed.search(/<!doctype\s+html|<html[\s>]/i);
  if (htmlStart > 0) trimmed = trimmed.slice(htmlStart);

  const htmlEnd = trimmed.search(/<\/html>/i);
  if (htmlEnd !== -1) trimmed = trimmed.slice(0, htmlEnd + 7);

  return trimmed;
}

export async function generateGift(userId: string, payload: GenerateGiftPayload): Promise<GenerateGiftResponse> {
  const apiKey = await getGeminiApiKey();
  const prompt = buildGiftPrompt(payload);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 8192 },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw Errors.GEMINI_API_ERROR(`Gemini returned ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw Errors.GEMINI_API_ERROR('Gemini response was empty or malformed');
  }

  const html = extractHtml(rawText);
  if (!html) {
    throw Errors.GEMINI_API_ERROR('Could not extract HTML from Gemini response');
  }

  const giftId = crypto.randomUUID();
  const s3Key = `gifts/${giftId}.html`;

  await s3Client.send(new PutObjectCommand({
    Bucket: GIFTS_BUCKET,
    Key: s3Key,
    Body: html,
    ContentType: 'text/html',
  }));

  const record: GiftRecord = {
    giftId,
    userId,
    recipientName: payload.recipientName,
    occasion: payload.occasion,
    s3Key,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: GIFTS_TABLE,
    Item: record,
    ConditionExpression: 'attribute_not_exists(giftId)',
  }));

  return { giftId };
}
