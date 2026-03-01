import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import ApplicantSidebar from "../../components/applicant_sidebar";
import "../../designer/applicant_layout.css";

type NotificationType = "accepted" | "rejected" | "interview" | "application";

type NotificationItem = {
  id: string;
  dateKey: string;
  time: string;
  title: string;
  location: string;
  type: NotificationType;
  timestampMillis: number;
};




type CalendarDay = {
  dayNumber: number;
  currentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  eventCount: number;
  dateKey: string;
  dateObj: Date;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ApplicantLayout(): React.JSX.Element {
  const navigate = useNavigate();
  const [now, setNow] = useState<Date>(new Date());
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isTopbarNotifOpen, setIsTopbarNotifOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>([]);

  const notifications = useMemo<NotificationItem[]>(() => buildMockNotifications(), []);

  const notificationStorageKey = useMemo(() => {
    const keyIdentity =
      String(localStorage.getItem("userUid") || localStorage.getItem("uid") || "").trim() ||
      String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "").trim().toLowerCase() ||
      "anonymous";
    return `applicant_last_seen_notifications_${keyIdentity}`;
  }, []);

  const hasApplicantSession = (() => {
    const uid = String(localStorage.getItem("userUid") || localStorage.getItem("uid") || localStorage.getItem("sessionUid") || "").trim();
    const email = String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "").trim().toLowerCase();
    const role = String(localStorage.getItem("userRole") || "").trim().toLowerCase();
    const hasIdentity = Boolean(uid || email);
    const roleAllowed = !role || role === "applicant";
    return hasIdentity && roleAllowed;
  })();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    const onResize = () => {
      if (window.innerWidth > 1024) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(notificationStorageKey);
      const parsed = JSON.parse(raw || "[]");
      setSeenNotificationIds(Array.isArray(parsed) ? parsed.map((v) => String(v || "").trim()).filter(Boolean) : []);
    } catch {
      setSeenNotificationIds([]);
    }
  }, [notificationStorageKey]);

  const formattedDate = useMemo(
    () =>
      now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [now],
  );

  const formattedTime = useMemo(
    () =>
      now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [now],
  );

  const monthYearLabel = useMemo(
    () =>
      visibleMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [visibleMonth],
  );

  const latestNotifications = useMemo(() => notifications.slice(0, 3), [notifications]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((item) => !seenNotificationIds.includes(item.id)).length,
    [notifications, seenNotificationIds],
  );

  const hasNewNotifications = unreadNotificationsCount > 0;

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const startDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const list: CalendarDay[] = [];

    for (let i = startDay - 1; i >= 0; i--) {
      const dayNumber = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, dayNumber);
      list.push(buildCalendarDay(dateObj, dayNumber, false, now, selectedDate, notifications));
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
      const dateObj = new Date(year, month, dayNumber);
      list.push(buildCalendarDay(dateObj, dayNumber, true, now, selectedDate, notifications));
    }

    while (list.length < 42) {
      const dayNumber = list.length - (startDay + daysInMonth) + 1;
      const dateObj = new Date(year, month + 1, dayNumber);
      list.push(buildCalendarDay(dateObj, dayNumber, false, now, selectedDate, notifications));
    }

    return list;
  }, [visibleMonth, now, selectedDate, notifications]);

  const markNotificationsAsSeen = () => {
    if (!notifications.length) return;
    const next = Array.from(new Set([...seenNotificationIds, ...notifications.map((n) => n.id)]));
    setSeenNotificationIds(next);
    localStorage.setItem(notificationStorageKey, JSON.stringify(next));
  };

  const handleNotificationBellClick = () => {
    setIsTopbarNotifOpen((prev) => {
      const next = !prev;
      if (next) markNotificationsAsSeen();
      return next;
    });
  };

  const openNotification = (event: NotificationItem) => {
    markNotificationsAsSeen();
    setIsTopbarNotifOpen(false);
    setActiveNotification(event);
    setIsNotificationModalOpen(true);
  };

  const closeNotificationModal = () => setIsNotificationModalOpen(false);

  const goToNotificationPage = () => {
    navigate("/applicant/job_list");
    closeNotificationModal();
  };

  if (!hasApplicantSession) {
    return <Navigate to="/login?force=1" replace />;
  }

  return (
    <div className="applicant-layout">
      <ApplicantSidebar mobileOpen={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)} />

      {isMobileSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)} />}

      <div className="applicant-layout-main">
        <header className="applicant-topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle"
              onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
              aria-label="Open sidebar"
              type="button"
            >
              <i className="bi bi-list" />
            </button>
            <h2 className="page-title">Applicant Portal</h2>
            <p className="page-subtitle">Find jobs and track your applications</p>
          </div>

          <div className="datetime">
            <div className="topbar-notif">
              <button
                className={`notif-bell${hasNewNotifications ? " has-new" : ""}`}
                onClick={handleNotificationBellClick}
                aria-label="Notifications"
                type="button"
              >
                <i className="bi bi-bell-fill" />
                {unreadNotificationsCount > 0 && (
                  <span className="notif-count">{unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}</span>
                )}
              </button>

              {isTopbarNotifOpen && (
                <div className="topbar-notif-panel">
                  <div className="topbar-notif-head">
                    <h4>Notifications</h4>
                  </div>

                  <div className="topbar-notif-list-wrap">
                    {latestNotifications.length === 0 ? (
                      <div className="topbar-notif-empty">No notifications yet</div>
                    ) : (
                      <ul className="topbar-notif-list">
                        {latestNotifications.map((event) => (
                          <li
                            key={`top-${event.id}`}
                            className="topbar-notif-item"
                            role="button"
                            tabIndex={0}
                            onClick={() => openNotification(event)}
                            onKeyDown={(e) => e.key === "Enter" && openNotification(event)}
                          >
                            <span className="topbar-notif-dot" />
                            <div className="topbar-notif-copy">
                              <p className="topbar-notif-title">{event.title}</p>
                              <p className="topbar-notif-time">{formatRelativeTime(event.timestampMillis)}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
            <span>{formattedDate}</span>
            <span className="dot">|</span>
            <span>{formattedTime}</span>
          </div>
        </header>

        <div className="main-body">
          <main className="content">
            <Outlet />
          </main>

          <aside className="right-panel">
            <div className="widget-stack">
              <div className="calendar-card">
                <div className="calendar-head">
                  <button className="nav-btn" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} aria-label="Previous month" type="button">
                    &lt;
                  </button>
                  <h3>{monthYearLabel}</h3>
                  <button className="nav-btn" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} aria-label="Next month" type="button">
                    &gt;
                  </button>
                </div>

                <div className="weekdays">
                  {WEEKDAYS.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="days-grid">
                  {calendarDays.map((day, idx) => (
                    <button
                      key={`${day.dateKey}-${idx}`}
                      type="button"
                      className={`day-cell${!day.currentMonth ? " muted" : ""}${day.isToday ? " today" : ""}${day.isSelected ? " selected" : ""}${day.eventCount > 0 ? " has-event" : ""}`}
                      onClick={() => setSelectedDate(startOfDay(day.dateObj))}
                    >
                      <span>{day.dayNumber}</span>
                      {day.eventCount > 0 && <span className="event-dot" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="events-card">
                <div className="events-head">
                  <h4>Latest Notifications</h4>
                  <p>
                    {latestNotifications.length} of {notifications.length}
                  </p>
                </div>

                {latestNotifications.length === 0 ? (
                  <div className="events-empty">No notifications yet</div>
                ) : (
                  <ul className="events-list">
                    {latestNotifications.map((event) => (
                      <li
                        key={event.id}
                        className="event-item"
                        role="button"
                        tabIndex={0}
                        onClick={() => openNotification(event)}
                        onKeyDown={(e) => e.key === "Enter" && openNotification(event)}
                      >
                        <div className="event-time">{event.time}</div>
                        <div className="event-info">
                          <p className="event-title">{event.title}</p>
                          <p className="event-location">{event.location}</p>
                        </div>
                        <span className={`event-type ${event.type}`}>{event.type}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {isNotificationModalOpen && (
        <div className="notif-modal-overlay" onClick={(e) => e.currentTarget === e.target && closeNotificationModal()}>
          <div className="notif-modal" role="dialog" aria-modal="true" aria-label="Notification Details">
            <div className="notif-modal-head">
              <h4>Notification Details</h4>
              <button className="notif-close" onClick={closeNotificationModal} type="button">
                x
              </button>
            </div>

            {activeNotification && (
              <div className="notif-body">
                <p className="notif-title">{activeNotification.title}</p>
                <p className="notif-meta">
                  <strong>Time:</strong> {activeNotification.time}
                </p>
                <p className="notif-meta">
                  <strong>Location:</strong> {activeNotification.location}
                </p>
                <p className="notif-meta">
                  <strong>Type:</strong> {activeNotification.type}
                </p>
              </div>
            )}

            <div className="notif-actions">
              <button className="notif-secondary" onClick={closeNotificationModal} type="button">
                Close
              </button>
              <button className="notif-primary" onClick={goToNotificationPage} type="button">
                Go to Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildMockNotifications(): NotificationItem[] {
  return [];
}

function buildCalendarDay(
  dateObj: Date,
  dayNumber: number,
  currentMonth: boolean,
  now: Date,
  selectedDate: Date,
  notifications: NotificationItem[],
): CalendarDay {
  const dateKey = toDateKey(dateObj);
  const eventCount = notifications.filter((event) => event.dateKey === dateKey).length;
  return {
    dayNumber,
    currentMonth,
    isToday: isSameDate(dateObj, now),
    isSelected: isSameDate(dateObj, selectedDate),
    eventCount,
    dateKey,
    dateObj,
  };
}

function startOfDay(dateObj: Date): Date {
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
}

function toDateKey(dateObj: Date): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatRelativeTime(timestampMillis: number): string {
  const diffMs = Date.now() - Number(timestampMillis || 0);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Now";
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))}h ago`;
  return new Date(timestampMillis).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
