import { prisma } from "@/lib/prisma";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || "";
const NVIDIA_EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings";
const NVIDIA_EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";

// 150 kata ~= 200 token, aman untuk limit 512 token NVIDIA
// overlap 20 kata untuk konteks antar chunk
export function chunkText(text: string, chunkSize = 150, overlap = 20): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 0) chunks.push(chunk);
    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}

async function embedWithRetry(text: string, retries = 3): Promise<number[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(NVIDIA_EMBED_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: NVIDIA_EMBED_MODEL,
        input: [text.substring(0, 800)], // ~600 token, aman
        input_type: "passage",
        encoding_format: "float",
        truncate: "END",
      }),
    });

    if (response.status === 429) {
      // Rate limit — tunggu sebelum retry
      const waitMs = Math.pow(2, attempt) * 2000;
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Embedding API error: ${err}`);
    }

    const data = (await response.json()) as any;
    return data.data[0].embedding as number[];
  }

  throw new Error("Embedding failed after retries (rate limit)");
}

export async function embedText(text: string): Promise<number[]> {
  return embedWithRetry(text);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function indexDocument(docId: string, content: string): Promise<void> {
  await prisma.docChunk.deleteMany({ where: { docId } });

  const chunks = chunkText(content);

  for (let i = 0; i < chunks.length; i++) {
    // Delay 1.5 detik antar request untuk jaga rate limit (40 req/menit = 1.5 detik/req)
    if (i > 0) await new Promise((r) => setTimeout(r, 1500));

    const embedding = await embedWithRetry(chunks[i]);
    await prisma.docChunk.create({
      data: {
        docId,
        chunkIndex: i,
        content: chunks[i],
        embedding: JSON.stringify(embedding),
      },
    });
  }

  console.log(`RAG: indexed ${chunks.length} chunks for doc ${docId}`);
}

export async function searchRelevantChunks(
  query: string,
  topK = 5
): Promise<{ content: string; docTitle: string; docCategory: string }[]> {
  const queryEmbedding = await embedText(query);

  const chunks = await prisma.docChunk.findMany({
    include: {
      doc: { select: { title: true, category: true, isActive: true } },
    },
  });

  const activeChunks = chunks.filter((c) => c.doc.isActive);

  const scored = activeChunks.map((chunk) => {
    const embedding = JSON.parse(chunk.embedding) as number[];
    const score = cosineSimilarity(queryEmbedding, embedding);
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(({ chunk }) => ({
    content: chunk.content,
    docTitle: chunk.doc.title,
    docCategory: chunk.doc.category,
  }));
}
