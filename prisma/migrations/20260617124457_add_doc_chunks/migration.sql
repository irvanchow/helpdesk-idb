-- CreateTable
CREATE TABLE "DocChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "docId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocChunk_docId_fkey" FOREIGN KEY ("docId") REFERENCES "InternalDoc" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
