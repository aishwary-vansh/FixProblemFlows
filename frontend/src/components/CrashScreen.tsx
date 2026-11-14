// Shown instead of a blank page if something breaks while rendering.
const CrashScreen = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
    <div>
      <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
      <p>Reload the page to continue. If it keeps happening, tell your admin.</p>
      <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 18px', borderRadius: 10, cursor: 'pointer' }}>
        Reload
      </button>
    </div>
  </div>
)

export default CrashScreen
