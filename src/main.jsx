import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import jsQR from 'jsqr';
import './style.css';

async function api(action, fields = {}) {
  const response = await fetch('/.netlify/functions/campamento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...fields }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    const error = new Error(data.message || 'La conexión no está disponible.');
    error.auth = response.status === 401;
    throw error;
  }
  return data;
}

function Scanner({ onScan, onClose, onError }) {
  const video = useRef(null);
  useEffect(() => {
    let active = true;
    let stream;
    let frame;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    function read() {
      if (!active) return;
      const player = video.current;
      if (player?.readyState >= 2 && player.videoWidth) {
        canvas.width = Math.min(720, player.videoWidth);
        canvas.height = Math.round(canvas.width * player.videoHeight / player.videoWidth);
        context.drawImage(player, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height);
        if (code?.data) {
          stream.getTracks().forEach(track => track.stop());
          onScan(code.data);
          return;
        }
      }
      frame = requestAnimationFrame(read);
    }
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
        if (active) frame = requestAnimationFrame(read);
      } catch {
        stream?.getTracks().forEach(track => track.stop());
        if (active) onError('No se pudo abrir la cámara. Revisa los permisos y abre la página por HTTPS.');
      }
    }
    start();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [onScan, onError]);
  return <div className="camera">
    <video ref={video} muted playsInline aria-label="Vista de la cámara" />
    <p>Centra el código QR frente a la cámara.</p>
    <button className="secondary" onClick={onClose}>Cerrar cámara</button>
  </div>;
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('campamento-session') || '');
  const [perfil, setPerfil] = useState(null);
  const [podio, setPodio] = useState(null);
  const [podioError, setPodioError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);

  function clearSession() {
    sessionStorage.removeItem('campamento-session');
    setToken('');
    setPerfil(null);
    setCamera(false);
  }

  useEffect(() => {
    if (token) return;
    let active = true;
    setPodioError('');
    api('podio').then(data => active && setPodio(data.podio))
      .catch(error => active && setPodioError(error.message));
    return () => { active = false; };
  }, [token, refresh]);

  useEffect(() => {
    if (!token || perfil) return;
    let active = true;
    api('perfil', { token }).then(data => active && setPerfil(data.perfil)).catch(error => {
      if (!active) return;
      clearSession();
      setNotice({ type: 'error', message: error.message });
    });
    return () => { active = false; };
  }, [token, perfil]);

  async function login(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setNotice(null);
    try {
      const data = await api('login', Object.fromEntries(form));
      sessionStorage.setItem('campamento-session', data.token);
      setPerfil(data.perfil);
      setToken(data.token);
    } catch (error) {
      setNotice({ type: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function scan(qr) {
    setCamera(false);
    setBusy(true);
    setNotice(null);
    try {
      const data = await api('scan', { token, qr });
      setPerfil(data.perfil);
      setNotice({ type: data.duplicado ? 'warning' : 'success', message: data.message });
    } catch (error) {
      if (error.auth) clearSession();
      setNotice({ type: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setCamera(false);
    setBusy(true);
    try {
      await api('logout', { token });
    } catch {
      // El acceso local se cierra aun si la red está caída.
    } finally {
      clearSession();
      setNotice(null);
      setBusy(false);
    }
  }

  return <>
    <header className="hero">
      <div className="brand">
        <img src="/logo-cafeteros.jpeg" alt="Escudo del Bosque Campista Cafeteros" />
        <div><p>Bosque Campista Cafeteros</p><h1>V Campamento Interno</h1>
          <span>Luces que brillan y sombras que acechan</span></div>
      </div>
    </header>
    <main className={token ? 'layout dashboard' : 'layout'}>
      {!token && <>
        <section className="card podium">
          <div className="heading"><h2>Podio campista</h2>
            <button className="secondary" onClick={() => setRefresh(value => value + 1)}>Actualizar</button></div>
          {podioError ? <p role="alert">{podioError}</p> : !podio ? <p>Cargando podio…</p> :
            !podio.length ? <p>Todavía no hay códigos registrados.</p> :
            <ol>{podio.map((person, i) => <li key={i}>
              <span className="position" aria-hidden="true">{i + 1}</span>
              <strong>{person.nombre}</strong>
              <span>{person.total} QR</span>
            </li>)}</ol>}
        </section>
        <section className="card">
          <h2>Ingreso campista</h2>
          <p>Usa tu número de documento como usuario y contraseña.</p>
          <form onSubmit={login}>
            <label>Número de documento<input name="documento" autoComplete="username" inputMode="numeric" required /></label>
            <label>Contraseña<input name="clave" type="password" autoComplete="current-password" inputMode="numeric" required /></label>
            <button disabled={busy}>{busy ? 'Ingresando…' : 'Iniciar sesión'}</button>
          </form>
          <Feedback notice={notice} />
        </section>
      </>}
      {token && !perfil && <section className="card"><p>Cargando tu registro…</p></section>}
      {token && perfil && <>
        <section className="card">
          <div className="heading"><h2>Hola, {perfil.nombre}</h2>
            <button className="secondary" disabled={busy} onClick={logout}>Cerrar sesión</button></div>
          <p className="progress-text"><strong>{perfil.registrados.length} de 20</strong> códigos registrados</p>
          <progress value={perfil.registrados.length} max="20" aria-label="Códigos registrados" />
          {!camera && <button disabled={busy} onClick={() => { setNotice(null); setCamera(true); }}>
            {busy ? 'Procesando…' : 'Escanear QR'}
          </button>}
          {camera && <Scanner onScan={scan} onClose={() => setCamera(false)} onError={message => {
            setCamera(false);
            setNotice({ type: 'error', message });
          }} />}
          <Feedback notice={notice} />
        </section>
        <section className="card">
          <h2>Mis códigos QR</h2>
          <ul className="codes">{Array.from({ length: 20 }, (_, i) => {
            const code = 'Qr' + (i + 1);
            const done = perfil.registrados.includes(code);
            return <li className={done ? 'done' : ''} key={code}>
              <strong>QR {i + 1}</strong><span>{done ? 'Registrado' : 'Pendiente'}</span>
            </li>;
          })}</ul>
        </section>
      </>}
    </main>
  </>;
}

function Feedback({ notice }) {
  return <div aria-live="polite">{notice &&
    <p className={'notice ' + notice.type}>{notice.message}</p>}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
