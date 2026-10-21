import {
  CalendarDays,
  ChevronDown,
  DatabaseBackup,
  Filter,
  Pencil,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { differenceInCalendarDays, format } from 'date-fns'
import { getArchiveColumns } from '../../domain/archive'
import {
  getSurnameInitial,
  sortBySurname,
} from '../../domain/alphabet'
import { getCoachStatus } from '../../domain/coach'
import { getUpcomingDates } from '../../domain/dates'
import {
  listRegionValues,
  matchesRegion,
} from '../../domain/locations'
import { matchesPersonSearch } from '../../domain/search'
import {
  influenceLabels,
  intimacyLabels,
  tierLabels,
  type Person,
  type RelationshipTier,
} from '../../domain/types'
import { createPersonRecord, getPersonBundle, listActiveContacts } from '../../domain/workspace'
import { useWorkspace } from '../../app/WorkspaceContext'
import { PersonDialog } from './PersonDialog'

const tiers: RelationshipTier[] = ['soul', 'close', 'friend', 'acquaintance']
type CoachRange = 'today' | 'week' | 'month'

const coachRanges: Array<{
  value: CoachRange
  label: string
  title: string
  maxDays: number
}> = [
  { value: 'today', label: '今天', title: '今天可以想起谁', maxDays: 0 },
  {
    value: 'week',
    label: '未来7天',
    title: '未来7天可以想起谁',
    maxDays: 7,
  },
  {
    value: 'month',
    label: '未来30天',
    title: '未来30天可以想起谁',
    maxDays: 30,
  },
]

const columnLabels: Record<string, string> = {
  fullName: '姓名',
  role: '角色',
  occupation: '职业',
  region: '地区',
  industry: '行业',
  influence: '影响力',
  intimacy: '亲密度',
  coach: '联系状态',
}

const defaultColumnWidths: Record<string, number> = {
  fullName: 220,
  role: 160,
  occupation: 170,
  region: 130,
  industry: 160,
  influence: 110,
  intimacy: 110,
  coach: 140,
}

export function ArchivePage() {
  const { snapshot, update } = useWorkspace()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTier = searchParams.get('tier')
  const [tier, setTier] = useState<RelationshipTier>(
    tiers.includes(requestedTier as RelationshipTier)
      ? (requestedTier as RelationshipTier)
      : 'soul',
  )
  const [query, setQuery] = useState('')
  const [detailsExpanded, setDetailsExpanded] = useState<
    Record<RelationshipTier, boolean>
  >(() => ({
    soul: true,
    close: true,
    friend: true,
    acquaintance:
      localStorage.getItem('show-acquaintance-details') === 'true',
  }))
  const [regionFilter, setRegionFilter] = useState('')
  const [influenceFilter, setInfluenceFilter] = useState('')
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [coachRange, setCoachRange] = useState<CoachRange>('today')
  const [visibleCustomFieldIds, setVisibleCustomFieldIds] = useState<string[]>(
    () => {
      try {
        return JSON.parse(
          localStorage.getItem('visible-custom-fields') ?? '[]',
        ) as string[]
      } catch {
        return []
      }
    },
  )
  const [tableEditing, setTableEditing] = useState(false)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      try {
        return JSON.parse(
          localStorage.getItem('archive-column-widths-v1') ?? '{}',
        ) as Record<string, number>
      } catch {
        return {}
      }
    },
  )

  const today = format(new Date(), 'yyyy-MM-dd')
  const contacts = listActiveContacts(snapshot)
  const regionOptions = listRegionValues(contacts.map((item) => item.region))
  const tiersCount = Object.fromEntries(
    tiers.map((item) => [item, contacts.filter((person) => person.tier === item).length]),
  ) as Record<RelationshipTier, number>

  const allBundles = useMemo(
    () =>
      contacts
        .map((person) => getPersonBundle(snapshot, person.id))
        .filter((bundle) => bundle !== null),
    [contacts, snapshot],
  )

  const filteredContacts = useMemo(() => {
    const source = query.trim()
      ? allBundles.filter((bundle) => matchesPersonSearch(bundle, query))
      : allBundles.filter((bundle) => bundle.person.tier === tier)
    return sortBySurname(
      source
        .map((bundle) => bundle.person)
        .filter((person) => matchesRegion(person.region, regionFilter))
        .filter(
          (person) =>
            !influenceFilter || person.influence === influenceFilter,
        ),
    )
  }, [allBundles, query, tier, regionFilter, influenceFilter])

  const showDetails = detailsExpanded[tier]
  const columns =
    query.trim()
      ? getArchiveColumns(
          true,
          snapshot.customFields.filter((field) =>
            visibleCustomFieldIds.includes(field.id),
          ),
        )
      : getArchiveColumns(
          showDetails,
          snapshot.customFields.filter((field) =>
            visibleCustomFieldIds.includes(field.id),
          ),
        )
  const showCompactDirectory = !query.trim() && !showDetails
  const columnWidth = (column: string) =>
    columnWidths[column] ?? defaultColumnWidths[column] ?? 160
  const tableWidth = columns.reduce(
    (total, column) => total + columnWidth(column),
    0,
  )
  const compactGroups = filteredContacts.reduce<
    Array<{ initial: string; people: Person[] }>
  >((groups, person) => {
    const initial = getSurnameInitial(person.fullName)
    const current = groups.at(-1)
    if (current?.initial === initial) current.people.push(person)
    else groups.push({ initial, people: [person] })
    return groups
  }, [])

  const coachItems = contacts
    .flatMap((person) => {
      const bundle = getPersonBundle(snapshot, person.id)
      if (!bundle) return []
      const selectedRange = coachRanges.find(
        (range) => range.value === coachRange,
      )!
      const dateSignals = getUpcomingDates(
        bundle.importantDates,
        today,
        selectedRange.maxDays,
      ).map((item) => {
        const days = differenceInCalendarDays(
          new Date(`${item.occurrence.date}T00:00:00`),
          new Date(`${today}T00:00:00`),
        )
        return {
          days,
          reason:
            days === 0
              ? `今天是${item.date.label}，记得问候`
              : `${days} 天后是${item.date.label}，可以提前准备`,
          priority: 90 - days,
        }
      })
      const followUpSignals = bundle.detailEntries
        .filter(
          (detail) => detail.followUpOn && detail.followUpOn >= today,
        )
        .map((detail) => {
          const days = differenceInCalendarDays(
            new Date(`${detail.followUpOn}T00:00:00`),
            new Date(`${today}T00:00:00`),
          )
          return {
            days,
            reason:
              days === 0
                ? `今天回访这条细节：${detail.content}`
                : `${days} 天后回访这条细节：${detail.content}`,
            priority: 88 - days,
          }
        })
        .filter((signal) => signal.days <= selectedRange.maxDays)
      const signal = [...dateSignals, ...followUpSignals].sort(
        (a, b) => a.days - b.days || b.priority - a.priority,
      )[0]
      return signal ? [{ person, ...signal }] : []
    })
    .sort((a, b) => a.days - b.days || b.priority - a.priority)
    .slice(0, 3)

  const upcoming = snapshot.importantDates
    .map((date) => {
      const person = snapshot.people.find((item) => item.id === date.personId)
      return person ? { date, person } : null
    })
    .filter((item) => item !== null)
    .flatMap((item) =>
      getUpcomingDates([item.date], today, 30).map((upcomingItem) => ({
        ...upcomingItem,
        person: item.person,
      })),
    )
    .slice(0, 4)

  function toggleDetails() {
    setDetailsExpanded((current) => {
      const next = { ...current, [tier]: !current[tier] }
      if (!next[tier]) setTableEditing(false)
      localStorage.setItem(
        'show-acquaintance-details',
        String(next.acquaintance),
      )
      return next
    })
  }

  function updateColumnWidth(column: string, width: number) {
    const next = { ...columnWidths, [column]: width }
    setColumnWidths(next)
    localStorage.setItem('archive-column-widths-v1', JSON.stringify(next))
  }

  function resetColumnWidths() {
    setColumnWidths({})
    localStorage.removeItem('archive-column-widths-v1')
  }

  function changeTier(nextTier: RelationshipTier) {
    setTier(nextTier)
    setQuery('')
    setSearchParams(
      nextTier === 'soul' ? {} : { tier: nextTier },
      { replace: true },
    )
  }

  function renderCell(person: Person, column: string) {
    if (column === 'fullName') {
      return (
        <Link
          className="person-name-link"
          to={`/people/${person.id}`}
          aria-label={person.fullName}
        >
          <span className="name-avatar">
            {person.avatarUrl ? (
              <img src={person.avatarUrl} alt="" />
            ) : (
              person.fullName.slice(0, 1)
            )}
          </span>
          <span>
            <strong>{person.fullName}</strong>
            {!showDetails ? null : (
              <small>{person.role || '尚未记录角色'}</small>
            )}
          </span>
        </Link>
      )
    }
    if (column === 'influence') {
      return person.influence ? influenceLabels[person.influence] : '—'
    }
    if (column === 'intimacy') {
      return person.intimacy ? intimacyLabels[person.intimacy] : '—'
    }
    if (column === 'coach') {
      const bundle = getPersonBundle(snapshot, person.id)
      const status = bundle
        ? getCoachStatus(
            person,
            bundle.interactions,
            bundle.importantDates,
            today,
            bundle.detailEntries,
            bundle.goals,
          )
        : null
      return (
        <span className={`coach-pill coach-${status?.state ?? 'unset'}`}>
          <span className="status-dot" />
          {status?.label ?? '未设节奏'}
        </span>
      )
    }
    if (column.startsWith('custom:')) {
      const fieldId = column.slice('custom:'.length)
      const value = snapshot.customValues.find(
        (item) => item.personId === person.id && item.fieldId === fieldId,
      )
      return Array.isArray(value?.value)
        ? value.value.join('、')
        : String(value?.value ?? '—')
    }
    return person[column as keyof Person] || '—'
  }

  function renderTableRows() {
    let currentInitial = ''
    return filteredContacts.map((person) => {
      const initial = getSurnameInitial(person.fullName)
      const startsGroup = initial !== currentInitial
      currentInitial = initial
      return (
        <Fragment key={person.id}>
          {startsGroup ? (
            <tr className="surname-group-row">
              <th scope="rowgroup" colSpan={columns.length}>
                <span>{initial}</span>
              </th>
            </tr>
          ) : null}
          <tr>
            {columns.map((column) => (
              <td
                key={column}
                data-label={
                  columnLabels[column] ??
                  snapshot.customFields.find(
                    (field) => `custom:${field.id}` === column,
                  )?.label
                }
              >
                {renderCell(person, column)}
              </td>
            ))}
          </tr>
        </Fragment>
      )
    })
  }

  return (
    <div className="archive-page">
      <header className="page-heading">
        <div>
          <h1>155人脉管理</h1>
          <p className="page-purpose">
            确定目标：我想要做什么？我为谁而做？他们需要什么？因为我，他们有什么改变？
          </p>
        </div>
        <div className="page-heading-actions">
          <button className="button primary" type="button" onClick={() => setAddOpen(true)}>
            <Plus size={18} aria-hidden="true" />
            新增人员
          </button>
          <Link
            to="/settings/cloud"
            className="button backup-entry-button"
            aria-label="备份"
            title="备份"
          >
            <DatabaseBackup size={17} aria-hidden="true" />
          </Link>
          <Link
            to="/settings"
            className="button settings-entry-button"
            aria-label="设置"
            title="设置"
          >
            <Settings size={17} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="coach-ribbon" aria-label="关系教练">
        <div className="coach-ribbon-heading">
          <Sparkles size={18} aria-hidden="true" />
          <div>
            <strong>
              {coachRanges.find((range) => range.value === coachRange)?.title}
            </strong>
            <small>依据你亲手设置的联系周期</small>
            <div className="coach-range-tabs" aria-label="关系教练时间范围">
              {coachRanges.map((range) => (
                <button
                  key={range.value}
                  type="button"
                  aria-pressed={coachRange === range.value}
                  onClick={() => setCoachRange(range.value)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="coach-items">
          {coachItems.length ? (
            coachItems.map((item) => (
              <Link key={item!.person.id} to={`/people/${item!.person.id}`}>
                <strong>{item!.person.fullName}</strong>
                <span>{item!.reason}</span>
              </Link>
            ))
          ) : (
            <p>这个时间范围内没有重要日期或回访提醒。</p>
          )}
        </div>
        <div className="upcoming-mini">
          <CalendarDays size={16} aria-hidden="true" />
          {upcoming.length ? (
            <span>
              {upcoming[0].person.fullName} · {upcoming[0].date.label}{' '}
              {upcoming[0].occurrence.date.slice(5).replace('-', '/')}
            </span>
          ) : (
            <span>未来 30 天没有重要日期</span>
          )}
        </div>
      </section>

      <section className="archive-shell">
        <div className="archive-toolbar">
          <nav className="tier-tabs" aria-label="关系分类">
            {tiers.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tier === item}
                className={tier === item ? 'active' : ''}
                onClick={() => changeTier(item)}
              >
                {tierLabels[item]}
                <span>{tiersCount[item]}</span>
              </button>
            ))}
          </nav>

          <div className="archive-actions">
            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">搜索人物</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索姓名、职业或某个细节"
              />
            </label>
            <button
              type="button"
              className="icon-text-button"
              onClick={() => setColumnsOpen((value) => !value)}
              aria-expanded={columnsOpen}
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
              显示列
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            {!query.trim() ? (
              <button
                type="button"
                className="icon-text-button"
                onClick={toggleDetails}
              >
                {showDetails ? '收起资料' : '显示更多资料'}
              </button>
            ) : null}
          </div>
        </div>

        {columnsOpen ? (
          <div className="column-panel">
            <Filter size={16} aria-hidden="true" />
            <span>自定义维度：</span>
            {snapshot.customFields.filter((field) => field.isActive).length ? (
              snapshot.customFields
                .filter((field) => field.isActive)
                .map((field) => (
                  <label key={field.id} className="column-checkbox">
                    <input
                      type="checkbox"
                      checked={visibleCustomFieldIds.includes(field.id)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...visibleCustomFieldIds, field.id]
                          : visibleCustomFieldIds.filter(
                              (fieldId) => fieldId !== field.id,
                            )
                        setVisibleCustomFieldIds(next)
                        localStorage.setItem(
                          'visible-custom-fields',
                          JSON.stringify(next),
                        )
                      }}
                    />
                    {field.label}
                  </label>
                ))
            ) : (
              <span>尚未添加</span>
            )}
            <Link to="/settings/fields">管理维度</Link>
          </div>
        ) : null}

        {tableEditing && !showCompactDirectory ? (
          <div className="column-width-panel">
            <div className="column-width-panel-heading">
              <strong>调整列宽</strong>
              <button
                type="button"
                className="text-button"
                onClick={resetColumnWidths}
              >
                恢复默认
              </button>
            </div>
            <div className="column-width-grid">
              {columns.map((column) => {
                const label =
                  columnLabels[column] ??
                  snapshot.customFields.find(
                    (field) => `custom:${field.id}` === column,
                  )?.label ??
                  '补充资料'
                return (
                  <label key={column} className="column-width-control">
                    <span>{label}</span>
                    <input
                      type="range"
                      min="100"
                      max="340"
                      step="10"
                      value={columnWidth(column)}
                      aria-label={`${label}列宽`}
                      onChange={(event) =>
                        updateColumnWidth(column, Number(event.target.value))
                      }
                    />
                    <output>{columnWidth(column)}px</output>
                  </label>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="table-filters">
          <span>筛选</span>
          <select
            aria-label="按地区筛选"
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value)}
          >
            <option value="">全部地区</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <select
            aria-label="按影响力筛选"
            value={influenceFilter}
            onChange={(event) => setInfluenceFilter(event.target.value)}
          >
            <option value="">全部影响力</option>
            <option value="weak">弱</option>
            <option value="medium">中</option>
            <option value="strong">强</option>
          </select>
          <div className="table-filter-actions">
            {query ? (
              <span className="search-context">正在全部层级中搜索</span>
            ) : null}
            {!showCompactDirectory ? (
              <button
                type="button"
                className="icon-text-button"
                aria-expanded={tableEditing}
                onClick={() => setTableEditing((value) => !value)}
              >
                <Pencil size={16} aria-hidden="true" />
                表格格式
              </button>
            ) : null}
          </div>
        </div>

        <div className="archive-table-wrap">
          {showCompactDirectory ? (
            <ul
              className="acquaintance-directory"
              aria-label={`${tierLabels[tier]}名单`}
            >
              {compactGroups.map((group) => (
                <li key={group.initial} className="alphabet-block">
                  <div className="alphabet-heading">
                    <span>{group.initial}</span>
                    <i aria-hidden="true" />
                  </div>
                  <div className="acquaintance-grid">
                    {group.people.map((person) => (
                      <Link
                        key={person.id}
                        className="acquaintance-name-link"
                        to={`/people/${person.id}`}
                        aria-label={person.fullName}
                      >
                        <span className="name-avatar">
                          {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt="" />
                          ) : (
                            person.fullName.slice(0, 1)
                          )}
                        </span>
                        <span className="acquaintance-person-copy">
                          <strong>{person.fullName}</strong>
                          <small>{person.role || '角色未记录'}</small>
                          <small>
                            {[person.industry, person.occupation]
                              .filter(Boolean)
                              .join(' · ') || '行业与职业未记录'}
                          </small>
                        </span>
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <table
              className="archive-table"
              style={{
                tableLayout: 'fixed',
                minWidth: `${tableWidth}px`,
              }}
            >
              <colgroup>
                {columns.map((column) => (
                  <col
                    key={column}
                    style={{ width: `${columnWidth(column)}px` }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column} scope="col">
                      {columnLabels[column] ??
                        snapshot.customFields.find(
                          (field) => `custom:${field.id}` === column,
                        )?.label ??
                        '补充资料'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{renderTableRows()}</tbody>
            </table>
          )}
          {!filteredContacts.length ? (
            <div className="empty-state">
              <span className="empty-illustration">人</span>
              <h2>{query ? '没有找到匹配的人' : '这一类还没有人'}</h2>
              <p>
                {query
                  ? '换一个名字、职业或细节试试。'
                  : '新增人员后，他会出现在这里。'}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <PersonDialog
        open={addOpen}
        initialTier={tier}
        onClose={() => setAddOpen(false)}
        onSubmit={(input, keepOpen) => {
          const person = createPersonRecord({
            kind: 'contact',
            tier: input.tier,
            fullName: input.fullName,
            role: input.role,
            occupation: input.occupation,
            region: input.region,
            industry: input.industry,
            influence: input.influence,
            intimacy: input.intimacy,
            influenceNote: input.influenceNote,
            intimacyNote: input.intimacyNote,
            cadenceDays: input.cadenceDays,
            familySummary: input.familySummary,
            careerSummary: input.careerSummary,
            firstMetOn: input.firstMetOn,
            firstMetPlace: input.firstMetPlace,
            firstMetStory: input.firstMetStory,
          })
          update((current) => ({
            ...current,
            people: [...current.people, person],
          }))
          if (keepOpen) {
            changeTier(input.tier)
          } else {
            setAddOpen(false)
            navigate(`/people/${person.id}`)
          }
        }}
      />
    </div>
  )
}
