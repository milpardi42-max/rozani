"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  Flame,
  Grid3X3,
  LayoutList,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { cn, href, t } from "@/lib/utils";
import type { Product, Category, SiteContent } from "@/lib/types";
import { PRODUCT_FAMILIES } from "@/lib/data/families";

/* ─── helpers ─── */
function farsiNum(n: number) {
  return n.toLocaleString("fa-IR");
}

type FlagKey = "featured" | "bestSeller" | "isNew";

const FLAG_META: Record<FlagKey, { label: string; icon: React.ReactNode; color: string }> = {
  featured: {
    label: "منتخب",
    icon: <Star className="h-3 w-3" />,
    color: "border-amber-300 bg-amber-50 text-amber-700",
  },
  bestSeller: {
    label: "پرفروش",
    icon: <Flame className="h-3 w-3" />,
    color: "border-orange-300 bg-orange-50 text-orange-700",
  },
  isNew: {
    label: "جدید",
    icon: <Sparkles className="h-3 w-3" />,
    color: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
};

const FLAGS: FlagKey[] = ["featured", "bestSeller", "isNew"];

/* ─── ProductRow (list view) ─── */
function ProductRow({
  product,
  category,
  viewHref,
  onChange,
  onDelete,
}: {
  product: Product;
  category: Category | null;
  viewHref: string;
  onChange: (updated: Product) => void;
  onDelete: (id: string) => void;
}) {
  const toggle = (f: FlagKey) => onChange({ ...product, [f]: !product[f] });

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-medium sm:flex-row sm:items-center">
      {/* آیکون محصول */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background-secondary text-muted">
        <Package className="h-5 w-5" />
      </div>

      {/* اطلاعات */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={viewHref}
            target="_blank"
            className="truncate text-sm font-semibold text-foreground hover:text-accent hover:underline underline-offset-4 transition-colors"
          >
            {t(product.title, "fa")}
          </Link>
          <code className="rounded bg-background-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted shrink-0">
            {product.sku}
          </code>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          {category && (
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3 opacity-60" />
              {t(category.name, "fa")}
            </span>
          )}
          <span className="tabular-nums font-medium text-foreground/70">
            {farsiNum(product.price.fa)} تومان
          </span>
          {product.colors?.length > 0 && (
            <span className="flex items-center gap-1.5">
              {product.colors.slice(0, 5).map((c, i) => (
                <span
                  key={i}
                  className="h-3 w-3 rounded-full border border-white shadow-sm"
                  style={{ background: c.hex }}
                />
              ))}
            </span>
          )}
        </div>
        <FamilyPicker product={product} onChange={onChange} className="mt-2" />
      </div>

      {/* پرچم‌ها */}
      <div className="flex flex-wrap gap-1.5 shrink-0">
        {FLAGS.map((f) => {
          const on = Boolean(product[f]);
          const m = FLAG_META[f];
          return (
            <button
              key={f}
              type="button"
              onClick={() => toggle(f)}
              title={m.label}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-150",
                on
                  ? m.color
                  : "border-border text-foreground-secondary hover:border-foreground-secondary/70",
              )}
            >
              {m.icon}
              {m.label}
            </button>
          );
        })}
      </div>

      {/* آیکون‌های عملیات */}
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={viewHref}
          target="_blank"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-background-secondary hover:text-foreground transition-colors"
          title="مشاهده در سایت"
        >
          <Eye className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => {
            if (confirm(`آیا از حذف "${t(product.title, "fa")}" مطمئن هستید؟`))
              onDelete(product.id);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-rose-50 hover:text-rose-600 transition-colors"
          title="حذف محصول"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

/* ─── ProductGridCard (grid view) ─── */
function ProductGridCard({
  product,
  category,
  viewHref,
  onChange,
  onDelete,
}: {
  product: Product;
  category: Category | null;
  viewHref: string;
  onChange: (updated: Product) => void;
  onDelete: (id: string) => void;
}) {
  const toggle = (f: FlagKey) => onChange({ ...product, [f]: !product[f] });
  const activeFlags = FLAGS.filter((f) => product[f]);

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-white overflow-hidden transition-shadow hover:shadow-medium">
      {/* header تصویر / آیکون */}
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-background-secondary">
        <Package className="h-12 w-12 text-border" />
        {/* badges */}
        {activeFlags.length > 0 && (
          <div className="absolute inset-x-2 top-2 flex flex-wrap gap-1">
            {activeFlags.map((f) => {
              const m = FLAG_META[f];
              return (
                <span
                  key={f}
                  className={cn(
                    "flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                    m.color,
                  )}
                >
                  {m.icon}
                  {m.label}
                </span>
              );
            })}
          </div>
        )}
        {/* دکمه حذف */}
        <button
          type="button"
          onClick={() => {
            if (confirm(`آیا از حذف "${t(product.title, "fa")}" مطمئن هستید؟`))
              onDelete(product.id);
          }}
          className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-white/80 text-muted opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
          title="حذف محصول"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        {/* دکمه مشاهده */}
        <Link
          href={viewHref}
          target="_blank"
          className="absolute inset-x-2 bottom-2 flex h-8 items-center justify-center gap-1.5 rounded-lg bg-black/70 text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 backdrop-blur-sm"
        >
          <Eye className="h-3.5 w-3.5" />
          مشاهده در سایت
        </Link>
        {/* سوآچ رنگ‌ها */}
        {product.colors?.length > 0 && (
          <div className="absolute right-2 bottom-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {product.colors.slice(0, 5).map((c, i) => (
              <span
                key={i}
                className="h-3.5 w-3.5 rounded-full border-2 border-white shadow"
                style={{ background: c.hex }}
              />
            ))}
          </div>
        )}
      </div>

      {/* محتوا */}
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{t(product.title, "fa")}</p>
            <p className="text-[11px] text-muted">
              {category ? t(category.name, "fa") : "—"}
              <span className="mx-1 opacity-40">·</span>
              <span className="tabular-nums font-medium">{farsiNum(product.price.fa)} ت</span>
            </p>
          </div>
          <code className="shrink-0 rounded bg-background-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted">
            {product.sku}
          </code>
        </div>

        <FamilyPicker product={product} onChange={onChange} />

        {/* کنترل پرچم‌ها */}
        <div className="grid grid-cols-3 gap-1">
          {FLAGS.map((f) => {
            const on = Boolean(product[f]);
            const m = FLAG_META[f];
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggle(f)}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all duration-150",
                  on
                    ? m.color
                    : "border-border text-foreground-secondary hover:border-foreground-secondary/70",
                )}
              >
                {m.icon}
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── انتخاب دسته‌بندی محصول (الگو) ─── */
function FamilyPicker({
  product,
  onChange,
  className,
}: {
  product: Product;
  onChange: (updated: Product) => void;
  className?: string;
}) {
  return (
    <label className={cn("flex items-center gap-2 text-[11px] text-muted", className)}>
      <span className="flex items-center gap-1">
        <Tag className="h-3 w-3 opacity-60" />
        دسته محصول
      </span>
      <select
        value={product.familyId ?? ""}
        onChange={(event) => onChange({ ...product, familyId: event.target.value || null })}
        className="h-7 max-w-[12rem] flex-1 rounded-md border border-border bg-white px-2 text-[11px] text-foreground focus:border-foreground focus:outline-none"
      >
        <option value="">بدون دسته</option>
        {PRODUCT_FAMILIES.map((family) => (
          <option key={family.id} value={family.id}>
            {family.name.fa}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ─── AddProductModal ─── */
function AddProductModal({
  categories,
  onAdd,
  onClose,
}: {
  categories: Category[];
  onAdd: (product: Product) => void;
  onClose: () => void;
}) {
  const [titleFa, setTitleFa] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [familyId, setFamilyId] = useState("");
  const [priceFa, setPriceFa] = useState("");
  const [priceEn, setPriceEn] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleFa.trim() || !sku.trim()) return;
    const newProduct: Product = {
      id: `prod-${Date.now().toString(36)}`,
      sku: sku.trim(),
      slug: sku.trim().toLowerCase().replace(/\s+/g, "-"),
      title: { fa: titleFa.trim(), en: titleEn.trim() || titleFa.trim() },
      description: { fa: "", en: "" },
      categoryId,
      familyId: familyId || null,
      patternId: null,
      artistId: null,
      price: { fa: parseInt(priceFa) || 0, en: parseInt(priceEn) || 0 },
      colors: [],
      sizes: [],
      specs: [],
      materials: { fa: "", en: "" },
      featured: false,
      bestSeller: false,
      isNew: true,
      order: 999,
    };
    onAdd(newProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">افزودن محصول جدید</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-background-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">
              عنوان فارسی *
            </label>
            <input
              required
              type="text"
              dir="rtl"
              value={titleFa}
              onChange={(e) => setTitleFa(e.target.value)}
              placeholder="نام محصول به فارسی"
              className="h-10 w-full rounded-lg border border-border bg-background-secondary px-3 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">
              عنوان انگلیسی
            </label>
            <input
              type="text"
              dir="ltr"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="Product title in English"
              className="h-10 w-full rounded-lg border border-border bg-background-secondary px-3 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                کد SKU *
              </label>
              <input
                required
                type="text"
                dir="ltr"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="PROD-001"
                className="h-10 w-full rounded-lg border border-border bg-background-secondary px-3 font-mono text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                دسته‌بندی
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.name, "fa")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">
              دسته محصول (الگو)
            </label>
            <select
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none"
            >
              <option value="">بدون دسته</option>
              {PRODUCT_FAMILIES.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name.fa}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                قیمت (تومان)
              </label>
              <input
                type="number"
                dir="ltr"
                value={priceFa}
                onChange={(e) => setPriceFa(e.target.value)}
                placeholder="0"
                className="h-10 w-full rounded-lg border border-border bg-background-secondary px-3 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                قیمت (دلار)
              </label>
              <input
                type="number"
                dir="ltr"
                value={priceEn}
                onChange={(e) => setPriceEn(e.target.value)}
                placeholder="0"
                className="h-10 w-full rounded-lg border border-border bg-background-secondary px-3 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm text-foreground-secondary hover:bg-background-secondary transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-[#1e2230] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2a3045]"
            >
              <Plus className="h-3.5 w-3.5" />
              افزودن
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── CategorySection ─── */
function CategorySection({
  category,
  products,
  categoryMap,
  viewHrefFn,
  onProductChange,
  onProductDelete,
  viewMode,
}: {
  category: Category | null;
  products: Product[];
  categoryMap: Record<string, Category>;
  viewHrefFn: (p: Product) => string;
  onProductChange: (updated: Product) => void;
  onProductDelete: (id: string) => void;
  viewMode: "grid" | "list";
}) {
  const [collapsed, setCollapsed] = useState(false);
  const label = category ? t(category.name, "fa") : "بدون دسته‌بندی";

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden shadow-soft">
      {/* سرتیتر دسته */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-right hover:bg-background-secondary transition-colors border-b border-border"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Tag className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
        <span className="rounded-full bg-background-secondary px-2 py-0.5 text-[11px] font-medium text-muted tabular-nums">
          {farsiNum(products.length)} محصول
        </span>
        <span className="text-muted">
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </span>
      </button>

      {/* محتوا */}
      {!collapsed && (
        <div className="p-4">
          {viewMode === "grid" ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((p) => (
                <ProductGridCard
                  key={p.id}
                  product={p}
                  category={categoryMap[p.categoryId] ?? null}
                  viewHref={viewHrefFn(p)}
                  onChange={onProductChange}
                  onDelete={onProductDelete}
                />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {products.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  category={categoryMap[p.categoryId] ?? null}
                  viewHref={viewHrefFn(p)}
                  onChange={onProductChange}
                  onDelete={onProductDelete}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   کامپوننت اصلی ProductsManager
   ════════════════════════════════════════════════ */
export function ProductsManager({
  data,
  update,
}: {
  data: SiteContent;
  update: (patch: Partial<SiteContent>) => void;
}) {
  const locale = "fa";
  const [search, setSearch] = useState("");
  const [filterFlag, setFilterFlag] = useState<FlagKey | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortKey, setSortKey] = useState<"order" | "name" | "price">("order");
  const [sortAsc, setSortAsc] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(true);

  const categoryMap = useMemo(
    () => Object.fromEntries(data.categories.map((c) => [c.id, c])),
    [data.categories],
  );

  /* filter + sort */
  const filtered = useMemo(() => {
    let list = data.products.slice();

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          t(p.title, "fa").toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q),
      );
    }

    if (filterFlag !== "all") list = list.filter((p) => Boolean(p[filterFlag]));

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "order") cmp = (a.order ?? 0) - (b.order ?? 0);
      else if (sortKey === "name") cmp = t(a.title, "fa").localeCompare(t(b.title, "fa"));
      else if (sortKey === "price") cmp = a.price.fa - b.price.fa;
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [data.products, search, filterFlag, sortKey, sortAsc]);

  /* group by category */
  const grouped = useMemo(() => {
    if (!groupByCategory) return [{ category: null, products: filtered }];
    const map = new Map<string | null, Product[]>();
    for (const p of filtered) {
      const key = p.categoryId || null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    // مرتب‌سازی گروه‌ها بر اساس ترتیب categories
    const result: { category: Category | null; products: Product[] }[] = [];
    for (const cat of data.categories) {
      const prods = map.get(cat.id);
      if (prods?.length) {
        result.push({ category: cat, products: prods });
        map.delete(cat.id);
      }
    }
    // باقیمانده (بدون دسته‌بندی)
    if (map.has(null) && map.get(null)!.length) {
      result.push({ category: null, products: map.get(null)! });
    }
    return result;
  }, [filtered, groupByCategory, data.categories]);

  const onProductChange = (updated: Product) => {
    update({ products: data.products.map((p) => (p.id === updated.id ? updated : p)) });
  };

  const onProductDelete = (id: string) => {
    update({ products: data.products.filter((p) => p.id !== id) });
  };

  const onProductAdd = (product: Product) => {
    update({ products: [...data.products, product] });
  };

  const flagFilters: { id: FlagKey | "all"; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "همه", icon: <Grid3X3 className="h-3.5 w-3.5" /> },
    { id: "featured", label: "منتخب", icon: <Star className="h-3.5 w-3.5" /> },
    { id: "bestSeller", label: "پرفروش", icon: <Flame className="h-3.5 w-3.5" /> },
    { id: "isNew", label: "جدید", icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  /* stats */
  const total = data.products.length;
  const featuredCount = data.products.filter((p) => p.featured).length;
  const bestSellerCount = data.products.filter((p) => p.bestSeller).length;
  const isNewCount = data.products.filter((p) => p.isNew).length;
  const categoryCount = new Set(data.products.map((p) => p.categoryId)).size;

  const statsCards = [
    { label: "کل محصولات", value: total, icon: <ShoppingBag className="h-4 w-4" />, color: "text-foreground bg-background-secondary" },
    { label: "دسته‌بندی", value: categoryCount, icon: <Tag className="h-4 w-4" />, color: "text-accent bg-accent/10" },
    { label: "منتخب", value: featuredCount, icon: <Star className="h-4 w-4" />, color: "text-amber-700 bg-amber-50" },
    { label: "پرفروش", value: bestSellerCount, icon: <Flame className="h-4 w-4" />, color: "text-orange-700 bg-orange-50" },
    { label: "جدید", value: isNewCount, icon: <Sparkles className="h-4 w-4" />, color: "text-emerald-700 bg-emerald-50" },
  ];

  return (
    <div className="space-y-5">
      {/* مودال افزودن */}
      {showAdd && (
        <AddProductModal
          categories={data.categories}
          onAdd={onProductAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* ── عنوان ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <ShoppingBag className="h-4 w-4" />
            </span>
            محصولات
          </h1>
          <p className="mt-1 text-sm text-muted">مدیریت کامل محصولات فروشگاه — افزودن، حذف و کنترل پرچم‌ها</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1e2230] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2a3045]"
        >
          <Plus className="h-4 w-4" />
          محصول جدید
        </button>
      </div>

      {/* ── کارت‌های آمار ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {statsCards.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-white px-3 py-3 text-center shadow-soft"
          >
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", s.color)}>
              {s.icon}
            </div>
            <p className="text-xl font-bold tabular-nums text-foreground">{farsiNum(s.value)}</p>
            <p className="text-[10px] text-muted leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── نوار فیلتر / جستجو ── */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-soft space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* جستجو */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              dir="rtl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در عنوان یا کد SKU…"
              className="h-10 w-full rounded-lg border border-border bg-background-secondary pr-9 pl-3 text-sm text-foreground placeholder:text-muted transition-[border-color,box-shadow] focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* سورت */}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as "order" | "name" | "price")}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none"
            >
              <option value="order">ترتیب</option>
              <option value="name">نام</option>
              <option value="price">قیمت</option>
            </select>
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-muted hover:bg-background-secondary transition-colors"
              title={sortAsc ? "صعودی" : "نزولی"}
            >
              {sortAsc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </button>

            {/* گروه‌بندی */}
            <button
              type="button"
              onClick={() => setGroupByCategory((v) => !v)}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
                groupByCategory
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-foreground-secondary hover:bg-background-secondary",
              )}
              title="گروه‌بندی بر اساس دسته‌بندی"
            >
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">گروه‌بندی</span>
            </button>

            {/* نمای گرید / لیست */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex h-10 w-10 items-center justify-center transition-colors",
                  viewMode === "grid"
                    ? "bg-foreground text-white"
                    : "bg-white text-muted hover:bg-background-secondary",
                )}
                title="نمای شبکه"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex h-10 w-10 items-center justify-center border-r border-border transition-colors",
                  viewMode === "list"
                    ? "bg-foreground text-white"
                    : "bg-white text-muted hover:bg-background-secondary",
                )}
                title="نمای فهرست"
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* چیپ‌های فیلتر */}
        <div className="flex flex-wrap gap-2">
          {flagFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterFlag(f.id)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                filterFlag === f.id
                  ? "border-foreground bg-foreground text-white"
                  : "border-border text-foreground-secondary hover:border-foreground-secondary",
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* شمارنده نتایج */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted">
          {farsiNum(filtered.length)} محصول
          {filtered.length !== data.products.length && ` از ${farsiNum(data.products.length)}`}
        </p>
        {(search || filterFlag !== "all") && (
          <button
            type="button"
            onClick={() => { setSearch(""); setFilterFlag("all"); }}
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <X className="h-3 w-3" />
            پاک کردن فیلترها
          </button>
        )}
      </div>

      {/* ── لیست/گرید محصولات ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background-secondary text-muted">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-foreground">محصولی یافت نشد</p>
          <p className="text-xs text-muted">فیلترها را تغییر دهید یا محصول جدید اضافه کنید</p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="mt-1 flex items-center gap-1.5 rounded-lg bg-[#1e2230] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2a3045]"
          >
            <Plus className="h-4 w-4" />
            افزودن محصول
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ category, products }, idx) => (
            <CategorySection
              key={category?.id ?? "uncategorized"}
              category={category}
              products={products}
              categoryMap={categoryMap}
              viewHrefFn={(p) => href(locale, `/shop/${p.slug}`)}
              onProductChange={onProductChange}
              onProductDelete={onProductDelete}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
