export default function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="Cargando">
      <div className="skel" style={{ width: 220, height: 12 }} />
      <div className="skel mt-16" style={{ width: 360, maxWidth: "80%", height: 36 }} />
      <div className="stack gap-16 mt-32">
        {[0, 1, 2].map((i) => <div key={i} className="card skel-card" style={{ animationDelay: `${i * 0.12}s` }} />)}
      </div>
    </div>
  );
}
