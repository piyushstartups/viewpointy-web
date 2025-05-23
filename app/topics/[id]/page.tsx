// app/topics/[id]/page.tsx

import Link from 'next/link'
import { Metadata } from 'next'

/** One row from your Topics table */
type TopicRecord = {
  id: string
  fields: {
    Question: string
    'Hashtag List'?: string[] | string
    Viewpoints?: string[]        // linked-record array of Viewpoint IDs
  }
}

/** One row from your Viewpoints table */
type ViewpointRecord = {
  id: string
  fields: {
    Text: string
    URL?: string
    Author?: string
    Stance?: 'For' | 'Against' | 'Mixed'
  }
}

async function getTopicById(id: string): Promise<TopicRecord> {
  const apiKey = process.env.AIRTABLE_API_KEY!
  const base   = process.env.NEXT_PUBLIC_AIRTABLE_BASE!
  const table  = process.env.NEXT_PUBLIC_TOPICS_TABLE_ID!

  const res = await fetch(
    `https://api.airtable.com/v0/${base}/${table}/${id}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    }
  )
  if (!res.ok) throw new Error(`Topic fetch failed: ${res.status}`)
  return (await res.json()) as TopicRecord
}

async function getViewpointsByIds(ids: string[]): Promise<ViewpointRecord[]> {
  if (!ids.length) return []

  const apiKey = process.env.AIRTABLE_API_KEY!
  const base   = process.env.NEXT_PUBLIC_AIRTABLE_BASE!
  const table  = process.env.NEXT_PUBLIC_VIEWPOINTS_TABLE_ID!

  // build an OR(...) filter on RECORD_ID()
  const clauses = ids.map((rid) => `RECORD_ID()="${rid}"`).join(',')
  const formula = encodeURIComponent(`OR(${clauses})`)
  const url     = `https://api.airtable.com/v0/${base}/${table}?filterByFormula=${formula}&pageSize=50`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const txt = await res.text()
    console.error('Airtable error:', txt)
    throw new Error(`Viewpoints fetch failed: ${res.status}`)
  }
  return (await res.json()).records as ViewpointRecord[]
}

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const topic = await getTopicById(params.id)
  return { title: `Viewpointy – ${topic.fields.Question}` }
}

export const revalidate = 5

export default async function Page({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const topic  = await getTopicById(id)
  const viewIds = topic.fields.Viewpoints ?? []
  const viewpoints = await getViewpointsByIds(viewIds)

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
          {hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
        </p>
      )}

      {viewpoints.length === 0 ? (
        <p className="text-gray-500">No viewpoints collected yet.</p>
      ) : (
        viewpoints.map((v) => (
          <section key={v.id} className="mb-8 border rounded-lg p-4">
            {v.fields.Stance && (
              <h2 className="text-lg font-semibold mb-2">
                {v.fields.Stance}
              </h2>
            )}
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
              <p className="mt-2 text-sm text-gray-500">
                — {v.fields.Author}
              </p>
            )}
          </section>
        ))
      )}
    </main>
  )
}
