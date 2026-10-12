// Canvas stage: 240x160 (GBA) or 160x144 (GB) — geometry is set by the
// SDK on boot. Drag & drop a local ROM anywhere on the stage.
export default function Screen({ canvasRef, status, onDropFile }) {
  return (
    <section
      className="stage"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) onDropFile(f);
      }}
    >
      <canvas ref={canvasRef} width={240} height={160} className="screen" />
      {status !== 'running' && (
        <div className="overlay">
          {status === 'loading' ? 'Arrancando…' : 'Arrastra un .gba aquí o elígelo arriba'}
        </div>
      )}
    </section>
  );
}
