import { useEffect, useState } from 'react';
import './SiteAdmin.css';

type Config = { xUrl: string; ca: string };

export default function SiteAdmin() {
  const [config, setConfig] = useState<Config>({ xUrl: '', ca: '' });
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch('/api/site-config', { cache: 'no-store' }).then(res => res.json()).then(data =>
      setConfig({ xUrl: data.xUrl || '', ca: data.ca || '' })).catch(() => setStatus('Не удалось загрузить настройки.'));
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setStatus('Сохраняю…');
    try {
      const response = await fetch('/api/site-config', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(({ wrong_password: 'Неверный пароль.', admin_not_configured: 'Нужно задать переменные админки в Render.',
        invalid_values: 'Проверь ссылку X и адрес токена Solana.', too_many_attempts: 'Слишком много попыток. Подожди 15 минут.',
        github_save_failed: 'GitHub отклонил сохранение. Проверь токен и права.', github_unavailable: 'GitHub сейчас недоступен.' } as Record<string, string>)[data.error] || 'Не удалось сохранить.');
      setConfig(data.config); setPassword(''); setStatus('Сохранено. Изменения появятся на сайте сразу после обновления страницы.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Не удалось сохранить.'); }
    finally { setBusy(false); }
  }
  return <main className="site-admin"><form className="site-admin__panel" onSubmit={save}>
    <a className="site-admin__back" href="/">← Prisma</a>
    <span className="site-admin__eyebrow">PRISMA / ADMIN</span>
    <h1>Ссылки и CA</h1>
    <p>Изменения сохраняются в репозитории и отображаются всем посетителям.</p>
    <label>Ссылка на профиль X<input type="url" value={config.xUrl} onChange={e => setConfig({ ...config, xUrl: e.target.value })} placeholder="https://x.com/yourname" autoComplete="off"/></label>
    <label>CA токена в Solana<input value={config.ca} onChange={e => setConfig({ ...config, ca: e.target.value.trim() })} placeholder="Пусто — CA coming soon" autoComplete="off" spellCheck={false}/></label>
    <label>Пароль админки<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"/></label>
    <button type="submit" disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить'}</button>
    <output role="status">{status}</output>
  </form></main>;
}
