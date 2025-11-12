"use client";

import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';

type MemberMetrics = {
  login: string;
  name?: string | null;
  avatarUrl?: string | null;
  totals: {
    commits: number;
    prs: number;
    reviews: number;
    issues: number;
  };
  score: number;
};

const ranges = [7, 14, 30] as const;

export default function HomePage() {
  const [days, setDays] = useState<(typeof ranges)[number]>(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [org, setOrg] = useState<string>("");
  const [usersCSV, setUsersCSV] = useState<string>("");
  const [metrics, setMetrics] = useState<MemberMetrics[]>([]);

  const toDate = new Date();
  const fromDate = subDays(toDate, days);

  const hint = useMemo(() => {
    const f = (d: Date) => format(d, 'dd/MM/yyyy');
    return `${f(fromDate)} at? ${f(toDate)}`;
  }, [fromDate, toDate]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/metrics?from=${fromDate.toISOString()}&to=${toDate.toISOString()}&org=${encodeURIComponent(org)}&users=${encodeURIComponent(usersCSV)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro desconhecido');
      setMetrics(data.members as MemberMetrics[]);
    } catch (e: any) {
      setError(e.message || 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // noop
  }, []);

  const median = useMemo(() => {
    if (metrics.length === 0) return 0;
    const s = [...metrics].sort((a, b) => a.score - b.score);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid].score : (s[mid - 1].score + s[mid].score) / 2;
  }, [metrics]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 p-4 border rounded-lg">
          <label className="block text-sm font-medium mb-1">Organiza??o GitHub (opcional)</label>
          <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="minha-org" className="w-full border rounded px-3 py-2" />
          <p className="text-xs text-gray-500 mt-1">Se n?o informado, use a lista de usu?rios abaixo.</p>
        </div>
        <div className="md:col-span-2 p-4 border rounded-lg">
          <label className="block text-sm font-medium mb-1">Usu?rios (CSV, opcional)</label>
          <input value={usersCSV} onChange={(e) => setUsersCSV(e.target.value)} placeholder="user1,user2,user3" className="w-full border rounded px-3 py-2" />
          <p className="text-xs text-gray-500 mt-1">Use quando a org for privada e o token n?o tiver acesso a membros.</p>
        </div>
      </section>

      <section className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">Per?odo:</span>
          <div className="inline-flex border rounded overflow-hidden">
            {ranges.map((r) => (
              <button key={r} onClick={() => setDays(r)} className={`px-3 py-1 text-sm ${days === r ? 'bg-gray-900 text-white' : 'bg-white'}`}>{r}d</button>
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-2">{hint}</span>
        </div>
        <button onClick={load} disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
          {loading ? 'Carregando...' : 'Carregar m?tricas'}
        </button>
      </section>

      {error && (
        <div className="p-3 border border-red-300 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      <section className="overflow-x-auto">
        <table className="min-w-full border rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 border-b">Colaborador</th>
              <th className="text-left px-4 py-2 border-b">Commits</th>
              <th className="text-left px-4 py-2 border-b">PRs</th>
              <th className="text-left px-4 py-2 border-b">Reviews</th>
              <th className="text-left px-4 py-2 border-b">Issues</th>
              <th className="text-left px-4 py-2 border-b">Score</th>
              <th className="text-left px-4 py-2 border-b">Sinal</th>
            </tr>
          </thead>
          <tbody>
            {metrics.sort((a, b) => b.score - a.score).map((m) => {
              const signal = m.score < Math.max(0, median * 0.5) ? 'Baixa atividade' : m.score > median * 1.5 ? 'Sobrecarga' : 'OK';
              const badge = signal === 'Baixa atividade' ? 'bg-amber-100 text-amber-800' : signal === 'Sobrecarga' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800';
              return (
                <tr key={m.login} className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2 border-b">
                    <div className="flex items-center gap-3">
                      {m.avatarUrl ? <img src={m.avatarUrl} alt={m.login} className="w-8 h-8 rounded-full" /> : null}
                      <div>
                        <div className="font-medium">{m.name || m.login}</div>
                        <div className="text-xs text-gray-500">@{m.login}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 border-b">{m.totals.commits}</td>
                  <td className="px-4 py-2 border-b">{m.totals.prs}</td>
                  <td className="px-4 py-2 border-b">{m.totals.reviews}</td>
                  <td className="px-4 py-2 border-b">{m.totals.issues}</td>
                  <td className="px-4 py-2 border-b font-semibold">{m.score.toFixed(1)}</td>
                  <td className="px-4 py-2 border-b"><span className={`px-2 py-1 text-xs rounded ${badge}`}>{signal}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {metrics.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">Sem dados. Informe a organiza??o ou usu?rios e clique em "Carregar m?tricas".</div>
        )}
      </section>

      <section className="text-xs text-gray-500">
        <p>
          O score ? calculado como: commits ? 1.0 + PRs ? 3.0 + reviews ? 2.0 + issues ? 1.5. Use com bom senso ? qualidade importa mais que quantidade.
        </p>
      </section>
    </div>
  );
}
