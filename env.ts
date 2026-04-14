/* biome-ignore-all lint/style/noProcessEnv: It's correct to access environment variables here */

import { z } from 'zod';
import path from 'node:path';
import dotenv from '@dotenvx/dotenvx';

dotenv.config({
  path: [path.resolve(__dirname, '.env.local'), path.resolve(__dirname, '.env')],
  ignore: ['MISSING_ENV_FILE'],
  quiet: true
});

const schema = z.object({
  NEXT_PUBLIC_BACKEND_API_URL: z.string()
});

export const env = schema.parse({ NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL });
