import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Viewpointy – Today's Debate Topics",
}

type TopicRecord = {
  id: string
  fields: {
    Question: string
    'Hashtag List'?: string[]
  }
}

async function getTopics(): Promise<TopicRecord[]> {
  const apiKey   = process.env.AIRTABLE_API_KEY!
  const baseId   = process.env.NEXT_PUBLIC_AIRTABLE_BASE!
  const tableId  = process.env.NEXT_PUBLIC_TOPICS_TABLE_ID!

  const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`)
  // sort by Created descending, pageSize=10
  url.searchParams.set('pageSize', '10')
  url.searchParams.set('sort[0][field]', 'Created')
  url.searchParams.set('sort[0][direction]', 'desc')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
    // revalidate every request
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Airtable fetch failed: ${res.status}`)
  const data = await res.json()
  return data.records
}

export default async function Page() {
  const topics = await getTopics()

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">📢 Today’s Debate Topics</h1>
      <ul className="space-y-4">
        {topics.map((t) => (
          <li key={t.id}>
            <Link
              href={`/topics/${t.id}`}
              className="block p-4 border rounded hover:shadow"
            >
              <p className="font-semibold">{t.fields.Question}</p>
              {t.fields['Hashtag List']?.length ? (
                <p className="mt-2 text-sm text-gray-500">
                  {t.fields['Hashtag List'].map((h) => `#${h}`).join(' ')}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
