"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  FolderOpen,
  Tag,
  X,
  Save,
  Globe,
  FolderPlus,
  AlertCircle,
} from "lucide-react";

interface KBArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
  category: { id: string; name: string };
  tags: { tag: { name: string } }[];
}

interface KBCategory {
  id: string;
  name: string;
  description: string | null;
  _count?: { articles: number };
}

export default function AdminKBPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Article form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Category form state
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catSubmitting, setCatSubmitting] = useState(false);

  useEffect(() => {
    fetchArticles();
    fetchCategories();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/kb/articles?admin=1");
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/kb/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setExcerpt("");
    setCategoryId("");
    setIsPublished(false);
    setTags([]);
    setTagInput("");
    setEditingId(null);
  };

  const handleEdit = (article: KBArticle) => {
    setEditingId(article.id);
    setTitle(article.title);
    setContent("");
    setExcerpt(article.excerpt || "");
    setCategoryId(article.category.id);
    setIsPublished(article.isPublished);
    setTags(article.tags.map((t) => t.tag.name));
    setDialogOpen(true);
    fetch(`/api/kb/articles/${article.id}?admin=1`)
      .then((res) => res.json())
      .then((data) => setContent(data.content));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus artikel ini?")) return;
    try {
      const res = await fetch(`/api/kb/articles/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Artikel berhasil dihapus");
        fetchArticles();
      } else {
        toast.error("Gagal menghapus artikel");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) {
      toast.error("Judul, konten, dan kategori wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        content,
        excerpt: excerpt || content.substring(0, 200),
        categoryId,
        isPublished,
        tags,
      };

      const url = editingId
        ? `/api/kb/articles/${editingId}`
        : "/api/kb/articles";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingId ? "Artikel diperbarui" : "Artikel dibuat");
        setDialogOpen(false);
        resetForm();
        fetchArticles();
      } else {
        toast.error("Gagal menyimpan artikel");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }

    setCatSubmitting(true);
    try {
      const res = await fetch("/api/kb/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName, description: catDesc }),
      });

      if (res.ok) {
        toast.success("Kategori berhasil dibuat");
        setCatName("");
        setCatDesc("");
        setCatDialogOpen(false);
        fetchCategories();
      } else {
        toast.error("Gagal membuat kategori");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setCatSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kategori ini? Semua artikel di kategori ini akan terhapus.")) return;
    try {
      const res = await fetch(`/api/kb/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Kategori berhasil dihapus");
        fetchCategories();
        fetchArticles();
      } else {
        toast.error("Gagal menghapus kategori");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const filteredArticles = articles.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
            Knowledge Base
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Kelola artikel dan panduan
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
            <DialogTrigger className="h-10 border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] rounded-xl text-sm font-semibold inline-flex items-center px-4 transition-colors">
              <FolderPlus className="mr-2 h-4 w-4" />
              Kategori
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-[#1E293B]">
                  Kategori
                </DialogTitle>
              </DialogHeader>

              {/* Create category */}
              <form onSubmit={handleCreateCategory} className="space-y-3 mt-3">
                <div className="flex gap-2">
                  <Input
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Nama kategori baru"
                    className="h-10 border-[#E2E8F0] rounded-xl text-sm flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={catSubmitting}
                    className="h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Deskripsi (opsional)"
                  className="h-10 border-[#E2E8F0] rounded-xl text-sm"
                />
              </form>

              {/* Category list */}
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {categories.length === 0 && (
                  <p className="text-sm text-[#94A3B8] text-center py-4">
                    Belum ada kategori
                  </p>
                )}
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">
                        {cat.name}
                      </p>
                      {cat.description && (
                        <p className="text-xs text-[#94A3B8]">{cat.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-[#94A3B8] hover:text-red-600"
                      onClick={() => handleDeleteCategory(cat.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              className="h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-blue-200 transition-all duration-200 rounded-xl text-sm font-semibold inline-flex items-center px-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Artikel Baru
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-[#1E293B]">
                  {editingId ? "Edit Artikel" : "Artikel Baru"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#1E293B]">
                    Judul
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Judul artikel"
                    className="h-10 border-[#E2E8F0] rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#1E293B]">
                    Kategori
                  </Label>
                  {categories.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Belum ada kategori. Buat kategori dulu dengan tombol "Kategori".</span>
                    </div>
                  ) : (
                    <Select
                      value={categoryId}
                      onValueChange={(value) => setCategoryId(value || "")}
                    >
                      <SelectTrigger className="h-10 border-[#E2E8F0] rounded-xl text-sm w-full">
                        <SelectValue placeholder="Pilih kategori">
                          {categories.find((c) => c.id === categoryId)?.name || "Pilih kategori"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)] !w-auto">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#1E293B]">
                    Ringkasan
                  </Label>
                  <Input
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Ringkasan singkat (opsional)"
                    className="h-10 border-[#E2E8F0] rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#1E293B]">
                    Konten
                  </Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Tulis konten artikel... Gunakan # untuk heading, - untuk list"
                    rows={10}
                    className="border-[#E2E8F0] rounded-xl text-sm resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#1E293B]">
                    Tags
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      placeholder="Tambah tag, tekan Enter"
                      className="h-10 border-[#E2E8F0] rounded-xl text-sm"
                    />
                    <Button type="button" onClick={addTag} variant="outline" className="h-10 rounded-xl">
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs cursor-pointer"
                        onClick={() => removeTag(tag)}
                      >
                        {tag}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="published"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <Label htmlFor="published" className="text-sm font-normal text-[#64748B]">
                    Publish artikel (terlihat publik)
                  </Label>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={submitting || categories.length === 0}
                    className="flex-1 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-sm font-semibold"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {submitting ? "Menyimpan..." : editingId ? "Update" : "Simpan"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                    className="h-10 border-[#E2E8F0] rounded-xl text-sm"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <Input
          placeholder="Cari artikel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-10 border-[#E2E8F0] bg-white rounded-xl text-sm focus:border-[#2563EB]"
        />
      </div>

      {/* Articles Table */}
      <Card className="border border-[#E2E8F0] bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="h-1 bg-[#2563EB]" />
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-sm font-semibold text-[#1E293B]">
            Daftar Artikel ({articles.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-[#2563EB]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="text-left py-3 px-5 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                      Artikel
                    </th>
                    <th className="text-left py-3 px-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="text-center py-3 px-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                      Views
                    </th>
                    <th className="text-center py-3 px-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-5 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.map((article) => (
                    <tr
                      key={article.id}
                      className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="py-3 px-5">
                        <div>
                          <p className="font-medium text-[#1E293B]">
                            {article.title}
                          </p>
                          <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-1">
                            {article.excerpt || "Tidak ada ringkasan"}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          <FolderOpen className="mr-1 h-3 w-3" />
                          {article.category.name}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center text-[#64748B]">
                        <span className="flex items-center justify-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {article.viewCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          className={`text-xs ${
                            article.isPublished
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {article.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#64748B] hover:text-[#2563EB]"
                            onClick={() =>
                              router.push(`/kb/${article.slug}`)
                            }
                          >
                            <Globe className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#64748B] hover:text-[#F97316]"
                            onClick={() => handleEdit(article)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#64748B] hover:text-red-600"
                            onClick={() => handleDelete(article.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filteredArticles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-[#E2E8F0] mb-3" />
              <p className="text-[#64748B] font-medium text-sm">
                Belum ada artikel
              </p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Klik "Artikel Baru" untuk membuat artikel pertama
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
