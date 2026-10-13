"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es-MX">
      <body style={{ fontFamily: "system-ui", padding: 48 }}>
        <h1 style={{ fontWeight: 300 }}>Ocurrió un error inesperado</h1>
        <button onClick={reset} style={{ height: 44, padding: "0 20px", background: "#1A1A1A", color: "#fff", border: 0 }}>Reintentar</button>
      </body>
    </html>
  );
}
