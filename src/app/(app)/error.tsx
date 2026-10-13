"use client";

import { Empty } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page page-narrow">
      <Empty icon="error" title="No pudimos cargar esta sección" text="Intente de nuevo. Si el problema persiste, avise al equipo de administración.">
        <button className="btn" onClick={reset}>Reintentar</button>
      </Empty>
    </div>
  );
}
