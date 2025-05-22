// app/page.tsx
import Link from "next/link"

type Topic = {
  id: string
  fields: {
    Question: string
    // Airtable might return this as string or string[]
    "Hashtag List"?: string | string[]
  }
}

async function getTopics(): Promise<Topic[]> {
  const base  = process.env.NEXT_PUBLIC_AIRTABLE_BASE!
  const table = process.env.NEXT_PUBLIC_TOPICS_TABLE_ID!
  const key   = process.env.AIRTABLE_API_KEY!

  // Fetch from your "NewestFirst" view (must be set up in Airtable)
  const url = new URL(`https://api.airtable.com/v0/${base}/${table}`)
  url.searchParams.set("view", "NewestFirst")
  url.searchParams.set("maxRecords", "10")

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) {
    throw new Error(`Airtable fetch failed: ${res.status}`)
  }

  const data = await res.json()
  return data.records
}

export default async function Page() {
  const topics = await getTopics()

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">📣 Today’s Debate Topics</h1>

      {topics.map((t) => {
        // normalize your hashtags into a single string
        let tagsOut: string | null = null
        const raw = t.fields["Hashtag List"]
        if (Array.isArray(raw)) {
          tagsOut = raw.join(" ")
        } else if (typeof raw === "string" && raw.trim().length > 0) {
          tagsOut = raw
        }

        return (
          <section
            key={t.id}
            className="border rounded-lg p-4 mb-6 hover:shadow transition-shadow"
          >
            <Link href={`/topics/${t.id}`}>
              <h2 className="text-lg font-semibold hover:underline">
                {t.fields.Question}
              </h2>
            </Link>

            {tagsOut && (
              <p className="mt-2 text-sm text-gray-500">{tagsOut}</p>
            )}
          </section>
        )
      })}
    </main>
  )
}
