// app/topics/[id]/page.tsx

import Link from 'next/link'
import { Metadata } from 'next'

/** One row from your Topics table */
type TopicRecord = {
  id: string
  fields: {
    Question: string
    'Hashtag List'?: string[] | string
    Viewpoints?: string[]        // linked record IDs
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

// Revalidate every 5 seconds
export const revalidate = 5

/** Fetch a single topic by Airtable record ID */
async function getTopicById(id: string): Promise<TopicRecord> {
  const apiKey = process.env.AIRTABLE_API_KEY!
  const base   = process.env.NEXT_PUBLIC_AIRTABLE_BASE!
  const tbl    = process.env.NEXT_PUBLIC_TOPICS_TABLE_ID!

  const res = await fetch(
    `https://api.airtable.com/v0/${base}/${tbl}/${id}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    }
  )
  if (!res.ok) throw new Error(`Failed to load topic (${res.status})`)
  return res.json()
}

/** Given a list of Viewpoint record IDs, fetch exactly those records */
async function getViewpointsByIds(ids: string[]): Promise<ViewpointRecord[]> {
  if (ids.length === 0) return []
  const apiKey = process.env.AIRTABLE_API_KEY!
  const base   = process.env.NEXT_PUBLIC_AIRTABLE_BASE!
  const tbl    = process.env.NEXT_PUBLIC_VIEWPOINTS_TABLE_ID!
  const formula = encodeURIComponent(
    `OR(${ids.map((rid) => `RECORD_ID()="${rid}"`).join(',')})`
  )
  const url = `https://api.airtable.com/v0/${base}/${tbl}?filterByFormula=${formula}&pageSize=50`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const txt = await res.text()
    console.error('Airtable error:', txt)
    throw new Error(`Failed to load viewpoints (${res.status})`)
  }
  const json = await res.json()
  return json.records
}

/** Dynamically set the page title based on the topic question */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const topic = await getTopicById(id)
  return { title: `Viewpointy – ${topic.fields.Question}` }
}

/** The Topic Detail page */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Unwrap the async params
  const { id } = await params

  // Load topic and its linked viewpoint IDs
  const topic     = await getTopicById(id)
  const viewIds   = topic.fields.Viewpoints ?? []
  const viewpoints = await getViewpointsByIds(viewIds)

  // Normalize the hashtag list into an array of strings
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

      <h1 className="mt-4 text-3xl font-bold">{topic.fields.Question}</h1>
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
              <h2 className="font-semibold text-lg mb-2">
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
