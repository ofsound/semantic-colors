import { z } from 'zod';
import {
  localAliasSchema,
  oklchColorSchema,
  themeManifestSchema,
  tokenIdSchema
} from '$lib/theme/theme-manifest-zod';
import type { ImportProposal, ProjectConfig } from '$lib/theme/schema';

const ALT_BEHAVIORS = ['derive', 'pin', 'exclude'] as const;

export { themeManifestSchema };

export const projectConfigSchema: z.ZodType<ProjectConfig> = z
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

const importCandidateSchema = z
  .object({
    sourceName: z.string(),
    rawValue: z.string(),
    suggestedTokenId: tokenIdSchema.nullable(),
    confidence: z.number().finite(),
    reason: z.string(),
    light: oklchColorSchema.nullable().optional(),
    dark: oklchColorSchema.nullable().optional()
  })
  .strict() as z.ZodType<ImportProposal['candidates'][number]>;

const importProposalSchema = z
  .object({
    sourcePath: z.string(),
    candidates: z.array(importCandidateSchema)
  })
  .strict() as z.ZodType<ImportProposal>;

const updateTokenColorCommandSchema = z
  .object({
    kind: z.literal('update-token-color'),
    tokenId: tokenIdSchema,
    mode: z.enum(['light', 'dark', 'both']),
    color: oklchColorSchema
  })
  .strict();

const updateTokenExceptionCommandSchema = z
  .object({
    kind: z.literal('update-token-exception'),
    tokenId: tokenIdSchema,
    patch: z
      .object({
        altBehavior: z.enum(ALT_BEHAVIORS).optional(),
        maxChroma: z.number().finite().nullable().optional()
      })
      .strict()
  })
  .strict();

const updateAltSettingsCommandSchema = z
  .object({
    kind: z.literal('update-alt-settings'),
    patch: z
      .object({
        source: z.enum(['light', 'dark']).optional(),
        harmonyLock: z.boolean().optional(),
        grayscalePreview: z.boolean().optional(),
        delta: z
          .object({
            l: z.number().finite().optional(),
            c: z.number().finite().optional(),
            h: z.number().finite().optional()
          })
          .strict()
          .optional()
      })
      .strict()
  })
  .strict();

const addAliasCommandSchema = z
  .object({
    kind: z.literal('add-alias'),
    alias: localAliasSchema
  })
  .strict();

const updateAliasCommandSchema = z
  .object({
    kind: z.literal('update-alias'),
    index: z.number().int().min(0),
    patch: z
      .object({
        name: z.string().trim().min(1).optional(),
        tokenId: tokenIdSchema.optional()
      })
      .strict()
  })
  .strict();

const removeAliasCommandSchema = z
  .object({
    kind: z.literal('remove-alias'),
    index: z.number().int().min(0)
  })
  .strict();

const resetManifestCommandSchema = z
  .object({
    kind: z.literal('reset-manifest')
  })
  .strict();

const applyImportReviewCommandSchema = z
  .object({
    kind: z.literal('apply-import-review'),
    proposal: importProposalSchema,
    selection: z.record(z.string(), z.union([tokenIdSchema, z.literal('')]))
  })
  .strict();

const bridgeDraftCommandSchema = z.discriminatedUnion('kind', [
  updateTokenColorCommandSchema,
  updateTokenExceptionCommandSchema,
  updateAltSettingsCommandSchema,
  addAliasCommandSchema,
  updateAliasCommandSchema,
  removeAliasCommandSchema,
  resetManifestCommandSchema,
  applyImportReviewCommandSchema
]);

export const bridgeDraftRequestSchema = z
  .object({
    configPath: z.string().trim().min(1),
    commands: z.array(bridgeDraftCommandSchema).min(1)
  })
  .strict();

export const bridgeCommitRequestSchema = z
  .object({
    configPath: z.string().trim().min(1)
  })
  .strict();

export const bridgeConfigQuerySchema = z
  .object({
    configPath: z.string().trim().min(1)
  })
  .strict();

export const bridgeConfigUpdateRequestSchema = z
  .object({
    configPath: z.string().trim().min(1),
    bridgeEnabled: z.boolean()
  })
  .strict();
