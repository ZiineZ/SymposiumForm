"use client";

import { Calendar, MapPin } from "@gravity-ui/icons";
import { Card, buttonVariants } from "@heroui/react";
import Link from "next/link";
import type { ScheduleItem } from "@/lib/program";

export function CalendarButton() {
  return (
    <a href="/api/calendar" download className={buttonVariants({ variant: "secondary", size: "md" })}>
      <Calendar aria-hidden />
      Add to calendar
    </a>
  );
}

export function ScheduleList({ items, hasTalks }: { items: ScheduleItem[]; hasTalks: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {!hasTalks && (
        <Card className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Card.Header>
            <Card.Title>No talks yet</Card.Title>
            <Card.Description>Pick the talks you want to attend.</Card.Description>
          </Card.Header>
          <Link href="/speakers" className={buttonVariants({ variant: "primary" })}>
            Browse speakers
          </Link>
        </Card>
      )}

      {items.length > 0 && (
        <Card className="overflow-hidden p-0">
          <ol className="divide-separator divide-y">
            {items.map((item) => (
              <ScheduleRow key={item.key} item={item} />
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  const talk = item.kind === "talk";
  return (
    <li
      className={`grid grid-cols-1 gap-1 px-5 py-4 sm:grid-cols-[8.5rem_1fr_auto] sm:items-center sm:gap-6 ${
        talk ? "border-l-accent border-l-[3px] pl-[17px]" : ""
      }`}
    >
      <time className={`text-sm tabular-nums ${talk ? "font-semibold" : "text-muted"}`}>{item.time}</time>
      <div className="min-w-0">
        <p className={talk ? "font-semibold" : "text-muted"}>{item.title}</p>
        {item.subtitle && <p className="text-muted text-sm">{item.subtitle}</p>}
      </div>
      <p className="text-muted flex items-center gap-1.5 text-sm">
        <MapPin aria-hidden className="size-3.5 shrink-0" />
        {item.location}
      </p>
    </li>
  );
}
