import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

const BEDROCK_REGION = process.env['BEDROCK_REGION'] ?? process.env['AWS_REGION'] ?? 'eu-central-1';
export const bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_REGION });
