# CEP Crawler - Sistema Assíncrono de Processamento de CEPs

Sistema backend em Node.js/TypeScript que processa intervalos de CEPs de forma assíncrona utilizando fila de mensagens (ElasticMQ), workers em background, MongoDB para persistência e Docker para orquestração.

## 🎯 Características

- ✅ Processamento assíncrono de CEPs via fila de mensagens
- ✅ Workers independentes com controle de concorrência
- ✅ Retry automático com Dead Letter Queue (DLQ)
- ✅ Rate limiting para não sobrecarregar a API ViaCEP
- ✅ Persistência de dados em MongoDB
- ✅ API REST para iniciar processamento e consultar status
- ✅ Orquestração completa via Docker Compose
- ✅ Logs claros de processamento

## 🧩 Características da Codebase

- **Cache com Redis:** Implementado para otimizar consultas repetidas ao ViaCEP, com TTL configurável para dados e erros (404).
- **Dashboard e Métricas:** Endpoint `/cep/dashboard/summary` para dados consolidados e `/metrics` expondo métricas no formato Prometheus.
- **Testes Automatizados:** Testes unitários e de integração configurados com Jest.
- **CI/CD Pipeline:** Configuração de integração contínua presente.
- **Rate Limiting na API:** Proteção contra sobrecarga implementada com `express-rate-limit`.
- **Webhooks:** Sistema de notificação via HTTP POST disparado automaticamente ao finalizar um crawl.

## 🎓 Conceitos Implementados

### Arquitetura Assíncrona

- **Non-blocking API:** Responde imediatamente sem aguardar processamento
- **Message Queue:** Desacoplamento entre produtor e consumidor
- **Background Workers:** Processamento independente e escalável

### Confiabilidade

- **Retry Logic:** Tentativas automáticas em caso de falha
- **Dead Letter Queue:** Isolamento de mensagens problemáticas
- **Graceful Shutdown:** Encerramento controlado dos serviços
- **Health Checks:** Verificação de disponibilidade dos serviços

### Performance

- **Concorrência Controlada:** Processamento paralelo com limites
- **Rate Limiting:** Respeito aos limites da API externa
- **Batch Processing:** Envio de mensagens em lote
- **Índices MongoDB:** Consultas otimizadas

### Escalabilidade

- **Horizontal Scaling:** Múltiplos workers podem ser adicionados
- **Stateless Workers:** Não mantém estado entre processamentos
- **Queue-based:** Fila distribui trabalho automaticamente

## 🏗️ Arquitetura

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ POST /cep/crawl
       ▼
┌─────────────────┐
│   API (Node.js) │───► Cria crawl no MongoDB
│   Express       │───► Enfileira CEPs no SQS
└─────────────────┘
       │
       ▼
┌─────────────────┐
│   ElasticMQ     │
│   (SQS-like)    │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Workers (x2)   │───► Consome mensagens
│  Node.js        │───► Consulta ViaCEP
│  Background     │───► Salva resultados
└─────────────────┘───► Atualiza contadores
       │
       ▼
┌─────────────────┐
│    MongoDB      │
│  - crawls       │
│  - cep_results  │
└─────────────────┘
```

## 🚀 Início Rápido

### Pré-requisitos

- Docker e Docker Compose instalados
- Porta 3000 (API), 27017 (MongoDB), 9324 (ElasticMQ) disponíveis

### Instalação e Execução

1. **Clone e configure o ambiente:**

```bash
cd crawler
cp .env.example .env
```

2. **Inicie todos os serviços com Docker Compose:**

```bash
docker-compose up --build
```

Isso irá subir:
- API HTTP na porta 3000
- MongoDB na porta 27017
- ElasticMQ na porta 9324
- 2 Workers processando em background

3. **Aguarde os serviços ficarem prontos:**

```
✅ MongoDB healthy
✅ ElasticMQ healthy
✅ API iniciada
✅ Workers iniciados
```

## 📡 API Endpoints

### 1. Iniciar Processamento de CEPs

**POST** `/cep/crawl`

```bash
curl -X POST http://localhost:3000/cep/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "cep_start": "01001000",
    "cep_end": "01002000"
  }'
