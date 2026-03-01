import api from "@/services/api"

const db = { kind: "laravel-api-db" }

function normalizeCollectionName(name = "") {
  const lowered = String(name).toLowerCase().trim()
  if (lowered === "users") return "users"
  if (lowered === "jobs") return "jobs"
  if (lowered === "applications") return "applications"
  if (lowered === "logs") return "logs"
  return lowered
}

function collection(_db, ...path) {
  return { __type: "collection", name: normalizeCollectionName(path.join("/")) }
}

function doc(...parts) {
  const normalized = parts.filter((p) => typeof p === "string" && p.trim())
  if (normalized.length >= 2) {
    return {
      __type: "doc",
      collection: normalizeCollectionName(normalized[0]),
      id: String(normalized[1]),
    }
  }
  return { __type: "doc", collection: "", id: "" }
}

function where(field, op, value) {
  return { __type: "where", field, op, value }
}

function query(target, ...constraints) {
  return { __type: "query", target, constraints }
}

function serverTimestamp() {
  return new Date().toISOString()
}

function createQuerySnapshot(items = []) {
  const docs = items.map((item, index) => {
    const safe = item && typeof item === "object" ? item : {}
    return {
      id: String(safe.id || `row-${index + 1}`),
      data: () => ({ ...safe }),
    }
  })
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach(cb) {
      docs.forEach(cb)
    },
  }
}

function createDocSnapshot(item) {
  return {
    id: String(item?.id || ""),
    exists: () => !!item,
    data: () => (item ? { ...item } : undefined),
  }
}

function getTargetInfo(targetLike) {
  if (!targetLike) return { collectionName: "", constraints: [] }
  if (targetLike.__type === "query") {
    return {
      collectionName: targetLike.target?.name || "",
      constraints: Array.isArray(targetLike.constraints) ? targetLike.constraints : [],
    }
  }
  if (targetLike.__type === "collection") {
    return { collectionName: targetLike.name || "", constraints: [] }
  }
  return { collectionName: "", constraints: [] }
}

function buildParams(constraints = []) {
  const params = {}
  constraints.forEach((c) => {
    if (!c || c.__type !== "where") return
    if (c.op !== "==") return
    params[c.field] = c.value
  })
  return params
}

async function fetchCollection(targetLike) {
  const { collectionName, constraints } = getTargetInfo(targetLike)
  const params = buildParams(constraints)
  if (!collectionName) return []

  const path = `/${collectionName}`
  const res = await api.get(path, { params })
  return Array.isArray(res.data) ? res.data : []
}

function onSnapshot(targetLike, onNext, onError) {
  const nextCb = typeof onNext === "function" ? onNext : onNext?.next
  const errorCb = typeof onError === "function" ? onError : onNext?.error
  let disposed = false

  const pull = async () => {
    if (disposed) return
    try {
      const rows = await fetchCollection(targetLike)
      if (disposed) return
      nextCb?.(createQuerySnapshot(rows))
    } catch (err) {
      if (disposed) return
      errorCb?.(err)
    }
  }

  void pull()
  // Faster polling for dashboard/topbar notifications and list freshness.
  const timer = setInterval(pull, 3000)

  const onFocus = () => {
    void pull()
  }
  const onVisibilityChange = () => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      void pull()
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("focus", onFocus)
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange)
  }

  return () => {
    disposed = true
    clearInterval(timer)
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", onFocus)
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }
}

async function getDocs(targetLike) {
  const rows = await fetchCollection(targetLike)
  return createQuerySnapshot(rows)
}

async function getDoc(targetDoc) {
  if (!targetDoc?.collection || !targetDoc?.id) return createDocSnapshot(null)
  try {
    const res = await api.get(`/${targetDoc.collection}/${targetDoc.id}`)
    return createDocSnapshot(res.data || null)
  } catch {
    return createDocSnapshot(null)
  }
}

async function addDoc(targetCollection, payload = {}) {
  const name = targetCollection?.name
  if (!name) throw new Error("Invalid collection target")
  const res = await api.post(`/${name}`, payload)
  const id = String(res.data?.id || payload.id || "")
  return { id, data: () => ({ ...payload, id }) }
}

async function updateDoc(targetDoc, payload = {}) {
  if (!targetDoc?.collection || !targetDoc?.id) {
    throw new Error("Invalid document target")
  }
  await api.put(`/${targetDoc.collection}/${targetDoc.id}`, payload)
}

async function deleteDoc(targetDoc) {
  if (!targetDoc?.collection || !targetDoc?.id) {
    throw new Error("Invalid document target")
  }
  await api.delete(`/${targetDoc.collection}/${targetDoc.id}`)
}

function writeBatch() {
  const updates = []
  return {
    update(targetDoc, payload) {
      updates.push({ targetDoc, payload })
    },
    async commit() {
      await Promise.all(updates.map((u) => updateDoc(u.targetDoc, u.payload)))
    },
  }
}

export {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
}
