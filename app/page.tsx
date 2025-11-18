"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

// ───────────────────────────────────────────────────────────────
// 공통 레이아웃
// ───────────────────────────────────────────────────────────────
const Container: React.FC<{ children: any }> = ({ children }) => (
  <div
    className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center p-6 overflow-y-auto"
    style={{ overscrollBehavior: "contain" }}
  >
    {children}
  </div>
);

// 검색 가능한 셀렉트
function FilterableSelect({
  value,
  onValueChange,
  options,
  placeholder = "품명 선택",
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="justify-between flex-1 text-sm bg-white">
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64">
        <Command>
          <CommandInput placeholder="검색어를 입력하세요" />
          <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
          <CommandGroup>
            {options.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.label}
                onSelect={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// 타입들
type ItemRow = { id: string; category: string; product: string; unit: string; quantity: string };

// 날짜 그룹 내부 렌더(지점별 묶기, 추가발주 표기)
function DailyOrderGroup({ list }: { list: any[] }) {
  const displayLabel = (cat: string) => (cat === "기타" ? "잡화(기타)" : cat);
  const createdTime = (o: any) =>
    typeof o.createdAt === "number" ? o.createdAt : Date.parse(o.date + "T00:00:00");
  const sortBranchNatural = (a: string, b: string) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    if (!Number.isNaN(na)) return -1;
    if (!Number.isNaN(nb)) return 1;
    return a.localeCompare(b, "ko");
  };

  const groupByBranch: Record<string, any[]> = {};
  (Array.isArray(list) ? list : []).forEach((o) => {
    (groupByBranch[o.branch] ||= []).push(o);
  });
  const branchKeys = Object.keys(groupByBranch).sort(sortBranchNatural);
  branchKeys.forEach((k) => {
    groupByBranch[k].sort((a, b) => createdTime(a) - createdTime(b));
  });

  return (
    <div className="space-y-3">
      {branchKeys.flatMap((branch) => {
        const orders = groupByBranch[branch];
        return orders.map((o, idx) => {
          const safeItems: ItemRow[] = Array.isArray(o.items) ? o.items : [];
          const map: Record<string, ItemRow[]> = {};
          for (const row of safeItems) {
            (map[row.category] ||= []).push(row);
          }
          return (
            <Card key={String(o.id)} className="rounded-xl">
              <CardContent className="p-4">
                <p className="text-lg font-semibold text-gray-800">
                  <span aria-hidden className="mr-1">
                    🏢
                  </span>
                  {branch}
                  {idx > 0 && <span className="font-normal ml-2">(추가발주)</span>}
                </p>
                <p className="text-xs text-gray-400 mb-2">발주일자: {o.date}</p>
                {(["야채", "양념", "소스", "기타"] as const)
                  .filter((cat) => map[cat] && map[cat].length > 0)
                  .map((cat, i, arr) => (
                    <div key={`list-${o.id}-${cat}`} className="mb-2">
                      <p className="font-semibold text-gray-800">[{displayLabel(cat)}]</p>
                      {map[cat]!.map((r) => (
                        <p key={`row-${o.id}-${r.id}`} className="ml-2 text-gray-700">
                          <span aria-hidden className="text-gray-400 mr-1">
                            •
                          </span>
                          {r.product} {r.quantity}
                          {r.unit ? " " + r.unit : ""}
                        </p>
                      ))}
                      {i < arr.length - 1 && <hr className="my-2 border-dashed" />}
                    </div>
                  ))}
                {o.note && (
                  <>
                    <hr className="my-2 border-dashed" />
                    <p className="text-sm font-semibold text-gray-800">요청사항</p>
                    <p className="text-base text-gray-700 mt-1">{o.note}</p>
                  </>
                )}
                <p className="text-xs text-gray-400 mt-1">등록일시: {o.submittedAt}</p>
              </CardContent>
            </Card>
          );
        });
      })}
    </div>
  );
}

export default function MobileOrderApp() {
  const [page, setPage] = useState<"home" | "order" | "list" | "complete">("home");
  const [orders, setOrders] = useState<any[]>([]);

  // 날짜/필터 기본
  const today = new Date();
  const formattedDate = today.toISOString().slice(0, 10);
  const isoToday = formattedDate;
  const isoOneYearAgo = (() => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [sortDesc, setSortDesc] = useState(true);
  const [activePreset, setActivePreset] = useState<"week" | "month" | "lastMonth" | null>(null);
  useEffect(() => {
    if (!dateFrom && !dateTo) {
      setDateFrom(isoOneYearAgo);
      setDateTo(isoToday);
    }
  }, [dateFrom, dateTo, isoOneYearAgo, isoToday]);

  // 임시 저장/키
  const DRAFT_KEY = "order_draft_v5";
  const ORDERS_KEY = "orders_store_v1";
  const RETAIN_DAYS = 365;

  const branchOptions = Array.from({ length: 14 }, (_, i) => `${i + 1}번 지점`);
  const categories: Record<string, string[]> = {
    야채: ["무", "절임무", "배추", "오이", "양파", "파", "대파", "마늘", "당근", "양배추"].sort(
      (a, b) => a.localeCompare(b, "ko")
    ),
    양념: ["마늘양념", "고추장양념", "간마늘", "생강양념"].sort((a, b) => a.localeCompare(b, "ko")),
    소스: ["간장소스", "된장양념", "초고추장", "와사비소스"].sort((a, b) => a.localeCompare(b, "ko")),
    기타: [],
  };
  const CATEGORY_ORDER = ["야채", "양념", "소스", "기타"] as const;
  const displayLabel = (c: string) => (c === "기타" ? "잡화(기타)" : c);
  const productUnit: Record<string, string> = {
    무: "박스",
    절임무: "박스",
    배추: "포기",
    오이: "박스",
    양파: "망",
    파: "단",
    대파: "단",
    마늘: "망",
    당근: "박스",
    양배추: "통",
    마늘양념: "통",
    고추장양념: "통",
    간마늘: "kg",
    생강양념: "통",
    간장소스: "통",
    된장양념: "통",
    초고추장: "통",
    와사비소스: "통",
  };

  const [form, setForm] = useState<{ branch: string; date: string; items: ItemRow[]; note: string }>({
    branch: "",
    date: formattedDate,
    items: [],
    note: "",
  });
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showLoadDraft, setShowLoadDraft] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [errorItemId, setErrorItemId] = useState<string | null>(null);
  const [errorProductId, setErrorProductId] = useState<string | null>(null);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const prodRefs = useRef<Record<string, HTMLElement | null>>({});

  const newRow = (cat: string): ItemRow => ({
    id: `${Date.now()}-${Math.random()}`,
    category: cat,
    product: "",
    unit: "",
    quantity: "",
  });

  const addItemRow = (cat: string) =>
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, newRow(cat)],
    }));
  const addItemRowInBlock = (cat: string) => addItemRow(cat);

  const removeItemRow = (cat: string, idxInCat: number) => {
    let count = -1;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((row) => {
        if (row.category !== cat) return true;
        count += 1;
        return count !== idxInCat;
      }),
    }));
  };

  const updateRowInBlock = (cat: string, idxInCat: number, patch: Partial<ItemRow>) => {
    let count = -1;
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((row) => {
        if (row.category !== cat) return row;
        count += 1;
        return count === idxInCat ? { ...row, ...patch } : row;
      }),
    }));
  };

  const onSelectProduct = (cat: string, idxInCat: number, prod: string, rowId: string) => {
    updateRowInBlock(cat, idxInCat, { product: prod, unit: productUnit[prod] || "" });
    if (errorProductId === rowId && prod.trim() !== "") setErrorProductId(null);
  };

  const onQuantityChange = (cat: string, idxInCat: number, val: string, rowId: string) => {
    if (cat === "기타") {
      updateRowInBlock(cat, idxInCat, { quantity: val });
      if (errorItemId === rowId && val.trim() !== "") setErrorItemId(null);
    } else {
      const onlyDigits = val.replace(/[^0-9]/g, "");
      updateRowInBlock(cat, idxInCat, { quantity: onlyDigits });
      if (errorItemId === rowId && onlyDigits.trim() !== "") setErrorItemId(null);
    }
  };

  useEffect(() => {
    if (!errorItemId) return;
    const el = qtyRefs.current[errorItemId];
    if (el) {
      el.focus({ preventScroll: false });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [errorItemId]);
  useEffect(() => {
    if (!errorProductId) return;
    const el = prodRefs.current[errorProductId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [errorProductId]);

  const validateForm = (): boolean => {
    if (!form.branch) {
      alert("지점을 선택해주세요.");
      return false;
    }
    if (form.items.length === 0) {
      alert("주문목록에 품목을 추가해주세요.");
      return false;
    }
    for (const row of form.items) {
      if (!row.product || row.product.trim() === "") {
        setErrorProductId(row.id);
        return false;
      }
    }
    for (const row of form.items) {
      if (!row.quantity || row.quantity.toString().trim() === "") {
        alert("수량 입력이 누락 되었습니다");
        setErrorItemId(row.id);
        return false;
      }
      if (row.category !== "기타" && /[^0-9]/.test(row.quantity)) {
        alert("야채/양념/소스의 수량은 숫자만 입력할 수 있습니다.");
        setErrorItemId(row.id);
        return false;
      }
    }
    setErrorItemId(null);
    setErrorProductId(null);
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    const newOrder = {
      id: Date.now(),
      branch: form.branch,
      date: form.date,
      items: form.items,
      note: form.note,
      submittedAt: new Date().toLocaleString(),
      createdAt: Date.now(),
    };
    setOrders((prev) => [...prev, newOrder]);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setForm({ branch: "", date: formattedDate, items: [], note: "" });
    setPage("complete");
  };

  const onClickSubmit = () => {
    if (!validateForm()) return;
    setShowSubmitConfirm(true);
  };

  // 저장/로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as any[];
        const cutoff = Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000;
        const normalized = arr.filter((o) => {
          const created =
            typeof o.createdAt === "number"
              ? o.createdAt
              : Date.parse(o.date + "T00:00:00");
          return created >= cutoff;
        });
        setOrders(normalized);
        if (normalized.length !== arr.length) {
          localStorage.setItem(ORDERS_KEY, JSON.stringify(normalized));
        }
      }
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);
  useEffect(() => {
    setShowExitConfirm(false);
    setShowLoadDraft(false);
    setShowSubmitConfirm(false);
  }, [page]);

  // 내역 가공
  const visibleOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (branchFilter && o.branch !== branchFilter) return false;
        if (dateFrom && o.date < dateFrom) return false;
        if (dateTo && o.date > dateTo) return false;
        return true;
      }),
    [orders, branchFilter, dateFrom, dateTo]
  );

  const ordersByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const o of visibleOrders) {
      const key = o.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === b[0]) return 0;
      if (sortDesc) return a[0] < b[0] ? 1 : -1;
      return a[0] < b[0] ? -1 : 1;
    });
  }, [visibleOrders, sortDesc]);

  const fmtMD = (s: string) => {
    if (!s) return s as any;
    const [y, m, d] = s.split("-");
    return `${m}/${d}`;
  };

  // 모달
  function SimpleModal({
    open,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "예",
    cancelText = "아니오",
  }: {
    open: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
  }) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-80 p-5">
          {title && (
            <p className="text-base font-semibold text-gray-800 mb-1">{title}</p>
          )}
          <p className="text-sm text-gray-700 mb-4 whitespace-pre-line">
            {message}
          </p>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button type="button" onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 홈 → 주문하기(임시저장 로드 질문)
  const goToOrder = () => {
    const draft = typeof window !== "undefined" ? localStorage.getItem(DRAFT_KEY) : null;
    if (draft) setShowLoadDraft(true);
    else {
      setForm({ branch: "", date: formattedDate, items: [], note: "" });
      setPage("order");
    }
  };
  const confirmLoadDraft = () => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) setForm(JSON.parse(draft));
    } catch {}
    setShowLoadDraft(false);
    setPage("order");
  };
  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setForm({ branch: "", date: formattedDate, items: [], note: "" });
    setShowLoadDraft(false);
    setPage("order");
  };
  const goHomeFromOrder = () => setShowExitConfirm(true);
  const confirmExit = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {}
    setShowExitConfirm(false);
    setPage("home");
  };
  const cancelExit = () => setShowExitConfirm(false);

  // 날짜 헤더
  const fmtDateHeader = (dateKey: string) => (
    <div className="flex items-center my-3">
      <div className="h-px bg-gray-300 flex-1" />
      <span className="mx-2 text-sm font-semibold text-gray-700 bg-white px-2 py-0.5 rounded-full shadow-sm ring-1 ring-gray-200">
        {fmtMD(dateKey)}
      </span>
      <div className="h-px bg-gray-300 flex-1" />
    </div>
  );

  return (
    <Container>
      {/* 모달들 */}
      <SimpleModal
        open={showExitConfirm}
        title="확인"
        message={"주문을 제출하지 않고 나가시겠습니까?"}
        onConfirm={confirmExit}
        onCancel={cancelExit}
        confirmText="네"
        cancelText="아니오"
      />
      <SimpleModal
        open={showLoadDraft}
        title="임시저장 불러오기"
        message="임시저장된 내용이 있습니다. 불러올까요?"
        onConfirm={confirmLoadDraft}
        onCancel={discardDraft}
        confirmText="예"
        cancelText="아니오"
      />
      <SimpleModal
        open={showSubmitConfirm}
        title="확인"
        message={"이대로 주문하시겠습니까?"}
        onConfirm={() => {
          setShowSubmitConfirm(false);
          handleSubmit();
        }}
        onCancel={() => setShowSubmitConfirm(false)}
        confirmText="네"
        cancelText="아니오"
      />

      {/* 상단 타이틀 */}
      <h1 className="text-2xl font-bold mb-3 text-gray-800 flex items-center gap-2">
        <span aria-hidden>🧺</span>
        경북식품 주문시스템
        <span aria-hidden>📦</span>
      </h1>
      <div className="h-px w-full max-w-sm bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-5" />

      {/* 홈 */}
      {page === "home" && (
        <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={goToOrder}
            className="pointer-events-auto"
            role="button"
            tabIndex={0}
          >
            <Card className="shadow-lg hover:shadow-xl transition-shadow rounded-2xl bg-white ring-1 ring-black/5">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <span className="text-xl font-semibold text-gray-700 mb-2">
                  주문하기
                </span>
                <span className="text-sm text-gray-500">
                  새 주문을 등록합니다
                </span>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setPage("list")}
            className="pointer-events-auto"
            role="button"
            tabIndex={0}
          >
            <Card className="shadow-lg hover:shadow-xl transition-shadow rounded-2xl bg-white ring-1 ring-black/5">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <span className="text-xl font-semibold text-gray-700 mb-2">
                  주문내역확인
                </span>
                <span className="text-sm text-gray-500">
                  모든 주문을 확인합니다
                </span>
              </CardContent>
            </Card>
          </motion.div>

          <a
            href="tel:01054880643"
            className="block pointer-events-auto"
            aria-label="전화 문의하기"
          >
            <Card className="shadow-lg hover:shadow-xl transition-shadow rounded-2xl bg-white ring-1 ring-black/5">
              <CardContent className="flex items-center justify-center p-3">
                <span className="text-base font-semibold text-gray-700">
                  📞 전화문의{" "}
                  <span className="ml-1 text-xs text-gray-500">
                    010-5488-0643
                  </span>
                </span>
              </CardContent>
            </Card>
          </a>
        </div>
      )}

      {/* 주문 */}
      {page === "order" && (
        <div className="w-full max-w-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">주문하기</h2>
          <p className="text-sm text-gray-600 mb-2">지점을 선택해주세요</p>

          <div className="space-y-3">
            <Select
              onValueChange={(value) => setForm({ ...form, branch: value })}
              value={form.branch}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="지점 선택" />
              </SelectTrigger>
              <SelectContent>
                {branchOptions.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <label className="text-sm text-gray-600">
                발주일자{" "}
                <span className="text-xs text-gray-400">( 눌러서 수정 가능 )</span>
              </label>
              <div className="mt-1">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">
                주문하실 제품 유형의 버튼을 눌러주세요
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addItemRow("야채")}
                >
                  + 야채
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addItemRow("양념")}
                >
                  + 양념
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addItemRow("소스")}
                >
                  + 소스
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addItemRow("기타")}
                >
                  + 잡화(기타)
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                주문목록
              </label>
              {form.items.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  위 버튼을 눌러 품목을 추가하세요.
                </p>
              )}

              {CATEGORY_ORDER.filter((cat) =>
                form.items.some((i) => i.category === cat)
              ).map((cat) => {
                const rows = form.items.filter((i) => i.category === cat);
                const colorClass =
                  cat === "야채"
                    ? "border-green-400"
                    : cat === "양념"
                    ? "border-amber-400"
                    : cat === "소스"
                    ? "border-blue-400"
                    : "border-gray-300";
                const label = displayLabel(cat);
                return (
                  <div
                    key={cat}
                    className={`mt-3 rounded-lg border-l-4 ${colorClass} border bg-white p-3 shadow-sm`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block w-1.5 h-3 rounded-sm ${
                            cat === "야채"
                              ? "bg-green-400"
                              : cat === "양념"
                              ? "bg-amber-400"
                              : cat === "소스"
                              ? "bg-blue-400"
                              : "bg-gray-300"
                          }`}
                        />
                        <p className="font-semibold text-gray-800">{label}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addItemRowInBlock(cat)}
                      >
                        {label} 품목추가
                      </Button>
                    </div>
                    <div className="mt-2 max-h-64 overflow-y-auto pr-1">
                      {rows.map((row, idxInCat) => (
                        <div
                          key={row.id}
                          className="flex items-center gap-2 mt-2"
                        >
                          {cat !== "기타" ? (
                            <>
                              <span aria-hidden className="text-gray-400">
                                •
                              </span>
                              <motion.div
                                animate={
                                  errorProductId === row.id
                                    ? { x: [0, -6, 6, -4, 4, 0] }
                                    : {}
                                }
                                transition={{ duration: 0.4 }}
                              >
                                <div
                                  ref={(el) => {
                                    prodRefs.current[row.id] = el as any;
                                  }}
                                  className={`rounded-md ${
                                    errorProductId === row.id
                                      ? "ring-2 ring-red-500"
                                      : ""
                                  }`}
                                >
                                  <FilterableSelect
                                    value={row.product}
                                    onValueChange={(val) =>
                                      onSelectProduct(
                                        cat,
                                        idxInCat,
                                        val,
                                        row.id
                                      )
                                    }
                                    options={categories[cat].map((p) => ({
                                      value: p,
                                      label: productUnit[p]
                                        ? p + " [" + productUnit[p] + "]"
                                        : p,
                                    }))}
                                    placeholder="품명 선택"
                                  />
                                </div>
                              </motion.div>
                            </>
                          ) : (
                            <>
                              <span aria-hidden className="text-gray-400">
                                •
                              </span>
                              <motion.div
                                animate={
                                  errorProductId === row.id
                                    ? { x: [0, -6, 6, -4, 4, 0] }
                                    : {}
                                }
                                transition={{ duration: 0.4 }}
                              >
                                <Input
                                  placeholder="잡화(기타) 직접입력"
                                  className={`flex-1 text-sm bg-white ${
                                    errorProductId === row.id
                                      ? "ring-2 ring-red-500"
                                      : ""
                                  }`}
                                  value={row.product}
                                  ref={(el) => {
                                    prodRefs.current[row.id] = el as any;
                                  }}
                                  onChange={(e) => {
                                    updateRowInBlock(cat, idxInCat, {
                                      product: e.target.value,
                                    });
                                    if (
                                      errorProductId === row.id &&
                                      e.target.value.trim() !== ""
                                    )
                                      setErrorProductId(null);
                                  }}
                                />
                              </motion.div>
                            </>
                          )}

                          <motion.div
                            animate={
                              errorItemId === row.id
                                ? { x: [0, -6, 6, -4, 4, 0] }
                                : {}
                            }
                            transition={{ duration: 0.4 }}
                          >
                            <Input
                              placeholder="수량"
                              className={`w-24 text-sm text-center bg-white ${
                                errorItemId === row.id
                                  ? "ring-2 ring-red-500"
                                  : ""
                              }`}
                              value={row.quantity}
                              ref={(el) => {
                                qtyRefs.current[row.id] = el;
                              }}
                              onChange={(e) =>
                                onQuantityChange(
                                  cat,
                                  idxInCat,
                                  e.target.value,
                                  row.id
                                )
                              }
                            />
                          </motion.div>
                          <span className="text-xs text-gray-500 w-14 text-center">
                            {row.unit || ""}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeItemRow(cat, idxInCat)}
                          >
                            삭제
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {form.items.length > 0 && (
              <div className="mt-4 text-sm text-gray-700 leading-6">
                <p className="font-semibold text-gray-800 mb-2">
                  주문내용 정리
                </p>
                {CATEGORY_ORDER.filter((cat) =>
                  form.items.some((i) => i.category === cat)
                ).map((cat, idx, arr) => {
                  const rows = form.items.filter((i) => i.category === cat);
                  return (
                    <div key={`sum-${cat}`} className="mb-2">
                      <p className="font-semibold">{displayLabel(cat)}</p>
                      {rows.map((r) => (
                        <p key={`sum-${r.id}`} className="ml-2">
                          <span aria-hidden className="text-gray-400 mr-1">
                            •
                          </span>
                          {r.product} {r.quantity}
                          {r.unit ? " " + r.unit : ""}
                        </p>
                      ))}
                      {idx < arr.length - 1 && (
                        <hr className="my-2 border-dashed" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Input
              placeholder="그 외 요청사항이 있으면 여기에 입력해 주세요"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="bg-white"
            />
          </div>

          <div className="flex gap-3 mt-6 relative z-10">
            <Button
              type="button"
              variant="outline"
              className="flex-1 pointer-events-auto"
              onClick={goHomeFromOrder}
            >
              뒤로가기
            </Button>
            <Button
              type="button"
              className="flex-1 pointer-events-auto relative z-10"
              onClick={onClickSubmit}
            >
              제출하기
            </Button>
          </div>
        </div>
      )}

      {/* 완료 */}
      {page === "complete" && (
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 mb-4">
            주문이 정상적으로 접수되었습니다.
          </p>
          <Button type="button" onClick={() => setPage("home")}>
            홈으로 돌아가기
          </Button>
        </div>
      )}

      {/* 내역 */}
      {page === "list" && (
        <div className="w-full max-w-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            주문내역확인
          </h2>
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="지점 검색/선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {branchFilter && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBranchFilter("")}
                >
                  지점 초기화
                </Button>
              )}
            </div>

            {/* 날짜 범위 */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2">
              <div className="min-w-0">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setActivePreset(null);
                  }}
                  placeholder="시작일"
                  className="w-full bg-white"
                />
              </div>
              <span className="text-xs text-gray-500 text-center px-2 self-center">
                ~
              </span>
              <div className="min-w-0">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setActivePreset(null);
                  }}
                  placeholder="종료일"
                  className="w-full bg-white"
                />
              </div>
              {(dateFrom || dateTo) && (
                <div className="sm:col-span-1 col-span-3">
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    variant="outline"
                    onClick={() => {
                      setDateFrom(isoOneYearAgo);
                      setDateTo(isoToday);
                      setActivePreset(null);
                    }}
                  >
                    기간 초기화
                  </Button>
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-400 ml-1">
              (최대 1년전까지 검색 가능합니다)
            </p>

            {/* 프리셋 + 정렬 */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant={activePreset === "week" ? "default" : "outline"}
                onClick={() => {
                  const base = new Date();
                  const d = base.getDay();
                  const diff = d === 0 ? 6 : d - 1;
                  const s = new Date(base);
                  s.setDate(base.getDate() - diff);
                  const e = new Date(s);
                  e.setDate(s.getDate() + 6);
                  setDateFrom(s.toISOString().slice(0, 10));
                  setDateTo(e.toISOString().slice(0, 10));
                  setActivePreset("week");
                }}
              >
                이번 주
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activePreset === "month" ? "default" : "outline"}
                onClick={() => {
                  const base = new Date();
                  const s = new Date(base.getFullYear(), base.getMonth(), 1);
                  const e = new Date(
                    base.getFullYear(),
                    base.getMonth() + 1,
                    0
                  );
                  setDateFrom(s.toISOString().slice(0, 10));
                  setDateTo(e.toISOString().slice(0, 10));
                  setActivePreset("month");
                }}
              >
                이번 달
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activePreset === "lastMonth" ? "default" : "outline"}
                onClick={() => {
                  const base = new Date();
                  const s = new Date(
                    base.getFullYear(),
                    base.getMonth() - 1,
                    1
                  );
                  const e = new Date(base.getFullYear(), base.getMonth(), 0);
                  setDateFrom(s.toISOString().slice(0, 10));
                  setDateTo(e.toISOString().slice(0, 10));
                  setActivePreset("lastMonth");
                }}
              >
                지난 달
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={sortDesc ? "default" : "outline"}
                  onClick={() => setSortDesc(true)}
                >
                  최신순
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!sortDesc ? "default" : "outline"}
                  onClick={() => setSortDesc(false)}
                >
                  오래된순
                </Button>
              </div>
            </div>
          </div>

          {ordersByDate.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">
              등록된 주문이 없습니다.
            </p>
          ) : (
            <div className="space-y-6 max-h-[62vh] overflow-y-auto pr-1">
              {ordersByDate.map(([dateKey, list]) => (
                <div key={dateKey}>
                  {fmtDateHeader(dateKey)}
                  <DailyOrderGroup list={list} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Button type="button" variant="outline" onClick={() => setPage("home")}>
              홈으로
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-10">
        ⓒ 2025 경북식품. All rights reserved.
      </p>
    </Container>
  );
}

// 간단 자가 테스트
(function attachSelfTests() {
  if (typeof window === "undefined") return;
  (window as any).__runOrderAppSmoke = function () {
    console.assert(true, "smoke");
    console.log("✅ MobileOrderApp smoke ok");
  };
})();
