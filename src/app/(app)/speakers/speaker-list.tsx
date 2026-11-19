"use client";

import { Check, Clock, MapPin } from "@gravity-ui/icons";
import { Avatar, Button, Card, Chip, toast } from "@heroui/react";
import { useTransition } from "react";
import type { SlotView, SpeakerView } from "@/lib/program";
import { subscribe, unsubscribe } from "../actions";

export function SpeakerList({ speakers, open }: { speakers: SpeakerView[]; open: boolean }) {
  if (speakers.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title>Speakers will be announced soon</Card.Title>
        </Card.Header>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {speakers.map((s) => (
        <li key={s.id}>
          <SpeakerCard speaker={s} open={open} />
        </li>
      ))}
    </ul>
  );
}

function initials(name: string) {
  const parts = name
    .replace(/^(dr|prof|ir|ing|mr)\.?\s+/i, "")
    .split(/\s+/)
    .filter((p) => /^[A-Z]/.test(p));
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase() || "?";
}

function SpeakerCard({ speaker, open }: { speaker: SpeakerView; open: boolean }) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar aria-hidden className="bg-accent/10 text-accent shrink-0">
            <Avatar.Fallback>{initials(speaker.name)}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{speaker.name}</p>
            <p className="text-muted truncate text-sm">{speaker.affiliation}</p>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-snug">{speaker.talkTitle}</h2>
          <p className="text-muted mt-1 text-sm leading-relaxed">{speaker.abstract}</p>
        </div>
      </div>
      <ul className="border-separator divide-separator divide-y border-t">
        {speaker.slots.map((slot) => (
          <SlotRow key={slot.id} slot={slot} open={open} />
        ))}
      </ul>
    </Card>
  );
}

function availability(slot: SlotView): { text: string; tone: string } {
  switch (slot.state) {
    case "enrolled":
      return { text: "You're attending", tone: "text-success-ink font-medium" };
    case "same_speaker":
      return { text: "You're attending another session", tone: "text-muted" };
    case "overlap":
      return { text: "Overlaps with your schedule", tone: "text-muted" };
    case "full":
      return { text: "Full", tone: "text-muted" };
    default:
      return {
        text: `${slot.left} of ${slot.capacity} spots left`,
        tone: slot.left <= 5 ? "text-warning-ink font-medium" : "text-muted",
      };
  }
}

function SlotRow({ slot, open }: { slot: SlotView; open: boolean }) {
  const [pending, startTransition] = useTransition();
  const enrolled = slot.state === "enrolled";
  const available = open && slot.state === "available";
  const { text, tone } = availability(slot);

  function toggle() {
    startTransition(async () => {
      const res = await (enrolled ? unsubscribe(slot.id) : subscribe(slot.id));
      if (res.ok) toast.success(enrolled ? "Removed from your schedule" : "Added to your schedule");
      else toast.danger(res.message);
    });
  }

  return (
    <li className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-1.5 text-sm font-medium tabular-nums">
          <Clock aria-hidden className="text-muted size-3.5" />
          {slot.time}
        </span>
        <span className="text-muted flex items-center gap-1.5 text-sm">
          <MapPin aria-hidden className="size-3.5" />
          {slot.location}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className={`text-sm ${tone}`}>{text}</span>
        {enrolled ? (
          open ? (
            <Button size="sm" variant="secondary" className="min-w-28" isPending={pending} onPress={toggle}>
              Unsubscribe
            </Button>
          ) : (
            <Chip color="success" variant="soft" size="sm">
              <Check aria-hidden />
              <Chip.Label>Subscribed</Chip.Label>
            </Chip>
          )
        ) : (
          <Button
            size="sm"
            variant={available ? "primary" : "secondary"}
            className="min-w-28"
            isPending={pending}
            isDisabled={!available}
            onPress={toggle}
          >
            Subscribe
          </Button>
        )}
      </div>
    </li>
  );
}
