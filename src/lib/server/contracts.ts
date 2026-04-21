import { z } from 'zod';
import { ALL_TOKEN_IDS, TOKEN_GROUP_ORDER } from '$lib/theme/schema';
import type {
  AltSettings,
  LocalAlias,
  OklchColor,
  ProjectConfig,
  ThemeManifest,
  ThemeToken,
  TokenException,
  TokenGroup,
  TokenId
} from '$lib/theme/schema';

const TOKEN_ROLES = ['neutral', 'accent', 'status', 'control'] as const;
const ALT_BEHAVIORS = ['derive', 'pin', 'exclude'] as const;

const tokenIdSchema = z.custom<TokenId>(
  (value) => typeof value === 'string' && ALL_TOKEN_IDS.includes(value as TokenId),
  'Invalid token id'
);

const tokenGroupSchema = z.custom<TokenGroup>(
  (value) => typeof value === 'string' && TOKEN_GROUP_ORDER.includes(value as TokenGroup),
  'Invalid token group'
);

const oklchColorSchema: z.ZodType<OklchColor> = z
  .object({
    l: z.number().finite(),
    c: z.number().finite(),
    h: z.number().finite(),
    alpha: z.number().finite().optional()
  })
  .strict();

const tokenExceptionSchema: z.ZodType<TokenException> = z
  .object({
    altBehavior: z.enum(ALT_BEHAVIORS),
    maxChroma: z.number().finite().nullable().optional()
  })
  .strict();

const themeTokenSchema: z.ZodType<ThemeToken> = z
  .object({
    id: tokenIdSchema,
    label: z.string(),
    description: z.string(),
    group: tokenGroupSchema,
    role: z.enum(TOKEN_ROLES),
    light: oklchColorSchema,
    dark: oklchColorSchema,
    altParent: tokenIdSchema.optional(),
    harmonyGroup: z.string().optional(),
    exception: tokenExceptionSchema
  })
  .strict();

const manifestTokensShape = Object.fromEntries(
  ALL_TOKEN_IDS.map((tokenId) => [
    tokenId,
    themeTokenSchema.refine((token) => token.id === tokenId, {
      message: `Token "${tokenId}" must declare a matching id`
    })
  ])
) as Record<string, z.ZodTypeAny>;

const localAliasSchema: z.ZodType<LocalAlias> = z
  .object({
    name: z.string().trim().min(1),
    tokenId: tokenIdSchema
  })
  .strict();

const altSettingsSchema: z.ZodType<AltSettings> = z
  .object({
    source: z.enum(['light', 'dark']),
    delta: z
      .object({
        l: z.number().finite(),
        c: z.number().finite(),
        h: z.number().finite()
      })
      .strict(),
    harmonyLock: z.boolean(),
    grayscalePreview: z.boolean()
  })
  .strict();

const manifestTokensSchema = z.object(manifestTokensShape).strict() as z.ZodType<
  ThemeManifest['tokens']
>;

const projectConfigSchema: z.ZodType<ProjectConfig> = z
  .object({
    version: z.literal(1),
    projectRoot: z.string(),
    bridgeEnabled: z.boolean(),
    manifestPath: z.string().trim().min(1),
    cssOutputPath: z.string().trim().min(1),
    importSourcePath: z.string(),
    selectorStrategy: z.literal('data-theme')
  })
  .strict();

const themeManifestSchema: z.ZodType<ThemeManifest> = z
  .object({
    version: z.literal(1),
    name: z.string(),
    updatedAt: z.string(),
    alt: altSettingsSchema,
    tokens: manifestTokensSchema,
    aliases: z.array(localAliasSchema)
  })
  .strict();

export const loadProjectQuerySchema = z
  .object({
    configPath: z.string().trim().min(1).optional()
  })
  .strict();

export const saveProjectRequestSchema = z
  .object({
    configPath: z.string().trim().min(1),
    config: projectConfigSchema,
    manifest: themeManifestSchema
  })
  .strict();

export const importProjectRequestSchema = z
  .object({
    configPath: z.string().trim().min(1),
    sourcePath: z.string().trim().min(1)
  })
  .strict();
