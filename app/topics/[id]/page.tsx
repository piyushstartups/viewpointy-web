"use client";

import Link from "next/link";
import { notFound } from "next/navigation";

type TopicRecord = {
  id: string;
  fields: {
    Name: string;
    Question: string;
    "Hashtag List"?: string[];
  };
};

type ViewpointRecord = {
  id: string;
  fields: {
    Text: string;
    URL: string;
    Author: string;
    Stance: string;
  };
};

async function getTopic(id: string): Promise<TopicRecord | null> {
  const base = process.env.NEXT_PUBLIC_AIRTABLE_BASE;
  const table = process.env.NEXT_PUBLIC_TOPICS_TABLE_ID;
  const key = process.env.AIRTABLE_API_KEY;

  const url =
    `https://api.airtable.com/v0/${base}/${table}` +
    `?filterByFormula=RECORD_ID()="${id}"`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.records[0] || null;
}

async function getViewpoints(id: string): Promise<ViewpointRecord[]> {
  const base = process.env.NEXT_PUBLIC_AIRTABLE_BASE;
  const table = process.env.NEXT_PUBLIC_VIEWPOINTS_TABLE_ID;
  const key = process.env.AIRTABLE_API_KEY;

  const url =
    `https://api.airtable.com/v0/${base}/${table}` +
    `?filterByFormula={Topic}="${id}"&pageSize=20`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("🛠️  Airtable error body:", err);
    throw new Error(`Views fetch failed: ${res.status}`);
  }

  const data = await res.json();
  return data.records;
}

export default async function Page({
  params,
}: {
  params: { id: string };
}) {
  const topic = await getTopic(params.id);
  if (!topic) return notFound();

  const viewpoints = await getViewpoints(params.id);

  return (
    <main className="max-w-xl mx-auto p-4">
      <Link href="/">
        ← Back to topics
      </Link>

      <h1 className="mt-4 text-3xl font-bold">
        {topic.fields.Question}
      </h1>
      <hr className="my-4" />

      {topic.fields["Hashtag List"]?.length ? (
        <p className="text-gray-600 mb-6">
          {topic.fields["Hashtag List"].map((h) => `#${h}`).join(" ")}
        </p>
      ) : null}

      {viewpoints.length === 0 ? (
        <p className="text-gray-500">No viewpoints collected yet.</p>
      ) : (
        ["For", "Against", "Mixed"].map((stance) => {
          const group = viewpoints.filter(
            (v) => v.fields.Stance === stance
          );
          if (!group.length) return null;
          return (
            <section key={stance} className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {stance}
              </h2>
              {group.map((v) => (
                <blockquote
                  key={v.id}
                  className="border rounded-lg p-4 mb-4"
                >
                  <p>{v.fields.Text}</p>
                  <a
                    href={v.fields.URL}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-2 text-sm text-blue-600"
                  >
                    Read source
                  </a>
                  <cite className="block mt-1 text-sm text-gray-500">
                    — {v.fields.Author}
                  </cite>
                </blockquote>
              ))}
            </section>
          );
        })
      )}
    </main>
  );
}
