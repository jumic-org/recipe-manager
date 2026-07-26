import type {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { Ingredient, Aisle } from '@recipe-manager/shared';
import { bedrockClient, response, getUserId } from '../shared';

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return response(204);
  }

  try {
    const userId = getUserId(event);
    if (!userId) {
      return response(401, { message: 'Unauthorized' });
    }

    const path = event.path;
    const method = event.httpMethod;

    // POST /sort-ingredients - sort ingredients into supermarket aisles using AI
    if (path === '/sort-ingredients' && method === 'POST') {
      return await sortIngredients(event);
    }

    // POST /sort-ingredients-prompt - get the generated prompts without calling AI
    if (path === '/sort-ingredients-prompt' && method === 'POST') {
      return await sortIngredientsPrompt(event);
    }

    // POST /sort-ingredients-manual - sort ingredients with custom prompts/parameters
    if (path === '/sort-ingredients-manual' && method === 'POST') {
      return await sortIngredientsManual(event);
    }

    return response(404, { message: 'Route not found' });
  } catch (error) {
    console.error('Unhandled error:', error);
    return response(500, { message: 'Internal server error' });
  }
};

function generateSortPrompts(
  ingredients: Ingredient[],
  aisles: Aisle[],
  language: string,
): { systemPrompt: string; userPrompt: string } {
  // Format aisles for the prompt, including comments as product examples
  const formatAisle = (aisle: Aisle, index: number): string => {
    if (aisle.comment) {
      return `${index + 1}. ${aisle.name} (${aisle.comment})`;
    }
    return `${index + 1}. ${aisle.name}`;
  };

  const systemPrompt = '';
  let userPrompt: string;

  if (language === 'de') {
    userPrompt = `Du bist Angestellter im Supermarkt und solst den Kunden helfen, die Produkte schnell zu finden. Du erhälst die Supermarkt-Gänge zu einem spezifischen Supermarkt und die Produkte, die gekauft werden sollen. Ordne diese Produkte den Gängen zu.

Gehe jedes Produkt durch und entscheide, in welchem Gang es am wahrscheinlichsten zu finden ist. Ordne es genau diesem Gang zu. Findest du keinen passenden Gang, füge es am Ende under "Unknown" hinzu. In den Gängen sind in Klammern kommentare ergänzt, wie z.B. weitere Produkte, die dort zu finden sind. Berücksichtige dies.
Lösche die Gänge, zu denen kein Produkt zugeordnet ist.
Gib jeweils den Gang aus und darunter eine Auflistung der Produkte, die dort gekauft werden sollen.
Als Ergebnis gib ein JSON Format zurück: [{"aisle": "Obst und Gemüse", "products": ["Apfel", "Bierne"]}, {"aisle": "Milchprodukte", "products": ["Erdbeerjoghurt"]}, {"aisle": "UNKNWON", "products": ["Flugzeug"]}]
Gib keine Erklärung zurück, nur das JSON. Bei den Supermarkt Gängen, lass die Kommentare in Klammern weg.

Supermarkt-Gänge
${aisles.map((a, i) => formatAisle(a, i)).join('\n')}

Produkte:
${ingredients.map((ing, i) => `${i + 1}. ${ing.name}`).join('\n')}`;
  } else {
    userPrompt = `You are a supermarket employee and should help customers find products quickly. You receive the supermarket aisles for a specific supermarket and the products that need to be purchased. Assign these products to the aisles.

Go through each product and decide which aisle it is most likely to be found in. Assign it to exactly that aisle. If you cannot find a matching aisle, add it at the end under "Unknown". The aisles have comments in parentheses, such as additional products that can be found there. Take this into account.
Remove aisles to which no product is assigned.
Output each aisle and below it a list of products to be purchased there.
As a result, return a JSON format: [{"aisle": "Fruits and Vegetables", "products": ["Apple", "Pear"]}, {"aisle": "Dairy", "products": ["Strawberry Yogurt"]}, {"aisle": "UNKNOWN", "products": ["Airplane"]}]
Do not return any explanation, only the JSON. For the supermarket aisles, leave out the comments in parentheses.

Supermarket Aisles
${aisles.map((a, i) => formatAisle(a, i)).join('\n')}

Products:
${ingredients.map((ing, i) => `${i + 1}. ${ing.name}`).join('\n')}`;
  }

  return { systemPrompt, userPrompt };
}

