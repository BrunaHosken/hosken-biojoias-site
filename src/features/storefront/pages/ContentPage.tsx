import { Link } from "react-router-dom";
import { ArrowRight, Flower2, Leaf } from "lucide-react";
import { Notice } from "../../../components/Feedback";
import { useRecords, type Content } from "../../../data";
import { formatEventDate, getEventSchedule, isHttpUrl } from "../eventSchedule";

export function ContentPage({
  name,
  title,
  subtitle,
}: {
  name: string;
  title: string;
  subtitle: string;
}) {
  const records = useRecords<Content>(name);
  const displayedRecords =
    name === "events"
      ? [...records.data].sort((a, b) =>
          (
            getEventSchedule(a)[0]?.date ||
            a.eventDate ||
            "9999-12-31"
          ).localeCompare(
            getEventSchedule(b)[0]?.date || b.eventDate || "9999-12-31",
          ),
        )
      : records.data;
  return (
    <div className="page">
      <div className="eyebrow">UNIVERSO HOSKEN BIOJOIAS</div>
      <h1>{title}</h1>
      <p className="lead">{subtitle}</p>
      <Notice {...records} />
      <div className="content-grid">
        {displayedRecords.map((r) => (
          <article className="content-card" key={r.id}>
            <Flower2 size={28} />
            <h2>{r.title}</h2>
            {name === "events" &&
              (getEventSchedule(r).length ||
                r.location ||
                r.address ||
                r.mapUrl) && (
                <div className="event-details">
                  {getEventSchedule(r).map((entry, index) => (
                    <p
                      className="event-schedule-public"
                      key={`${entry.date}-${entry.time}-${index}`}
                    >
                      {entry.date && formatEventDate(entry.date)}
                      {entry.date && entry.time && " · "}
                      {entry.time}
                    </p>
                  ))}
                  {r.location && <p>{r.location}</p>}
                  {r.address && <p>{r.address}</p>}
                  {isHttpUrl(r.mapUrl) && (
                    <a href={r.mapUrl} target="_blank" rel="noreferrer">
                      Como chegar <ArrowRight size={15} />
                    </a>
                  )}
                </div>
              )}
            <p>{r.body}</p>
          </article>
        ))}
      </div>
      {!records.loading && !records.error && !records.data.length && (
        <div className="empty">
          <Leaf />
          <h2>Em breve, novidades por aqui.</h2>
          <p>Os próximos anúncios aparecerão nesta página.</p>
        </div>
      )}
    </div>
  );
}
