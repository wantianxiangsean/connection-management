import {
  CalendarDays,
  ChevronDown,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { getArchiveColumns } from '../../domain/archive'
import { getCoachStatus } from '../../domain/coach'
import { getUpcomingDates } from '../../domain/dates'
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

export function ArchivePage() {
  const { snapshot, update } = useWorkspace()
  const [tier, setTier] = useState<RelationshipTier>('soul')
  const [query, setQuery] = useState('')
  const [showAcquaintanceDetails, setShowAcquaintanceDetails] = useState(
    () => localStorage.getItem('show-acquaintance-details') === 'true',
  )
  const [regionFilter, setRegionFilter] = useState('')
  const [influenceFilter, setInfluenceFilter] = useState('')
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const contacts = listActiveContacts(snapshot)
  const regionOptions = [...new Set(contacts.map((item) => item.region).filter(Boolean))]
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
    return source
      .map((bundle) => bundle.person)
      .filter((person) => !regionFilter || person.region === regionFilter)
      .filter((person) => !influenceFilter || person.influence === influenceFilter)
  }, [allBundles, query, tier, regionFilter, influenceFilter])

  const columns =
    query.trim()
      ? getArchiveColumns('friend', true, snapshot.customFields)
      : getArchiveColumns(tier, showAcquaintanceDetails, snapshot.customFields)

  const coachItems = contacts
    .map((person) => {
      const bundle = getPersonBundle(snapshot, person.id)
      if (!bundle) return null
      return {
        person,
        status: getCoachStatus(
          person,
          bundle.interactions,
          bundle.importantDates,
          today,
          bundle.detailEntries,
          bundle.goals,
        ),
      }
    })
    .filter(
      (item) =>
        item && !['unset', 'snoozed'].includes(item.status.state),
    )
    .sort((a, b) => (b?.status.priority ?? 0) - (a?.status.priority ?? 0))
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

  function toggleAcquaintanceDetails() {
    const next = !showAcquaintanceDetails
    setShowAcquaintanceDetails(next)
    localStorage.setItem('show-acquaintance-details', String(next))
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
            {tier === 'acquaintance' && !showAcquaintanceDetails ? null : (
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

  return (
    <div className="archive-page">
      <header className="page-heading">
        <div>
          <p className="section-overline">你的私人关系档案</p>
          <h1>人脉归档</h1>
          <p>
            共 {contacts.length} 位联系人。先从一个名字开始，慢慢补上值得记住的细节。
          </p>
        </div>
        <button className="button primary" type="button" onClick={() => setAddOpen(true)}>
          <Plus size={18} aria-hidden="true" />
          新增人物
        </button>
      </header>

      <section className="coach-ribbon" aria-label="关系教练">
        <div className="coach-ribbon-heading">
          <Sparkles size={18} aria-hidden="true" />
          <div>
            <strong>今天可以想起谁</strong>
            <small>依据你亲手设置的联系周期</small>
          </div>
        </div>
        <div className="coach-items">
          {coachItems.length ? (
            coachItems.map((item) => (
              <Link key={item!.person.id} to={`/people/${item!.person.id}`}>
                <strong>{item!.person.fullName}</strong>
                <span>{item!.status.reason}</span>
              </Link>
            ))
          ) : (
            <p>暂时没有到期的联系计划。</p>
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
                onClick={() => {
                  setTier(item)
                  setQuery('')
                }}
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
            {tier === 'acquaintance' && !query ? (
              <button
                type="button"
                className="icon-text-button"
                onClick={toggleAcquaintanceDetails}
              >
                {showAcquaintanceDetails ? '收起资料' : '显示更多资料'}
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
                .map((field) => <span key={field.id}>{field.label}</span>)
            ) : (
              <span>尚未添加</span>
            )}
            <Link to="/settings/fields">管理维度</Link>
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
          {query ? <span className="search-context">正在全部层级中搜索</span> : null}
        </div>

        <div className="archive-table-wrap">
          <table className="archive-table">
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
            <tbody>
              {filteredContacts.map((person) => (
                <tr key={person.id}>
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
              ))}
            </tbody>
          </table>
          {!filteredContacts.length ? (
            <div className="empty-state">
              <span className="empty-illustration">人</span>
              <h2>{query ? '没有找到匹配的人' : '这一类还没有人'}</h2>
              <p>
                {query
                  ? '换一个名字、职业或细节试试。'
                  : '新增人物后，他会出现在这里。'}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <PersonDialog
        open={addOpen}
        initialTier={tier}
        onClose={() => setAddOpen(false)}
        onSubmit={(input) => {
          const person = createPersonRecord({
            kind: 'contact',
            tier: input.tier,
            fullName: input.fullName,
            role: input.role,
            occupation: input.occupation,
            region: input.region,
            industry: input.industry,
          })
          update((current) => ({
            ...current,
            people: [...current.people, person],
          }))
          setTier(input.tier)
          setAddOpen(false)
        }}
      />
    </div>
  )
}