async function sortIngredientsPrompt(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { message: 'Request body is required' });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return response(400, { message: 'Invalid JSON in request body' });
  }

  if (!Array.isArray(parsed['ingredients']) || parsed['ingredients'].length === 0) {
    return response(400, { message: 'ingredients is required and must be a non-empty array' });
  }

  if (!Array.isArray(parsed['aisles']) || parsed['aisles'].length === 0) {
    return response(400, { message: 'aisles is required and must be a non-empty array' });
  }

  const ingredients = parsed['ingredients'] as Ingredient[];
  const rawAisles = parsed['aisles'] as (string | { name: string; comment?: string })[];
  const language = (parsed['language'] as string) || 'en';

  // Normalize aisles: support both string[] (legacy) and Aisle[] formats
  const aisles: Aisle[] = rawAisles.map((a) => {
    if (typeof a === 'string') {
      return { name: a };
    }
    return { name: a.name, comment: a.comment };
  });

  const { systemPrompt, userPrompt } = generateSortPrompts(ingredients, aisles, language);

  return response(200, { systemPrompt, userPrompt });
}

async function sortIngredients(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { message: 'Request body is required' });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return response(400, { message: 'Invalid JSON in request body' });
  }

  if (!Array.isArray(parsed['ingredients']) || parsed['ingredients'].length === 0) {
    return response(400, { message: 'ingredients is required and must be a non-empty array' });
  }

  if (!Array.isArray(parsed['aisles']) || parsed['aisles'].length === 0) {
    return response(400, { message: 'aisles is required and must be a non-empty array' });
  }

  const ingredients = parsed['ingredients'] as Ingredient[];
  const rawAisles = parsed['aisles'] as (string | { name: string; comment?: string })[];
  const language = (parsed['language'] as string) || 'en';

  // Normalize aisles: support both string[] (legacy) and Aisle[] formats
  const aisles: Aisle[] = rawAisles.map((a) => {
    if (typeof a === 'string') {
      return { name: a };
    }
    return { name: a.name, comment: a.comment };
  });

  const { systemPrompt: system, userPrompt: prompt } = generateSortPrompts(ingredients, aisles, language);

  console.log('sort-ingredients request:', JSON.stringify({ language, aisles: aisles.map((a) => a.name), ingredientCount: ingredients.length }));
  console.log('sort-ingredients system prompt:', system);
  console.log('sort-ingredients user prompt:', prompt);

  try {
    const bedrockBody: Record<string, unknown> = {
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 4096, temperature: 0.1 },
    };
    if (system) {
      bedrockBody['system'] = [{ text: system }];
    }

    const bedrockResponse = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: 'eu.amazon.nova-lite-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(bedrockBody),
      }),
    );

    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
    const outputText = responseBody['output']?.['message']?.['content']?.[0]?.['text'];

    console.log('sort-ingredients Bedrock response:', outputText);

    if (!outputText) {
      console.error('Unexpected Bedrock response structure:', JSON.stringify(responseBody));
      return response(502, { message: 'Failed to get a valid response from AI model' });
    }

    // Parse the JSON from the model output (handle potential markdown code blocks)
    let jsonText = outputText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const parsedJson = JSON.parse(jsonText);

    // Handle both formats: {"groups":[...]} or bare array [...]
    const rawGroups: { aisle: string; products?: (string | number)[]; ingredientIndices?: number[] }[] = Array.isArray(parsedJson)
      ? parsedJson
      : parsedJson.groups ?? [];

    // Map products/indices back to actual ingredients
    const groups: { aisle: string; ingredients: Ingredient[] }[] = [];
    const matchedIndices = new Set<number>();
    for (const group of rawGroups) {
      const groupIngredients: Ingredient[] = [];
      const products: (string | number)[] = group.products || group.ingredientIndices || [];
      for (const product of products) {
        if (typeof product === 'number') {
          // Legacy index format
          if (product >= 0 && product < ingredients.length && !matchedIndices.has(product)) {
            groupIngredients.push(ingredients[product]);
            matchedIndices.add(product);
          }
        } else {
          // New name-based format
          const lowerProduct = product.toLowerCase();
          const idx = ingredients.findIndex((ing, i) =>
            !matchedIndices.has(i) && (
              ing.name.toLowerCase() === lowerProduct ||
              ing.name.toLowerCase().includes(lowerProduct) ||
              lowerProduct.includes(ing.name.toLowerCase())
            )
          );
          if (idx >= 0) {
            groupIngredients.push(ingredients[idx]);
            matchedIndices.add(idx);
          }
        }
      }
      if (groupIngredients.length > 0) {
        groups.push({ aisle: group.aisle, ingredients: groupIngredients });
      }
    }

    return response(200, { groups });
  } catch (error) {
    console.error('Error calling Bedrock for sort-ingredients:', error);
    return response(502, { message: 'Failed to sort ingredients using AI model' });
  }
}

