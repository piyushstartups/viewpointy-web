// app/topics/[id]/page.tsx

import Link from 'next/link'
import { notFound } from 'next/navigation'

type TopicRecord = {
  id: string
  fields: {
    Question: string
    'Hashtag List'?: string[] | string
    Viewpoints?: string[]          // <-- Airtable’s linked-ID array
  }
}

type ViewpointRecord = {
  id: string
  fields: {
    Text: string
    URL?: string
    Author?: string
    Stance?: 'For' | 'Against' | 'Mixed'
  }
}

export const revalidate = 5

async function getTopic(id: string): Promise<TopicRecord | null> {
  const base     = process.env.NEXT_PUBLIC_AIRTABLE_BASE!
  const table    = process.env.NEXT_PUBLIC_TOPICS_TABLE_ID!
  const apiKey   = process.env.AIRTABLE_API_KEY!
  const filter   = encodeURIComponent(`RECORD_ID()="${id}"`)
  const url      = `https://api.airtable.com/v0/${base}/${table}?filterByFormula=${filter}&pageSize=1`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Topic fetch failed: ${res.status}`)
  const json = await res.json()
  return json.records[0] ?? null
}

async function getViewpointsByIds(ids: string[]): Promise<ViewpointRecord[]> {
  if (ids.length === 0) return []

  const base   = process.env.NEXT_PUBLIC_AIRTABLE_BASE!
  const table  = process.env.NEXT_PUBLIC_VIEWPOINTS_TABLE_ID!
  const apiKey = process.env.AIRTABLE_API_KEY!

  // build OR(RECORD_ID()='id1',RECORD_ID()='id2',...)
  const clauses = ids.map((rid) => `RECORD_ID()="${rid}"`).join(',')
  const formula = encodeURIComponent(`OR(${clauses})`)
  const url     = `https://api.airtable.com/v0/${base}/${table}?filterByFormula=${formula}&pageSize=50`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('Airtable views error:', body)
    throw new Error(`Views fetch failed: ${res.status}`)
  }
  const json = await res.json()
  return json.records as ViewpointRecord[]
}

export default async function Page({ params }: { params: { id: string } }) {
  const topic = await getTopic(params.id)
  if (!topic) notFound()

  // pull the linked-ID array straight out of the Topic record
  const viewIds = topic.fields.Viewpoints ?? []
  const allViews = await getViewpointsByIds(viewIds)

  // normalize hashtags
  const raw = topic.fields['Hashtag List'] ?? []
  const hashtags: string[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
    ? raw.split(/[\s,]+/).filter(Boolean)
    : []

  return (
    <main className="max-w-xl mx-auto p-4">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to topics
      </Link>

      <h1 className="mt-4 text-3xl font-bold">
        {topic.fields.Question}
      </h1>
      <hr className="my-4" />

      {hashtags.length > 0 && (
        <p className="text-gray-600 mb-6">
          {hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}
        </p>
      )}

      {allViews.length === 0 ? (
        <p className="text-gray-500">No viewpoints collected yet.</p>
      ) : (
        <div className="space-y-8">
          {(['For','Against','Mixed'] as const).map((stance) => {
            const group = allViews.filter((v) => v.fields.Stance === stance)
            if (group.length === 0) return null
            return (
              <section key={stance}>
                <h2 className="text-2xl font-semibold mb-4">{stance}</h2>
                <ul className="space-y-4">
                  {group.map((v) => (
                    <li key={v.id} className="border rounded-lg p-4">
                      <p className="mb-2">{v.fields.Text}</p>
                      {v.fields.URL && (
                        <a
                          href={v.fields.URL}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Read source
                        </a>
                      )}
                      {v.fields.Author && (
                        <p className="text-xs text-gray-400 mt-2">
                          — {v.fields.Author}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}
