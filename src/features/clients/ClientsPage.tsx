import {
  ArrowLeft,
  Building2,
  MapPin,
  Plus,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWorkspace } from '../../app/WorkspaceContext'
import { matchesPersonName, getSurnameInitial } from '../../domain/alphabet'
import {
  createClientRecord,
  upsertClient,
} from '../../domain/workspace'
import { splitIndustries } from '../../domain/clients'
import {
  clientCategoryLabels,
  type Client,
  type ClientCategory,
} from '../../domain/types'
import { ClientDialog } from './ClientDialog'

const categories: ClientCategory[] = [
  'customer',
  'channel',
  'partner',
  'supplier',
  'competitor',
]

type CategoryFilter = ClientCategory | 'all'

export function ClientsPage() {
  const { snapshot, update } = useWorkspace()
  const navigate = useNavigate()
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [industry, setIndustry] = useState('')
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const peopleById = useMemo(
    () => new Map(snapshot.people.map((person) => [person.id, person])),
    [snapshot.people],
  )

  const contactsByClient = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const contact of snapshot.clientContacts) {
      const name =
        (contact.personId ? peopleById.get(contact.personId)?.fullName : '') ||
        contact.name
      const names = map.get(contact.clientId) ?? []
      names.push(name)
      map.set(contact.clientId, names)
    }
    return map
  }, [snapshot.clientContacts, peopleById])

  const industriesByClient = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const artifact of snapshot.clientArtifacts) {
      if (artifact.kind !== 'solution') continue
      const list = map.get(artifact.clientId) ?? []
      list.push(...splitIndustries(artifact.industry))
      map.set(artifact.clientId, list)
    }
    return map
  }, [snapshot.clientArtifacts])

  const industryOptions = useMemo(() => {
    const values = new Set<string>()
    for (const list of industriesByClient.values()) {
      for (const name of list) values.add(name)
    }
    return [...values].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [industriesByClient])

  const counts = useMemo(() => {
    const result: Record<CategoryFilter, number> = {
      all: snapshot.clients.length,
      customer: 0,
      channel: 0,
      partner: 0,
      supplier: 0,
      competitor: 0,
    }
    for (const client of snapshot.clients) {
      for (const item of client.categories) result[item] += 1
    }
    return result
  }, [snapshot.clients])

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('zh-CN')
    return snapshot.clients
      .filter(
        (client) =>
          category === 'all' || client.categories.includes(category),
      )
      .filter(
        (client) =>
          !industry ||
          (industriesByClient.get(client.id) ?? []).includes(industry),
      )
      .filter((client) => {
        if (!needle) return true
        if (matchesPersonName(client.name, query)) return true
        const contactNames = contactsByClient.get(client.id) ?? []
        if (
          contactNames.some((name) => matchesPersonName(name, query))
        ) {
          return true
        }
        const values = [
          client.address,
          ...(industriesByClient.get(client.id) ?? []),
        ]
        return values.some((value) =>
          value.toLocaleLowerCase('zh-CN').includes(needle),
        )
      })
      .sort((a, b) => {
        const initialA =
          getSurnameInitial(a.name) === '#'
            ? 'ZZZ'
            : getSurnameInitial(a.name)
        const initialB =
          getSurnameInitial(b.name) === '#'
            ? 'ZZZ'
            : getSurnameInitial(b.name)
        return (
          initialA.localeCompare(initialB) ||
          a.name.localeCompare(b.name, 'zh-CN')
        )
      })
  }, [
    category,
    contactsByClient,
    industriesByClient,
    industry,
    query,
    snapshot.clients,
  ])

  const clientGroups = useMemo(() => {
    const groups: Array<{ letter: string; clients: Client[] }> = []
    for (const client of filteredClients) {
      const letter = getSurnameInitial(client.name)
      const last = groups[groups.length - 1]
      if (last && last.letter === letter) last.clients.push(client)
      else groups.push({ letter, clients: [client] })
    }
    return groups
  }, [filteredClients])

  function openNewClient() {
    setDialogOpen(true)
  }

  return (
    <main className="clients-page">
      <Link to="/" className="back-link clients-back-link">
        <ArrowLeft size={17} aria-hidden="true" />
        返回人脉
      </Link>

      <header className="page-heading clients-heading">
        <div>
          <h1>客户/伙伴</h1>
          <p>
            把客户、渠道、伙伴、供应商和友商放在一处，联系人可以直接关联人脉档案，也可以单独记录。
          </p>
        </div>
        <div className="page-heading-actions">
          <button type="button" className="button primary" onClick={openNewClient}>
            <Plus size={18} aria-hidden="true" />
            新增
          </button>
          <Link
            to="/settings"
            state={{ from: 'clients' }}
            className="button settings-entry-button"
            aria-label="设置"
            title="设置"
          >
            <Settings size={17} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="clients-shell" aria-label="客户与伙伴">
        <div className="clients-toolbar">
          <nav className="client-tabs" aria-label="客户类别">
            <button
              type="button"
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
            >
              全部
              <span>{counts.all}</span>
            </button>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {clientCategoryLabels[item]}
                <span>{counts[item]}</span>
              </button>
            ))}
          </nav>
          <div className="clients-filter-actions">
            <select
              className="client-industry-filter"
              aria-label="按行业筛选"
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
            >
              <option value="">全部行业</option>
              {industryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <label className="search-box clients-search">
              <Search size={16} aria-hidden="true" />
              <input
                aria-label="搜索客户"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="名称、首字母、地址或联系人"
              />
            </label>
          </div>
        </div>

        {filteredClients.length ? (
          <div className="client-groups">
            {clientGroups.map((group) => (
              <section
                key={group.letter}
                className="client-group"
                aria-label={`${group.letter} 开头的公司`}
              >
                <div className="alphabet-heading">
                  <span>{group.letter}</span>
                  <i />
                </div>
                <div className="client-grid">
                  {group.clients.map((client) => {
                    const names = contactsByClient.get(client.id) ?? []
                    return (
                      <Link
                        key={client.id}
                        to={`/clients/${client.id}`}
                        className="client-card"
                      >
                        <div className="client-card-top">
                          <h2>{client.name}</h2>
                          <span className="client-contact-count">
                            <Users size={14} aria-hidden="true" />
                            {names.length} 位联系人
                          </span>
                        </div>
                        <span className="client-category-list">
                          {client.categories.map((item) => (
                            <span
                              key={item}
                              className={`client-category is-${item}`}
                            >
                              {clientCategoryLabels[item]}
                            </span>
                          ))}
                        </span>
                        <p className="client-address">
                          <MapPin size={14} aria-hidden="true" />
                          {client.address || '地址未记录'}
                        </p>
                        <p className="client-contact-names">
                          {names.length ? names.join('、') : '还没有联系人'}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="empty-state clients-empty">
            <span className="empty-illustration">
              <Building2 size={24} aria-hidden="true" />
            </span>
            <h2>
              {snapshot.clients.length ? '没有符合条件的客户' : '还没有客户或伙伴'}
            </h2>
            <p>
              {snapshot.clients.length
                ? '换个类别或搜索词试试。'
                : '先记下第一个客户，再把对接人关联到人脉档案。'}
            </p>
            {snapshot.clients.length ? null : (
              <button type="button" className="button primary" onClick={openNewClient}>
                <Plus size={17} aria-hidden="true" />
                新增
              </button>
            )}
          </div>
        )}
      </section>

      <ClientDialog
        open={dialogOpen}
        initial={null}
        onClose={() => setDialogOpen(false)}
        onSave={(value) => {
          const client = createClientRecord(value)
          update((current) => upsertClient(current, client))
          setDialogOpen(false)
          navigate(`/clients/${client.id}`)
        }}
      />
    </main>
  )
}
