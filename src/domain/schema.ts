import { z } from 'zod'

export const relationshipTierSchema = z.enum([
  'soul',
  'close',
  'friend',
  'acquaintance',
])

export const influenceSchema = z.enum(['weak', 'medium', 'strong'])
export const intimacySchema = z.enum(['distant', 'medium', 'close'])
export const calendarTypeSchema = z.enum(['gregorian', 'lunar'])

export const personInputSchema = z
  .object({
    kind: z.enum(['contact', 'reference']),
    fullName: z.string().trim().min(1, '请填写姓名'),
    tier: relationshipTierSchema.nullable(),
    role: z.string().trim().default(''),
    occupation: z.string().trim().default(''),
    region: z.string().trim().default(''),
    industry: z.string().trim().default(''),
    influence: influenceSchema.nullable().default(null),
    intimacy: intimacySchema.nullable().default(null),
    cadenceDays: z.number().int().positive().nullable().default(null),
    notes: z.string().trim().default(''),
  })
  .refine((value) => (value.kind === 'contact' ? value.tier !== null : value.tier === null), {
    message: '正式联系人必须选择关系层级，引用人物不设置层级',
    path: ['tier'],
  })

export const customFieldSchema = z
  .object({
    label: z.string().trim().min(1, '请填写维度名称'),
    type: z.enum([
      'text',
      'long_text',
      'number',
      'date',
      'single_select',
      'multi_select',
    ]),
    options: z.array(z.string().trim().min(1)).default([]),
  })
  .refine(
    (value) =>
      !['single_select', 'multi_select'].includes(value.type) ||
      value.options.length > 0,
    { message: '选择类型至少需要一个选项', path: ['options'] },
  )

export const detailEntrySchema = z.object({
  category: z.string().trim().min(1, '请填写类别'),
  content: z.string().trim().min(1, '请写下要记住的细节'),
  observedOn: z.string().min(1),
  followUpOn: z.string().nullable().default(null),
})
