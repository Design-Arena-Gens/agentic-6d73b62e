import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com/graphql';

function ensureEnv() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('Faltando GITHUB_TOKEN no ambiente');
  }
  return token;
}

async function gh<T>(query: string, variables: Record<string, any>): Promise<T> {
  const token = ensureEnv();
  const res = await fetch(GITHUB_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    // Avoid caching sensitive org/member changes
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(json.errors?.[0]?.message || `GitHub GraphQL falhou (${res.status})`);
  }
  return json.data as T;
}

const MEMBERS_QUERY = /* GraphQL */ `
  query($org: String!, $after: String) {
    organization(login: $org) {
      membersWithRole(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { login name avatarUrl }
      }
    }
  }
`;

const USER_CONTRIBS_QUERY = /* GraphQL */ `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      login
      name
      avatarUrl
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
      }
    }
  }
`;

async function listOrgMembers(org: string): Promise<{ login: string; name?: string | null; avatarUrl?: string | null }[]> {
  let members: { login: string; name?: string | null; avatarUrl?: string | null }[] = [];
  let after: string | null = null;
  // paginate up to 1000 for safety
  for (let i = 0; i < 10; i++) {
    const data = await gh<{ organization: { membersWithRole: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: any[] } } }>(MEMBERS_QUERY, { org, after });
    const page = data.organization?.membersWithRole;
    if (!page) break;
    members = members.concat(page.nodes as any[]);
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return members.map(m => ({ login: m.login, name: m.name, avatarUrl: m.avatarUrl }));
}

async function getUserMetrics(login: string, from: string, to: string) {
  const data = await gh<{ user: any }>(USER_CONTRIBS_QUERY, { login, from, to });
  const c = data.user.contributionsCollection;
  const totals = {
    commits: c.totalCommitContributions ?? 0,
    prs: c.totalPullRequestContributions ?? 0,
    reviews: c.totalPullRequestReviewContributions ?? 0,
    issues: c.totalIssueContributions ?? 0,
  };
  // scoring weights configurable via env or default
  const wCommits = Number(process.env.WEIGHT_COMMITS || 1.0);
  const wPRs = Number(process.env.WEIGHT_PRS || 3.0);
  const wReviews = Number(process.env.WEIGHT_REVIEWS || 2.0);
  const wIssues = Number(process.env.WEIGHT_ISSUES || 1.5);
  const score = totals.commits * wCommits + totals.prs * wPRs + totals.reviews * wReviews + totals.issues * wIssues;
  return {
    login: data.user.login,
    name: data.user.name,
    avatarUrl: data.user.avatarUrl,
    totals,
    score,
  };
}

export async function GET(req: NextRequest) {
  try {
    ensureEnv();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const org = searchParams.get('org') || process.env.GITHUB_ORG || '';
    const usersParam = searchParams.get('users') || '';

    if (!from || !to) {
      return NextResponse.json({ error: 'Par?metros from e to s?o obrigat?rios (ISO string)' }, { status: 400 });
    }

    let logins: { login: string; name?: string | null; avatarUrl?: string | null }[] = [];

    if (org) {
      try {
        logins = await listOrgMembers(org);
      } catch (e) {
        // fallback to users list if provided
        if (!usersParam) throw e;
      }
    }

    if (logins.length === 0 && usersParam) {
      const arr = usersParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(login => ({ login }));
      logins = arr;
    }

    if (logins.length === 0) {
      return NextResponse.json({ error: 'Nenhum usu?rio encontrado. Informe org v?lida ou lista de usu?rios.' }, { status: 400 });
    }

    // parallel fetch with small concurrency guard
    const results: any[] = [];
    const concurrency = 6;
    let idx = 0;
    async function worker() {
      while (idx < logins.length) {
        const current = idx++;
        const u = logins[current];
        try {
          const m = await getUserMetrics(u.login, from, to);
          results.push(m);
        } catch (e) {
          // skip user on error
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, logins.length) }, () => worker()));

    // Normalize NaN scores
    const members = results.map(r => ({ ...r, score: Number.isFinite(r.score) ? r.score : 0 }))
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ members });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 });
  }
}
