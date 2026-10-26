export type RelationshipTier =
  | 'soul'
  | 'close'
  | 'friend'
  | 'acquaintance'
  | 'weak'
export type Influence = 'weak' | 'medium' | 'strong'
export type Intimacy = 'distant' | 'medium' | 'close'
export type PersonKind = 'contact' | 'reference'
export type CalendarType = 'gregorian' | 'lunar'
export type CustomFieldType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'date'
  | 'single_select'
  | 'multi_select'
export type GoalStatus = 'active' | 'achieved' | 'paused'
export type InteractionChannel = 'meeting' | 'call' | 'message' | 'other'
export type CoachState = 'due' | 'soon' | 'steady' | 'unset' | 'snoozed'
export type ClientCategory =
  | 'customer'
  | 'channel'
  | 'partner'
  | 'supplier'
  | 'competitor'

export interface Person {
  id: string
  kind: PersonKind
  fullName: string
  tier: RelationshipTier | null
  role: string
  occupation: string
  region: string
  industry: string
  influence: Influence | null
  intimacy: Intimacy | null
  influenceNote: string
  intimacyNote: string
  familySummary: string
  careerSummary: string
  company?: string
  school?: string
  major?: string
  notes: string
  cadenceDays: number | null
  snoozedUntil: string | null
  firstMetOn: string | null
  firstMetPlace: string
  firstMetStory: string
  avatarUrl: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Connection {
  id: string
  personAId: string
  personBId: string
  note: string
}

export interface Interaction {
  id: string
  personId: string
  occurredOn: string
  channel: InteractionChannel
  summary: string
  detailEntryId?: string | null
}

export interface FamilyMember {
  id: string
  personId: string
  name: string
  relation: string
  birthday: string | null
  note: string
}

export interface CareerEntry {
  id: string
  personId: string
  organization: string
  title: string
  school?: string
  major?: string
  startedOn: string | null
  endedOn: string | null
  note: string
}

export interface Goal {
  id: string
  personId: string
  title: string
  details?: string
  status: GoalStatus
  targetDate?: string | null
}

export interface ImportantDate {
  id: string
  personId: string
  label: string
  calendarType: CalendarType
  month: number
  day: number
  year: number | null
  isLeapMonth: boolean
  repeatAnnually: boolean
  note: string
}

export interface DetailEntry {
  id: string
  personId: string
  category: string
  content: string
  observedOn: string
  followUpOn: string | null
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  address: string
  categories: ClientCategory[]
  createdAt: string
  updatedAt: string
}

export type ContactAttitude = 'positive' | 'neutral' | 'negative'
export type ContactMethodType = 'phone' | 'email' | 'wechat' | 'other'

export interface ContactMethod {
  id: string
  type: ContactMethodType
  value: string
}

export interface ClientContact {
  id: string
  clientId: string
  personId: string | null
  name: string
  title: string
  influence: Influence | null
  attitude: ContactAttitude
  note: string
  methods: ContactMethod[]
  position: number
  createdAt: string
}

export type ClientArtifactKind = 'project' | 'product' | 'solution'

export interface ClientArtifact {
  id: string
  clientId: string
  kind: ClientArtifactKind
  name: string
  note: string
  industry: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface ClientSolutionProduct {
  id: string
  clientId: string
  solutionId: string
  productId: string
}

export interface ClientInteraction {
  id: string
  clientId: string
  occurredOn: string
  channel: InteractionChannel
  summary: string
  position: number
  createdAt: string
}

export interface ClientTodo {
  id: string
  clientId: string
  title: string
  done: boolean
  position: number
  createdAt: string
}

export interface Attachment {
  id: string
  personId: string
  detailEntryId: string | null
  interactionId?: string | null
  fileName: string
  mimeType: string
  size: number
  storagePath: string
  signedUrl?: string
  createdAt: string
}

export interface CustomFieldDefinition {
  id: string
  label: string
  type: CustomFieldType
  options: string[]
  displayOrder: number
  isActive: boolean
}

export interface CustomFieldValue {
  id: string
  personId: string
  fieldId: string
  value: string | number | string[] | null
}

export interface PersonBundle {
  person: Person
  familyMembers: FamilyMember[]
  careerEntries: CareerEntry[]
  goals: Goal[]
  importantDates: ImportantDate[]
  detailEntries: DetailEntry[]
  attachments: Attachment[]
  interactions: Interaction[]
  connections: Person[]
  customValues: CustomFieldValue[]
}

export interface ConnectionSummary {
  personId: string
  relatedPersonId: string
  relatedName: string
  relatedKind: PersonKind
  note: string
}

export interface DatabaseSnapshot {
  people: Person[]
  connections: Connection[]
  interactions: Interaction[]
  familyMembers: FamilyMember[]
  careerEntries: CareerEntry[]
  goals: Goal[]
  importantDates: ImportantDate[]
  detailEntries: DetailEntry[]
  attachments: Attachment[]
  clients: Client[]
  clientContacts: ClientContact[]
  clientArtifacts: ClientArtifact[]
  clientSolutionProducts: ClientSolutionProduct[]
  clientInteractions: ClientInteraction[]
  clientTodos: ClientTodo[]
  customFields: CustomFieldDefinition[]
  customValues: CustomFieldValue[]
}

export interface CoachStatus {
  state: CoachState
  label: string
  reason: string
  daysUntilDue: number | null
  priority: number
}

export interface ImportedRow {
  rowNumber: number
  fullName: string
  tier: RelationshipTier | null
  values: Record<string, string>
  duplicatePersonId: string | null
  errors: string[]
}

export interface ImportPreview {
  headers: string[]
  rows: ImportedRow[]
}

export const tierLabels: Record<RelationshipTier, string> = {
  soul: '命友',
  close: '密友',
  friend: '好友',
  acquaintance: '认识的人',
  weak: '弱连接',
}

export const influenceLabels: Record<Influence, string> = {
  weak: '弱',
  medium: '中',
  strong: '强',
}

export const intimacyLabels: Record<Intimacy, string> = {
  distant: '疏',
  medium: '中',
  close: '密',
}

export const channelLabels: Record<InteractionChannel, string> = {
  meeting: '见面',
  call: '通话',
  message: '消息',
  other: '其他',
}

export const clientCategoryLabels: Record<ClientCategory, string> = {
  customer: '客户',
  channel: '渠道',
  partner: '伙伴',
  supplier: '供应商',
  competitor: '友商',
}

export const clientArtifactLabels: Record<ClientArtifactKind, string> = {
  project: '项目',
  product: '产品',
  solution: '方案',
}

export const contactAttitudeLabels: Record<ContactAttitude, string> = {
  positive: '正向',
  neutral: '中立',
  negative: '负向',
}

export const contactMethodLabels: Record<ContactMethodType, string> = {
  phone: '电话',
  email: '邮箱',
  wechat: '微信',
  other: '其他',
}
