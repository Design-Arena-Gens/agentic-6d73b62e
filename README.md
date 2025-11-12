# Dedo Duro — GitHub Activity Monitor

Monitora a atividade de colaboradores no GitHub da empresa com base em commits, PRs, reviews e issues, usando o GraphQL da GitHub API.

## Configuração

1. Crie um token do GitHub com permissão `read:org` (para listar membros). Caso não tenha acesso à org, informe a lista de usuários manualmente na UI.
2. Configure variáveis de ambiente (localmente use `.env.local`):

```
GITHUB_TOKEN=seu_token
GITHUB_ORG=minha-org # opcional
WEIGHT_COMMITS=1.0
WEIGHT_PRS=3.0
WEIGHT_REVIEWS=2.0
WEIGHT_ISSUES=1.5
```

## Desenvolvimento

- Instale dependências e rode o projeto:

```
npm install
npm run dev
```

Acesse http://localhost:3000 e preencha a organização ou lista de usuários CSV, escolha o período e clique em "Carregar métricas".

## Deploy (Vercel)

Use o comando:

```
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-6d73b62e
```

Depois valide:

```
curl https://agentic-6d73b62e.vercel.app
```
