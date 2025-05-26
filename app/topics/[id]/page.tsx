// app/topics/[id]/page.tsx
import React from "react";
import Link from "next/link";
import { Metadata } from "next";

// force-dynamic so we can read env vars at runtime
export const dynamic = "force-dynamic";

type TopicRecord = {
  id: string;
  fields: {
    Name: string;
    Question: string;
    // Airtable sometimes returns multi-select fields as string or array
    "Hashtag List"?: string | string[];
  };
};

type ViewpointRecord = {
  id: string;
  fields: {
    // linked to Topic by record ID
    Topic: string[];
    Text: string;
    URL?: string;
    Author?: string;
    Stance?: "For" | "Against" | "Mixed";
  };
};

async function getTopic(id: string): Promise<TopicRecord> {
  const res = await fetch(
    `https://api.airtable.com/v0/${process.env.NEXT_PUBLIC_AIRTABLE_BASE}/${process.env.NEXT_PUBLIC_TOPICS_TABLE_ID}/${id}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch topic (${res.status})`);
  }
  return (await res.json()) as TopicRecord;
}

async function getViewpoints(topicId: string): Promise<ViewpointRecord[]> {
  // filterByFormula needs URL-encoding
  const formula = encodeURIComponent(`{Topic}="${topicId}"`);
  const url = `https://api.airtable.com/v0/${process.env.NEXT_PUBLIC_AIRTABLE_BASE}/${process.env.NEXT_PUBLIC_VIEWPOINTS_TABLE_ID}?filterByFormula=${formula}&pageSize=20`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Airtable views error:", body);
    throw new Error(`Failed to fetch viewpoints (${res.status})`);
  }
  const json = await res.json();
  return json.records as ViewpointRecord[];
}

// this lets Next.js set the page <title> and <meta>
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const topic = await getTopic(params.id);
  return {
    title: topic.fields.Name,
    description: topic.fields.Question,
  };
}

export default async function Page({ params }: { params: { id: string } }) {
  const topic = await getTopic(params.id);
  const viewpoints = await getViewpoints(params.id);

  // normalize "Hashtag List"
  const raw = topic.fields["Hashtag List"];
  let hashtags: string[] = [];
  if (Array.isArray(raw)) {
    hashtags = raw;
  } else if (typeof raw === "string") {
    hashtags = raw.split(",").map((h) => h.trim());
  }

  return (
    <main className="max-w-xl mx-auto p-4">
      <Link href="/topics" className="text-sm text-blue-600 hover:underline">
        ← Back to topics
      </Link>

      <h1 className="mt-4 text-3xl font-semibold">“{topic.fields.Question}”</h1>
      <hr className="my-4" />

      {hashtags.length > 0 && (
        <p className="mt-2 text-gray-600 mb-6">
          {hashtags.map((tag, i) => (
            <span key={i}>
              {tag}
              {i < hashtags.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
      )}

      {viewpoints.length > 0 ? (
        (["For", "Against", "Mixed"] as const).map((stance) => {
          const group = viewpoints.filter((v) => v.fields.Stance === stance);
          if (group.length === 0) return null;
          return (
            <section key={stance} className="mb-8">
              <h2 className="text-xl font-bold mb-4">{stance}</h2>
              {group.map((v) => (
                <div key={v.id} className="border rounded p-4 mb-4">
                  <p>{v.fields.Text}</p>
                  {v.fields.URL && (
                    <a
                      href={v.fields.URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline block mt-2"
                    >
                      Read source
                    </a>
                  )}
                  {v.fields.Author && (
                    <p className="mt-2 text-gray-500">— {v.fields.Author}</p>
                  )}
                </div>
              ))}
            </section>
          );
        })
      ) : (
        <p className="text-gray-500">No viewpoints collected yet.</p>
      )}
    </main>
  );
}
