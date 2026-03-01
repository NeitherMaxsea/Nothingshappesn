import api from "@/services/api"

const listeners = new Set()

function readCurrentUser() {
  const uid = String(
    localStorage.getItem("uid") ||
    localStorage.getItem("userUid") ||
    localStorage.getItem("sessionUid") ||
    ""
  ).trim()
  const email = String(localStorage.getItem("userEmail") || "").trim()
  const accountType = String(localStorage.getItem("userCollection") || "users").trim().toLowerCase() === "admins"
    ? "admins"
    : "users"
  if (!uid) return null
  return { uid, email, accountType }
}

let currentUser = readCurrentUser()

function emitAuth() {
  listeners.forEach((cb) => {
    try {
      cb(currentUser)
    } catch {
      // no-op
    }
  })
}

const auth = {}
Object.defineProperty(auth, "currentUser", {
  get() {
    return currentUser
  },
  set(value) {
    currentUser = value && value.uid
      ? {
          uid: String(value.uid),
          email: String(value.email || ""),
          accountType: String(value.accountType || "users"),
        }
      : null
    emitAuth()
  },
})

function onAuthStateChanged(_auth, callback) {
  if (typeof callback !== "function") return () => {}
  listeners.add(callback)
  queueMicrotask(() => callback(currentUser))
  return () => listeners.delete(callback)
}

function clearLocalSession() {
  const keys = [
    "userName",
    "userEmail",
    "userRole",
    "companyId",
    "companyName",
    "userUid",
    "uid",
    "activeSessionId",
    "sessionUid",
    "userCollection",
  ]
  keys.forEach((key) => localStorage.removeItem(key))
  auth.currentUser = null
}

async function releaseServerSessionLock() {
  const uid = String(
    localStorage.getItem("uid") ||
    localStorage.getItem("userUid") ||
    localStorage.getItem("sessionUid") ||
    ""
  ).trim()
  const sessionKey = String(localStorage.getItem("activeSessionId") || "").trim()
  const accountType = String(localStorage.getItem("userCollection") || "users").trim().toLowerCase() === "admins"
    ? "admins"
    : "users"
  if (!uid || !sessionKey) return

  await api.post("/auth/session/logout", {
    uid,
    sessionKey,
    accountType,
  })
}

async function signOut() {
  try {
    await releaseServerSessionLock()
  } catch {
    // continue local sign out even when API is unavailable
  }
  clearLocalSession()
  return true
}

async function sendPasswordResetEmail(_auth, email) {
  await api.post("/users/password-reset-request", { email })
  return true
}

export {
  auth,
  clearLocalSession,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
}