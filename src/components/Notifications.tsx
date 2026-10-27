"use client";

import { useState } from "react";

export type IslandNotification = {
  id: string;
  message: string;
};

function NotificationCard({ message }: { message: string }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <article className={`notification-card ${collapsed ? "is-collapsed" : ""}`}>
      <button
        className="info-card-toggle"
        type="button"
        aria-label={`${collapsed ? "展開" : "最小化"}島嶼通知`}
        aria-expanded={!collapsed}
        title={`${collapsed ? "展開" : "最小化"}島嶼通知`}
        onClick={() => setCollapsed((previous) => !previous)}
      >
        {collapsed ? "+" : "−"}
      </button>
      <span className="notification-message">{message}</span>
    </article>
  );
}

export default function Notifications({
  notifications,
  completed,
}: {
  notifications: IslandNotification[];
  completed: boolean;
}) {
  const items = completed
    ? [...notifications, { id: "island-complete", message: "燈塔亮了。曙島的五個徽章都收集齊了。" }]
    : notifications;

  if (items.length === 0) return null;

  return (
    <section className="notifications" aria-label="島嶼通知">
      {items.map((notification) => (
        <NotificationCard key={notification.id} message={notification.message} />
      ))}
    </section>
  );
}
