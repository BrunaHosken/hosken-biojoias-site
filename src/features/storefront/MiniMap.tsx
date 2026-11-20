import { ArrowRight, MapPin } from "lucide-react";
import type { Content } from "../../data";
import { isHttpUrl } from "./eventSchedule";

export function MiniMap({ record }: { record: Content }) {
  const query = [record.address, record.location].filter(Boolean).join(", ");
  if (!query) return null;

  return (
    <div className="mini-map">
      <iframe
        title={`Mapa de ${record.title}`}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      {isHttpUrl(record.mapUrl) && (
        <a href={record.mapUrl} target="_blank" rel="noreferrer">
          <MapPin size={15} /> Abrir rota <ArrowRight size={15} />
        </a>
      )}
    </div>
  );
}
