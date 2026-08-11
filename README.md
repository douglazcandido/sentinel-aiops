# Sentinel

Analytics preditivo de incidentes de TI, desenvolvido para o desafio **AIOps** proposto pela Locaweb em parceria com a FIAP (Challenge 2026, curso de Data Science).

<p align="center">
  <img src="docs/sentinel-logo.png" alt="Sentinel — predicting IT operations, before it happens" width="320">
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white">
  <img alt="dbt" src="https://img.shields.io/badge/dbt-1.8-FF694B?logo=dbt&logoColor=white">
  <img alt="Airflow" src="https://img.shields.io/badge/Airflow-2.9-017CEE?logo=apacheairflow&logoColor=white">
</p>

---

## O problema

A Locaweb opera uma infraestrutura de TI 24x7 onde a disponibilidade dos serviços é um fator crítico de negócio. Incidentes operacionais são registrados continuamente, classificados por prioridade, categoria, equipe responsável e tempo de resolução — e cada um desses incidentes impacta diretamente os acordos de nível operacional (OLA).

O desafio proposto pela Locaweb foi transformar esse histórico operacional em inteligência preditiva: antecipar picos de incidentes antes que aconteçam, identificar onde o risco de violação de OLA está concentrado, e gerar recomendações práticas para a operação.

## A solução

O Sentinel é um MVP completo, de ponta a ponta: pipeline de dados, três modelos de machine learning, API REST autenticada e um painel web para consumo executivo. Não é um notebook de análise — é uma aplicação funcional, containerizada, pronta para ser apresentada e operada.

| Frente analítica | Técnica | O que responde |
|---|---|---|
| Histórico | Agregações dbt (granularidade diária) | Como o volume de incidentes se comporta por hora, dia e equipe, filtrável por período |
| Previsão | NeuralProphet | Quantos incidentes esperar amanhã (D+1) e na próxima semana (D+7) |
| Risco de OLA | Random Forest + Explicabilidade | Qual a probabilidade de violação, quais variáveis mais influenciam o modelo e como as violações evoluem no tempo |
| Padrões | K-Means | Quais combinações de equipe, horário e prioridade formam clusters de risco |
| Recomendações | Regras de negócio | Onde agir: reforço de equipe, janelas críticas, categorias recorrentes |
| Exportação | CSV / Excel | Extração dos dados analíticos para uso fora do painel |
| Gestão | Usuários e cargos | Administração de acesso ao painel (restrito a administradores) |

## Arquitetura

O pipeline de dados segue arquitetura medalhão (Bronze → Silver → Gold), isolando a fidelidade ao dado bruto da camada de consumo analítico. As transformações de Silver e Gold são modeladas em **dbt**, e o pipeline completo é orquestrado pelo **Airflow**:

<p align="center">
  <img src="docs/architecture.svg" alt="Arquitetura do Sentinel: Bronze, Silver, Gold, API e Frontend" width="560">
</p>

- **Bronze** preserva o arquivo de origem sem transformação, garantindo rastreabilidade total (`pipeline/ingest.py`).
- **Silver** aplica o modelo dimensional via modelos dbt (`backend/dbt/models/silver/`): limpeza, engenharia de features (sazonalidade, flags de OLA, campos derivados) e testes de qualidade (`not_null`, `unique`) declarados em `schema.yml`.
- **Gold** concentra, também via dbt (`backend/dbt/models/gold/`), as agregações históricas com granularidade diária (`dim_data`, `historico_diario`, `historico_hora_diario`, `historico_grupo_diario`, `historico_violacoes_diario`) e recebe as saídas dos três modelos de ML e das recomendações, geradas por scripts Python do pipeline.
- **Airflow** orquestra as 8 tarefas do pipeline via `DockerOperator`, cada uma rodando em um container efêmero da imagem do backend: `ingest → dbt_silver → dbt_gold → truncate_preditivo → prophet → random_forest → kmeans → recommend`.
- **FastAPI** expõe os dados via rotas REST autenticadas por JWT, com um envelope de resposta padronizado.
- **React + Vite** consome a API e renderiza os painéis do dashboard.

## Stack técnica

**Pipeline e backend**
- Python 3.12, pandas, scikit-learn, NeuralProphet
- dbt-core + dbt-postgres — modelagem e testes das camadas Silver e Gold
- Apache Airflow 2.9 (`LocalExecutor` + `DockerOperator`) — orquestração do pipeline completo
- PostgreSQL 17 com schemas separados (`bronze`, `silver`, `gold`, `public`)
- FastAPI + SQLAlchemy 2.0, autenticação JWT (`python-jose` + `passlib`)

**Frontend**
- React 19, TypeScript, Vite
- Tailwind CSS, Recharts
- Axios com interceptors de autenticação
- Tema claro/escuro com toggle

**Infraestrutura**
- Docker Compose orquestrando Postgres, API, frontend (build multi-stage com Nginx) e o stack do Airflow (postgres, init, webserver, scheduler)

