import { useState, type FormEvent } from "react";
import { DataGrid, FormField } from "@hkpd/ui";
import {
  proposeSchedule,
  assignLanes,
  validateLanes,
  scheduleConflicts,
  reviseSchedule,
  type LaneAssignment,
  type ScheduleItem,
  type ScheduleSnapshot,
} from "@hkpd/competition";
const ids = (text: string) =>
  text
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
// HKPD Quảng Phú schedule entry uses Vietnam time explicitly, regardless of browser timezone.
function vietnamTime(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Thời gian chưa hợp lệ.");
  const instant = Date.parse(`${value}:00.000+07:00`);
  if (
    !Number.isFinite(instant) ||
    new Date(instant + 7 * 3600000).toISOString().slice(0, 16) !== value
  )
    throw new Error("Thời gian chưa hợp lệ.");
  return new Date(instant).toISOString();
}
export function ScheduleWorkspace() {
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [snapshot, setSnapshot] = useState<ScheduleSnapshot>({
    version: 1,
    items: [],
  });
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [id, setId] = useState("");
  const [eventId, setEventId] = useState("");
  const [sportId, setSportId] = useState("");
  const [venue, setVenue] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState("");
  const [rest, setRest] = useState("");
  const [participants, setParticipants] = useState("");
  const [referees, setReferees] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const conflicts = scheduleConflicts(items);
  function add(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const minutes = Number(duration);
      const resting = Number(rest);
      if (
        !duration.trim() ||
        !rest.trim() ||
        !Number.isFinite(minutes) ||
        minutes <= 0
      )
        throw new Error("Cần nhập thời lượng và thời gian nghỉ được cấu hình.");
      const from = Date.parse(vietnamTime(start));
      const item: ScheduleItem = {
        id: id.trim(),
        eventId: eventId.trim(),
        sportId: sportId.trim(),
        venueId: venue.trim(),
        start: new Date(from).toISOString(),
        end: new Date(from + minutes * 60000).toISOString(),
        participantPersonIds: ids(participants),
        refereePersonIds: ids(referees),
        restMinutes: resting,
        dependsOnIds: [],
      };
      const updated = [...items.filter((row) => row.id !== item.id), item];
      scheduleConflicts(updated);
      setItems(updated);
      setMessage("Đã cập nhật lịch thử. Rà soát cảnh báo trước khi chốt.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không cập nhật được lịch.",
      );
    }
  }
  function edit(item: ScheduleItem) {
    setId(item.id);
    setEventId(item.eventId);
    setSportId(item.sportId);
    setVenue(item.venueId);
    const date = new Date(Date.parse(item.start) + 7 * 3600000);
    setStart(date.toISOString().slice(0, 16));
    setDuration(
      String((Date.parse(item.end) - Date.parse(item.start)) / 60000),
    );
    setRest(String(item.restMinutes));
    setParticipants(item.participantPersonIds.join(","));
    setReferees(item.refereePersonIds.join(","));
  }
  return (
    <section className="competition-workspace">
      <h2>Lịch thi đấu</h2>
      <p className="notice">
        Quản trị quản lý lịch thi đấu các môn. Phân làn chạy/bơi thuộc trọng tài
        được phân công môn tương ứng. Bản thử trên trình duyệt. Chưa kiểm phân
        công tổ trưởng/trọng tài và chưa gửi thông báo hệ thống. Mã người cần
        dùng thống nhất giữa các môn, gồm mọi thành viên đội.
      </p>
      <form className="card schedule-form" onSubmit={add}>
        <FormField
          label="Mã trận / lượt"
          required
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <FormField
          label="Mã nội dung"
          required
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        />
        <FormField
          label="Mã môn"
          required
          value={sportId}
          onChange={(e) => setSportId(e.target.value)}
        />
        <FormField
          label="Sân / địa điểm"
          required
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />
        <FormField
          label="Bắt đầu (giờ Việt Nam, UTC+7)"
          required
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <FormField
          label="Thời lượng (phút)"
          required
          type="number"
          min="1"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <FormField
          label="Nghỉ tối thiểu (phút, theo cấu hình)"
          required
          type="number"
          min="0"
          max="1440"
          value={rest}
          onChange={(e) => setRest(e.target.value)}
        />
        <FormField
          label="Mã người thi đấu (cách nhau bằng dấu phẩy)"
          required
          value={participants}
          onChange={(e) => setParticipants(e.target.value)}
        />
        <FormField
          label="Mã người làm trọng tài (cách nhau bằng dấu phẩy)"
          value={referees}
          onChange={(e) => setReferees(e.target.value)}
        />
        <button type="submit">Thêm / sửa lịch thử</button>
      </form>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <form
        className="card"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          try {
            if (!items.length)
              throw new Error("Hãy thêm trận/lượt trước khi đề xuất lịch.");
            const tasks = items.map(({ venueId, start, end, ...task }) => ({
              ...task,
              venueIds: [venueId],
              durationMinutes: (Date.parse(end) - Date.parse(start)) / 60000,
            }));
            setItems([
              ...proposeSchedule(tasks, [], {
                start: vietnamTime(windowStart),
                end: vietnamTime(windowEnd),
              }),
            ]);
            setMessage(
              "Đã đề xuất lại lịch thử theo sân, người và thời gian nghỉ; cần rà soát trước khi chốt.",
            );
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "Không đề xuất được lịch.",
            );
          }
        }}
      >
        <h3>Đề xuất xếp lại lịch thử</h3>
        <FormField
          label="Bắt đầu khoảng lịch (giờ Việt Nam, UTC+7)"
          required
          type="datetime-local"
          value={windowStart}
          onChange={(e) => setWindowStart(e.target.value)}
        />
        <FormField
          label="Kết thúc khoảng lịch (giờ Việt Nam, UTC+7)"
          required
          type="datetime-local"
          value={windowEnd}
          onChange={(e) => setWindowEnd(e.target.value)}
        />
        <button type="submit">Đề xuất lịch thử</button>
      </form>
      <DataGrid
        caption="Lịch thử toàn giải"
        rows={items}
        rowKey={(row) => row.id}
        columns={[
          { key: "id", label: "Trận / lượt", render: (row) => row.id },
          {
            key: "event",
            label: "Môn / Nội dung",
            render: (row) => `${row.sportId} / ${row.eventId}`,
          },
          { key: "venue", label: "Sân", render: (row) => row.venueId },
          {
            key: "time",
            label: "Bắt đầu",
            render: (row) =>
              new Date(row.start).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              }),
          },
          {
            key: "edit",
            label: "Điều chỉnh",
            render: (row) => (
              <button type="button" onClick={() => edit(row)}>
                Sửa {row.id}
              </button>
            ),
          },
        ]}
      />
      {conflicts.length > 0 && (
        <div role="alert" className="notice error">
          <strong>Lịch có xung đột</strong>
          <ul>
            {conflicts.map((conflict, index) => (
              <li key={index}>
                {
                  {
                    venue: "Trùng sân",
                    person: "Trùng người thi đấu / trọng tài",
                    rest: "Chưa đủ thời gian nghỉ",
                    dependency: "Sai thứ tự vòng đấu",
                  }[conflict.kind]
                }
                : {conflict.itemIds.join(" — ")}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        disabled={!items.length || conflicts.length > 0}
        onClick={() => {
          const result = reviseSchedule(snapshot, snapshot.version, items);
          setSnapshot(result.snapshot);
          setMessage(
            `Đã chốt lịch thử phiên bản ${result.snapshot.version}. Đã tạo nội dung bàn giao thông báo ${result.notification.type}; chưa gửi thông báo thật.`,
          );
        }}
      >
        Chốt lịch thử
      </button>
      <p>Phiên bản lịch đã chốt trên trình duyệt: {snapshot.version}</p>
    </section>
  );
}

// Standalone preview only. Live referee access must use current-edition,
// assigned-sport registrations; do not mount this unrestricted tool in App.
export function LaneWorkspace() {
  const [laneIds, setLaneIds] = useState("");
  const [laneCount, setLaneCount] = useState("");
  const [lanes, setLanes] = useState<readonly LaneAssignment[]>([]);
  const [error, setError] = useState("");
  function editLane(index: number, field: "heat" | "lane", value: number) {
    try {
      const updated = lanes.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      );
      validateLanes(ids(laneIds), updated, Number(laneCount));
      setLanes(updated);
      setError("");
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Phân làn không hợp lệ.",
      );
    }
  }
  return (
    <section className="competition-workspace">
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <section className="card">
        <h3>Phân lượt / làn chạy, bơi</h3>
        <p>
          Bản thử độc lập cho nghiệp vụ trọng tài. Khi tích hợp trực tuyến, chỉ
          trọng tài được phân công Điền kinh hoặc Bơi trong giải hiện tại được
          phân làn cho nội dung tương ứng. Chưa lưu lên máy chủ.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              setLanes(assignLanes(ids(laneIds), Number(laneCount)));
              setError("");
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : "Không phân được làn.",
              );
            }
          }}
        >
          <FormField
            label="Mã VĐV phân làn (cách nhau bằng dấu phẩy)"
            required
            value={laneIds}
            onChange={(e) => {
              setLaneIds(e.target.value);
              setLanes([]);
            }}
          />
          <FormField
            label="Số làn khả dụng"
            required
            type="number"
            min="1"
            max="16"
            value={laneCount}
            onChange={(e) => {
              setLaneCount(e.target.value);
              setLanes([]);
            }}
          />
          <button type="submit">Đề xuất lượt / làn thử</button>
        </form>
        <DataGrid
          caption="Phân lượt và làn thử"
          rows={lanes}
          rowKey={(row) => row.entrantId}
          columns={[
            { key: "id", label: "Mã VĐV", render: (row) => row.entrantId },
            {
              key: "heat",
              label: "Lượt",
              render: (row) => (
                <input
                  aria-label={`Lượt của ${row.entrantId}`}
                  type="number"
                  min="1"
                  value={row.heat}
                  onChange={(e) =>
                    editLane(lanes.indexOf(row), "heat", Number(e.target.value))
                  }
                />
              ),
            },
            {
              key: "lane",
              label: "Làn",
              render: (row) => (
                <input
                  aria-label={`Làn của ${row.entrantId}`}
                  type="number"
                  min="1"
                  max={laneCount}
                  value={row.lane}
                  onChange={(e) =>
                    editLane(lanes.indexOf(row), "lane", Number(e.target.value))
                  }
                />
              ),
            },
          ]}
        />
      </section>
    </section>
  );
}
