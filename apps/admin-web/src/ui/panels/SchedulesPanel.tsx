import { RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Schedule } from "../../api/types";
import { EmptyState } from "../EmptyState";
import { JsonBlock } from "../JsonBlock";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";
import type { PanelProps } from "./types";

export function SchedulesPanel({ client, notify }: PanelProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [text, setText] = useState("/ping");
  const [delaySeconds, setDelaySeconds] = useState(60);

  async function load() {
    try {
      const result = await client.listSchedules();
      setSchedules(result.schedules);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load schedules", "error");
    }
  }

  async function create() {
    try {
      await client.createSchedule({ text, delaySeconds });
      notify("Schedule created", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to create schedule", "error");
    }
  }

  async function cancel(id: string) {
    try {
      await client.cancelSchedule(id);
      notify("Schedule cancelled", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to cancel schedule", "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <h1>Schedules</h1>
        <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void load()} />
      </header>
      <div className="form-grid">
        <label>
          Text
          <input value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <label>
          Delay
          <input
            type="number"
            min="0"
            value={delaySeconds}
            onChange={(event) => setDelaySeconds(Number(event.target.value))}
          />
        </label>
        <button className="primary-button" type="button" onClick={() => void create()}>
          Create
        </button>
      </div>
      <div className="table-list">
        {schedules.map((schedule) => (
          <div className="table-row" key={schedule.id}>
            <div>
              <strong>{schedule.id}</strong>
              <span>{schedule.dueAt}</span>
            </div>
            <StatusBadge value={schedule.status} />
            <JsonBlock value={JSON.parse(schedule.payloadJson)} />
            <ToolbarButton
              label="Cancel"
              icon={Trash2}
              variant="danger"
              onClick={() => void cancel(schedule.id)}
            />
          </div>
        ))}
        {schedules.length === 0 && <EmptyState label="No schedules" />}
      </div>
    </section>
  );
}
