import Link from 'next/link'
import { Metadata } from 'next'

type TopicRecord = {
  id: string
  fields: {
    Question: string
    'Hashtag List'?: string[]
  }
}

type ViewpointRecord = {
  id: string
  fields: {
    Text: string
    URL?: string
    Author?: string
    Stance?: string
  }
}

async function getTopicById(id: string): Promise<TopicRecord> {
  const apiKey  = process.env.AIRTABLE_API_KEY!
  const baseId  = process.env.NEXT_PUBLIC_AIRTABLE_BASE!
  const tableId = process.env.NEXT_PUBLIC_TOPICS_TABLE_ID!

  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${tableId}/${id}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    }
  )
  if (!res.ok) throw new Error(`Topic fetch failed: ${res.status}`)
  const data = await res.json()
  return data
}

async function getViewpoints(topicId: string): Promise<ViewpointRecord[]> {
  const apiKey     = process.env.AIRTABLE_API_KEY!
  const baseId     = process.env.NEXT_PUBLIC_AIRTABLE_BASE!
  const tableId    = process.env.NEXT_PUBLIC_VIEWPOINTS_TABLE_ID!
  const filterFormula = encodeURIComponent(`{Topic} = "${topicId}"`)

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${filterFormula}&pageSize=20`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    console.error('🛠️ Airtable error body:', text)
    throw new Error(`Views fetch failed: ${res.status}`)
  }
  const data = await res.json()
  return data.records
}

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  return { title: `Viewpointy – Topic ${params.id}` }
}

export default async function Page({
  params,
}: {
  params: { id: string }
}) {
  const topic      = await getTopicById(params.id)
  const viewpoints = await getViewpoints(params.id)

  return (
    <main className="max-w-2xl mx-auto p-4">
      <Link href="/" className="text-blue-600 hover:underline mb-4 block">
        ← Back to topics
      </Link>

      <h1 className="text-2xl font-bold mb-2">{topic.fields.Question}</h1>
      <hr className="my-4" />

      {topic.fields['Hashtag List']?.length ? (
        <p className="text-gray-600 mb-6">
          {topic.fields['Hashtag List'].map((h) => `#${h}`).join(' ')}
        </p>
      ) : null}

      {viewpoints.length === 0 ? (
        <p className="text-gray-500">No viewpoints collected yet.</p>
      ) : (
        viewpoints.map((v) => (
          <section key={v.id} className="mb-8 border rounded p-4">
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
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Read source
              </a>
            )}
            {v.fields.Author && (
              <p className="mt-2 text-sm text-gray-500">— {v.fields.Author}</p>
            )}
          </section>
        ))
      )}
    </main>
  )
}