```

**Response (202 Accepted):**
```json
{
  "crawl_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "total": 1001
}
```

### 2. Consultar Status do Processamento

**GET** `/cep/crawl/:crawl_id`

```bash
curl http://localhost:3000/cep/crawl/123e4567-e89b-12d3-a456-426614174000
```

**Response (200 OK):**
```json
{
  "crawl_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "running",
  "total": 1001,
  "processed": 650,
  "success": 620,
  "error": 30,
  "created_at": "2025-12-29T10:00:00.000Z",
  "updated_at": "2025-12-29T10:05:30.000Z"
}
```

**Status possíveis:**
- `pending` - Aguardando início do processamento
- `running` - Em processamento
- `finished` - Concluído
- `failed` - Falhou

### 3. Consultar Resultados (Paginado)

**GET** `/cep/crawl/:crawl_id/results?page=1&limit=50`

```bash
curl "http://localhost:3000/cep/crawl/123e4567-e89b-12d3-a456-426614174000/results?page=1&limit=50"
```

**Response (200 OK):**
```json
{
  "crawl_id": "123e4567-e89b-12d3-a456-426614174000",
  "page": 1,
  "limit": 50,
  "total": 1001,
  "total_pages": 21,
  "data": [
    {
      "_id": "...",
      "crawl_id": "123e4567-e89b-12d3-a456-426614174000",
      "cep": "01001000",
      "status": "success",
      "data": {
        "cep": "01001-000",
        "logradouro": "Praça da Sé",
        "bairro": "Sé",
        "localidade": "São Paulo",
        "uf": "SP",
        ...
      },
      "error_message": null,
      "processed_at": "2025-12-29T10:02:15.000Z"
    },
    ...
  ]
}
```

### 4. Health Check

**GET** `/health`

```bash
curl http://localhost:3000/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-12-29T10:00:00.000Z"
}
```

### 5. Dashboard (Resumo para UI)

**GET** `/cep/dashboard/summary`

Retorna contagens por status, agregados de sucesso/erro e últimos crawls para alimentar um frontend.

### 6. Métricas Prometheus

**GET** `/metrics`

Exposição em formato Prometheus com métricas HTTP e de runtime.

## 🗄️ Modelagem de Dados

### Collection: `crawls`

```typescript
{
  "_id": "uuid",
  "cep_start": "01001000",
  "cep_end": "01002000",
  "status": "pending | running | finished | failed",
  "total": 1001,
  "processed": 650,
  "success": 620,
  "error": 30,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### Collection: `cep_results`

```typescript
{
  "_id": "ObjectId",
  "crawl_id": "uuid",
  "cep": "01001000",
  "status": "success | error",
  "data": {
    "cep": "01001-000",
    "logradouro": "...",
    "bairro": "...",
    ...
  },
  "error_message": null,
  "processed_at": ISODate
}
```

## ⚙️ Configuração

Principais variáveis de ambiente (`.env`):

```bash
# API
PORT=3000

# MongoDB
MONGODB_URI=mongodb://mongodb:27017/cep_crawler

# SQS / ElasticMQ
AWS_REGION=us-east-1
SQS_ENDPOINT=http://elasticmq:9324
SQS_QUEUE_URL=http://elasticmq:9324/000000000000/cep-queue

# Redis Cache
REDIS_URL=redis://redis:6379
REDIS_TTL_SECONDS=86400
REDIS_NULL_TTL_SECONDS=600

# Worker
WORKER_CONCURRENCY=10          # Mensagens simultâneas
WORKER_MAX_RETRIES=3           # Tentativas antes de falha definitiva
WORKER_RETRY_DELAY_MS=1000     # Delay entre retries
VIACEP_RATE_LIMIT=10           # Requisições/segundo por worker

# API
API_RATE_LIMIT_WINDOW_MS=60000 # Janela de rate limit
API_RATE_LIMIT_MAX=200         # Requisições por janela

# Webhooks (opcional)
WEBHOOK_URLS=https://exemplo.com/webhook1,https://exemplo.com/webhook2
```

## 🔄 Funcionamento do Sistema

### Fluxo de Processamento

1. **Cliente envia POST** `/cep/crawl` com range de CEPs
2. **API valida** o range e cria um `crawl_id` único
3. **API calcula** todos os CEPs do intervalo
4. **API cria** registro no MongoDB com status `pending`
5. **API enfileira** cada CEP como mensagem no SQS (em batches de 10)
6. **API responde** imediatamente com `202 Accepted`
7. **Workers** consomem mensagens da fila (10 simultâneas)
8. **Workers** consultam ViaCEP com rate limiting
9. **Workers** salvam resultados no MongoDB
10. **Workers** atualizam contadores do crawl
11. **Workers** deletam mensagem da fila após sucesso
12. **Crawl** muda para `finished` quando todos os CEPs são processados

### Tratamento de Erros e Retry

- **Retry Automático:** Até 3 tentativas por CEP
- **Exponential Backoff:** Delay de 1s entre tentativas
- **Dead Letter Queue:** Mensagens com falha definitiva vão para DLQ
- **Erros Temporários:** Worker retenta automaticamente
- **Erros Permanentes:** CEP marcado como erro após 3 tentativas

### Controle de Concorrência

- **API:** Não bloqueia - responde imediatamente
- **Workers:** 2 instâncias processando em paralelo
- **Por Worker:** 10 mensagens simultâneas
- **Rate Limit:** 10 requisições/segundo ao ViaCEP por worker

## 🧪 Testando o Sistema

### Teste Básico (Range Pequeno)

```bash
# Iniciar crawl de 10 CEPs
curl -X POST http://localhost:3000/cep/crawl \
  -H "Content-Type: application/json" \
  -d '{"cep_start": "01001000", "cep_end": "01001009"}'

# Resposta: {"crawl_id": "...", "status": "pending", "total": 10}

# Aguardar alguns segundos e consultar status
curl http://localhost:3000/cep/crawl/{crawl_id}

# Ver resultados
curl "http://localhost:3000/cep/crawl/{crawl_id}/results?page=1&limit=10"
```

### Teste de Carga (Range Maior)

```bash
# 1000 CEPs
curl -X POST http://localhost:3000/cep/crawl \
  -H "Content-Type: application/json" \
  -d '{"cep_start": "01001000", "cep_end": "01001999"}'
```

### Monitorar Logs

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver apenas logs dos workers
docker-compose logs -f worker

# Ver apenas logs da API
docker-compose logs -f api
```

## 📊 Monitoramento

### Verificar Fila (ElasticMQ)

```bash
# Acessar interface web do ElasticMQ
curl http://localhost:9325/

# Ver estatísticas das filas
```

### Consultar MongoDB Diretamente

```bash
# Conectar ao MongoDB
docker exec -it cep-mongodb mongosh cep_crawler

# Ver crawls
db.crawls.find().pretty()

# Ver resultados
db.cep_results.find().limit(10).pretty()

# Contar resultados por status
db.cep_results.aggregate([
  {$group: {_id: "$status", count: {$sum: 1}}}
])
```

## 🛠️ Desenvolvimento Local

### Rodar sem Docker

1. **Instalar dependências:**

```bash
npm install
```

2. **Configurar `.env` para serviços locais:**

```bash
MONGODB_URI=mongodb://localhost:27017/cep_crawler
SQS_ENDPOINT=http://localhost:9324
```

3. **Rodar API em modo dev:**

```bash
npm run dev
```

4. **Rodar Worker em modo dev (outro terminal):**

```bash
npm run worker
```

### Build TypeScript

```bash
npm run build
```

### Linting e Formatação

```bash
npm run lint
npm run format
```

## 🐳 Docker Commands

```bash
# Subir todos os serviços
docker-compose up -d

# Reconstruir imagens
docker-compose up --build

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Parar e limpar volumes
docker-compose down -v

# Escalar workers (4 instâncias)
docker-compose up -d --scale worker=4
```

## 📁 Estrutura do Projeto

```
crawler/
├── src/
│   ├── config/
│   │   ├── database.ts        # Configuração MongoDB
│   │   └── queue.ts           # Configuração SQS
│   ├── controllers/
│   │   └── CepController.ts   # Controladores da API
│   ├── models/
│   │   ├── Crawl.ts           # Modelo de Crawl
│   │   └── CepResult.ts       # Modelo de Resultado
│   ├── repositories/
│   │   ├── CrawlRepository.ts
│   │   └── CepResultRepository.ts
│   ├── queue/
│   │   ├── types.ts           # Tipos de mensagens
│   │   ├── producer.ts        # Produtor de mensagens
│   │   └── consumer.ts        # Consumidor de mensagens
│   ├── routes/
│   │   └── cepRoutes.ts       # Rotas da API
│   ├── services/
│   │   ├── CrawlService.ts    # Lógica de negócio
│   │   └── ViaCepService.ts   # Cliente ViaCEP
│   ├── utils/
│   │   └── cepUtils.ts        # Utilitários de CEP
│   ├── workers/
│   │   └── cepWorker.ts       # Worker assíncrono
│   └── index.ts               # Entry point da API
├── docker-compose.yml         # Orquestração Docker
├── Dockerfile.api             # Imagem Docker da API
├── Dockerfile.worker          # Imagem Docker do Worker
├── elasticmq.conf             # Configuração ElasticMQ
├── package.json
├── tsconfig.json
└── README.md
```

## 📄 Licença

MIT

## 👤 Autor

Sistema desenvolvido como demonstração de arquitetura assíncrona com Node.js, TypeScript, Message Queue e MongoDB.