async function sortIngredientsManual(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { message: 'Request body is required' });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return response(400, { message: 'Invalid JSON in request body' });
  }

  if (typeof parsed['systemPrompt'] !== 'string') {
    return response(400, { message: 'systemPrompt is required and must be a string' });
  }

  if (!parsed['userPrompt'] || typeof parsed['userPrompt'] !== 'string') {
    return response(400, { message: 'userPrompt is required and must be a string' });
  }

  if (typeof parsed['temperature'] !== 'number' || parsed['temperature'] < 0 || parsed['temperature'] > 1) {
    return response(400, { message: 'temperature is required and must be a number between 0 and 1' });
  }

  if (typeof parsed['maxTokens'] !== 'number' || parsed['maxTokens'] < 1) {
    return response(400, { message: 'maxTokens is required and must be a positive number' });
  }

  if (!Array.isArray(parsed['ingredients']) || parsed['ingredients'].length === 0) {
    return response(400, { message: 'ingredients is required and must be a non-empty array' });
  }

  if (!Array.isArray(parsed['aisles']) || parsed['aisles'].length === 0) {
    return response(400, { message: 'aisles is required and must be a non-empty array' });
  }

  const systemPrompt = parsed['systemPrompt'] as string;
  const userPrompt = parsed['userPrompt'] as string;
  const temperature = parsed['temperature'] as number;
  const maxTokens = parsed['maxTokens'] as number;
  const ingredients = parsed['ingredients'] as Ingredient[];

  console.log('sort-ingredients-manual request:', JSON.stringify({ temperature, maxTokens, ingredientCount: ingredients.length }));
  console.log('sort-ingredients-manual system prompt:', systemPrompt);
  console.log('sort-ingredients-manual user prompt:', userPrompt);

  try {
    const bedrockBody: Record<string, unknown> = {
      messages: [{ role: 'user', content: [{ text: userPrompt }] }],
      inferenceConfig: { maxTokens, temperature },
    };
    if (systemPrompt) {
      bedrockBody['system'] = [{ text: systemPrompt }];
    }

    const bedrockResponse = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: 'eu.amazon.nova-lite-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(bedrockBody),
      }),
    );

    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
    const outputText = responseBody['output']?.['message']?.['content']?.[0]?.['text'];

    console.log('sort-ingredients-manual Bedrock response:', outputText);

    if (!outputText) {
      console.error('Unexpected Bedrock response structure:', JSON.stringify(responseBody));
      return response(502, { message: 'Failed to get a valid response from AI model', rawResponse: '' });
    }

    // Parse the JSON from the model output (handle potential markdown code blocks)
    let jsonText = outputText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const parsedJson = JSON.parse(jsonText);

    // Handle both formats: {"groups":[...]} or bare array [...]
    const rawGroups: { aisle: string; products?: (string | number)[]; ingredientIndices?: number[] }[] = Array.isArray(parsedJson)
      ? parsedJson
      : parsedJson.groups ?? [];

    // Map products/indices back to actual ingredients
    const groups: { aisle: string; ingredients: Ingredient[] }[] = [];
    const matchedIndices = new Set<number>();
    for (const group of rawGroups) {
      const groupIngredients: Ingredient[] = [];
      const products: (string | number)[] = group.products || group.ingredientIndices || [];
      for (const product of products) {
        if (typeof product === 'number') {
          // Legacy index format
          if (product >= 0 && product < ingredients.length && !matchedIndices.has(product)) {
            groupIngredients.push(ingredients[product]);
            matchedIndices.add(product);
          }
        } else {
          // New name-based format
          const lowerProduct = product.toLowerCase();
          const idx = ingredients.findIndex((ing, i) =>
            !matchedIndices.has(i) && (
              ing.name.toLowerCase() === lowerProduct ||
              ing.name.toLowerCase().includes(lowerProduct) ||
              lowerProduct.includes(ing.name.toLowerCase())
            )
          );
          if (idx >= 0) {
            groupIngredients.push(ingredients[idx]);
            matchedIndices.add(idx);
          }
        }
      }
      if (groupIngredients.length > 0) {
        groups.push({ aisle: group.aisle, ingredients: groupIngredients });
      }
    }

    return response(200, { groups, rawResponse: outputText });
  } catch (error) {
    console.error('Error calling Bedrock for sort-ingredients-manual:', error);
    return response(502, { message: 'Failed to sort ingredients using AI model', rawResponse: '' });
  }
}
