-- CreateTable
CREATE TABLE "KBCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "KBTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "KBArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KBArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "KBCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KBArticle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KBArticleTag" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("articleId", "tagId"),
    CONSTRAINT "KBArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KBArticle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KBArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "KBTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "KBCategory_name_key" ON "KBCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "KBTag_name_key" ON "KBTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "KBTag_slug_key" ON "KBTag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "KBArticle_slug_key" ON "KBArticle"("slug");