## Estrutura do repositório

```
sentinel-aiops/
├── backend/
│   ├── app/                  # FastAPI: rotas, schemas, services, modelos ORM
│   ├── dbt/                  # Projeto dbt: modelos Silver e Gold, testes de qualidade
│   │   ├── models/silver/    # Modelo dimensional (fato_incidentes + dimensões)
│   │   └── models/gold/      # Agregações diárias (dim_data, historico_*)
│   ├── dags/                 # DAG do Airflow (sentinel_pipeline.py)
│   ├── pipeline/             # Ingestão, truncate e treino dos modelos (chamado pelo Airflow ou standalone)
│   ├── scripts/              # Utilitários (ex: criação de usuário)
│   ├── sql/                  # Scripts DDL (schemas Bronze, Silver, Gold, autenticação)
│   ├── data/                 # Dataset de origem (LW-DATASET.xlsx)
│   ├── Dockerfile
│   ├── Dockerfile.airflow    # Imagem do Airflow com o provider Docker
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/       # UI compartilhada (sidebar, cards, gráficos, modais de gestão)
│   │   ├── lib/               # Cliente HTTP, autenticação, hooks de dados
│   │   ├── pages/              # Painéis do dashboard (histórico, previsão, risco, padrões,
│   │   │                       #   recomendações, exportação, gestão) + login
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── architecture.svg
│   ├── sentinel-logo.png
│   └── dicionario-dados.docx
├── docker-compose.yml
└── README.md
```

## Como executar

### Pré-requisitos
Docker e Docker Compose instalados.

### 1. Subir a infraestrutura

```bash
git clone https://github.com/douglazcandido/sentinel-aiops.git
cd sentinel-aiops
docker compose up -d --build
```

O Airflow usa `DockerOperator` para rodar as tarefas do pipeline, então precisa montar a pasta `backend/data/` do host nos containers efêmeros. Defina `SENTINEL_DATA_PATH` com o caminho absoluto dessa pasta (ver `backend/.env.example`) antes de subir o stack, ou o pipeline via Airflow não encontrará o dataset.

Isso sobe o stack completo: PostgreSQL da aplicação (`:5432`), API FastAPI (`:8000`), frontend (`:5173`) e o stack do Airflow (postgres interno, init, webserver e scheduler, expostos em `:8080`).

### 2. Popular o banco de dados

O pipeline completo (ingestão → dbt Silver → dbt Gold → treino dos modelos → recomendações) pode ser executado de duas formas:

**Via Airflow (recomendado)** — acesse http://localhost:8080 (usuário `admin`, senha `sentinel`), ative a DAG `sentinel_pipeline` e dispare uma execução manual. Cada uma das 8 tarefas roda em um container efêmero da imagem do backend via `DockerOperator`.

**Direto, sem Airflow** — executando o mesmo fluxo dentro do container do backend:

```bash
docker compose exec backend python -m pipeline.run_pipeline
```

### 3. Criar um usuário de acesso

```bash
docker compose exec backend python -m scripts.create_user "Seu Nome" "seu@email.com" "sua-senha"
```

### 4. Acessar

| Serviço | URL |
|---|---|
| Aplicação | http://localhost:5173 |
| Documentação interativa da API | http://localhost:8000/docs |
| Airflow (usuário: `admin` / senha: `sentinel`) | http://localhost:8080 |

## Documentação

- [Dicionário de dados do dataset](docs/dicionario-dados.docx)
- [Diagrama de arquitetura](docs/architecture.svg)

## Decisões técnicas relevantes

Algumas decisões de modelagem valem registro, já que refletem limitações reais do dataset, não falhas de implementação:

- **P1-Crítica tem apenas 1 registro** na base de 122 mil incidentes. O desafio exige análise obrigatória de P2 e P3, que é onde o volume e a relevância de OLA realmente se concentram — P1 foi tratada como exceção estatística, não como erro.
- **O Random Forest tem recall baixo para a classe "Violado"**, mesmo com balanceamento de classes. O desbalanceamento é extremo (188 violações para quase 20 mil casos não violados no conjunto de treino) — é uma limitação estrutural dos dados, documentada e aceita como tal no MVP.
- **Métricas de atingimento de meta acima de 100%** (ex: 150%) indicam superação da meta, não violação dela — o cálculo usa faixas de excelência onde menos violações geram percentual maior, inspirado em sistemas de bônus corporativos.
- **Explicabilidade do Random Forest**: a variável "Duração (s)" responde por 76,5% da importância do modelo — incidentes que já acumulam tempo elevado têm probabilidade significativamente maior de violar o OLA. As demais variáveis relevantes são hora de abertura (5,9%), mês (5,3%) e prioridade (4,2%).

## Equipe

Projeto desenvolvido para o Challenge FIAP × Locaweb 2026 - Grupo Datateston | 2TSCOA.

---

<p align="center"><sub>Dataset anonimizado fornecido pela Locaweb para fins acadêmicos.</sub></p>