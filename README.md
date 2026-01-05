# CI/CD Pipeline - Job Lint

## Visão Geral

O job **lint** é responsável por verificar a qualidade e formatação do código Python no pipeline de CI/CD. Ele garante que o código siga padrões de estilo, esteja bem formatado e não contenha erros críticos de sintaxe.

## Configuração do Job

```yaml
lint:
  name: Lint and Code Quality
  runs-on: ubuntu-latest
```

- **name**: "Lint and Code Quality" - Nome descritivo exibido na interface do GitHub Actions
- **runs-on**: ubuntu-latest - Executa em um runner com a versão mais recente do Ubuntu

## Passos do Job

### 1. Checkout Code

```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

Faz o clone do repositório para o runner, permitindo que os próximos passos tenham acesso ao código-fonte.

### 2. Set up Python

```yaml
- name: Set up Python
  uses: actions/setup-python@v5
  with:
    python-version: ${{ env.PYTHON_VERSION }}
```

Instala a versão do Python especificada na variável de ambiente `PYTHON_VERSION` (3.11). Isso garante que todos os jobs usem a mesma versão do Python.

### 3. Cache Dependencies

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-
```

Armazena em cache as dependências do pip para otimizar execuções futuras.

#### Parâmetros do Cache:

**path: ~/.cache/pip**

- Define o diretório que será armazenado em cache
- `~/.cache/pip` é o local padrão onde o pip armazena pacotes baixados no Linux
- Quando o cache é restaurado, os pacotes já estarão disponíveis localmente

**restore-keys:**

```yaml
restore-keys: |
  ${{ runner.os }}-pip-
```

É uma **chave de fallback** (alternativa):

- Se não encontrar a chave exata, busca qualquer cache que comece com `Linux-pip-`
- Útil quando o requirements.txt foi modificado ligeiramente
- O pipeline usa o cache antigo parcial e baixa apenas os pacotes novos/alterados
- **Hierarquia**: Tenta a chave exata primeiro, depois as restore-keys

### 4. Install Dependencies

```yaml
- name: Install dependencies
  run: |
    python -m pip install --upgrade pip
    pip install flake8 black isort
    pip install -r requirements.txt
```

Instala as ferramentas necessárias para linting e formatação:

- **flake8**: Verifica erros de sintaxe e conformidade com PEP 8
- **black**: Formatador automático de código Python
- **isort**: Organizador de imports
- Também instala todas as dependências do projeto listadas em requirements.txt

### 5. Run Black (Code Formatting)

```yaml
- name: Run Black (Code Formatting)
  run: black --check --diff .
```

Verifica se o código está formatado conforme o padrão Black:

- `--check`: Não modifica os arquivos, apenas verifica
- `--diff`: Mostra as diferenças entre o código atual e o esperado
- `.`: Verifica todos os arquivos Python no diretório atual

**O job falhará se houver código não formatado.**

### 6. Run isort (Import Sorting)

```yaml
- name: Run isort (Import Sorting)
  run: isort --profile black --check-only --diff .
```

Verifica se os imports estão organizados corretamente:

- `--profile black`: Usa configuração compatível com Black
- `--check-only`: Apenas verifica, não modifica arquivos
- `--diff`: Mostra diferenças encontradas

**O job falhará se os imports não estiverem ordenados corretamente.**

### 7. Run Flake8 (Linting)

```yaml
- name: Run Flake8 (Linting)
  run: flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
```

Verifica erros críticos de código:

- `--count`: Conta o número de erros
- `--select=E9,F63,F7,F82`: Seleciona apenas erros críticos:
  - **E9**: Erros de sintaxe
  - **F63**: Comparações inválidas
  - **F7**: Erros de indentação
  - **F82**: Variáveis indefinidas ou não utilizadas
- `--show-source`: Mostra o código-fonte com erro
- `--statistics`: Exibe estatísticas dos erros encontrados

**O job falhará se algum erro crítico for detectado.**

## Resultado

Se qualquer uma das verificações falhar, o job inteiro falhará, impedindo que código mal formatado, com imports desorganizados ou erros críticos seja integrado ao repositório.

Este job é essencial para manter a qualidade e consistência do código ao longo do desenvolvimento do projeto.

---

# CI/CD Pipeline - Job Test

## Visão Geral

O job **test** executa testes unitários do projeto em múltiplas versões do Python para garantir compatibilidade e qualidade do código. Ele usa uma estratégia de matriz para testar simultaneamente em diferentes versões do Python e gera relatórios de cobertura de código.

## Configuração do Job

```yaml
test:
  name: Unit Tests
  runs-on: ubuntu-latest
  needs: lint
  strategy:
    matrix:
      python-version: ["3.9", "3.10", "3.11"]
```

- **name**: "Unit Tests" - Nome descritivo do job
- **runs-on**: ubuntu-latest - Executa em Ubuntu
- **needs: lint** - **Dependência crítica**: Só executa após o job `lint` ser bem-sucedido. Se o lint falhar, este job nem começa.
- **strategy.matrix**: Cria **3 jobs paralelos**, um para cada versão do Python (3.9, 3.10, 3.11)

### Strategy Matrix - Execução Paralela

A matriz de teste permite testar o código em múltiplas versões do Python simultaneamente:

- **Job 1**: Python 3.9
- **Job 2**: Python 3.10
- **Job 3**: Python 3.11

**Todos os 3 jobs devem passar** para que o job test seja considerado bem-sucedido. Isso garante que o código funciona corretamente em todas as versões suportadas.

## Passos do Job

### 1. Checkout Code

```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

Clona o repositório. Este passo é executado em **cada uma das 3 instâncias da matriz**.

### 2. Set up Python (Versão da Matrix)

```yaml
- name: Set up Python ${{ matrix.python-version }}
  uses: actions/setup-python@v5
  with:
    python-version: ${{ matrix.python-version }}
```

Instala a versão específica do Python para cada job da matriz:

- No job 1: instala Python 3.9
- No job 2: instala Python 3.10
- No job 3: instala Python 3.11

`${{ matrix.python-version }}` é substituído dinamicamente pelo valor correspondente da matriz.

### 3. Cache Dependencies (Por Versão do Python)

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ matrix.python-version }}-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-${{ matrix.python-version }}-
```

Armazena cache das dependências, **separado por versão do Python**.

#### Diferença do Job Lint

A chave de cache inclui `${{ matrix.python-version }}` para criar caches separados:

- `Linux-pip-3.9-abc123` (cache para Python 3.9)
- `Linux-pip-3.10-abc123` (cache para Python 3.10)
- `Linux-pip-3.11-abc123` (cache para Python 3.11)

**Por que separar?** Pacotes compilados (wheels) podem ser diferentes entre versões do Python. Usar caches separados garante compatibilidade e evita conflitos.

### 4. Install Dependencies

```yaml
- name: Install dependencies
  run: |
    python -m pip install --upgrade pip
    pip install -r requirements.txt
```

Instala as dependências do projeto.

**Nota importante**: Diferente do job `lint`, aqui **não são instalados** flake8, black, isort. O requirements.txt deve conter `pytest` e `pytest-cov` para os próximos passos funcionarem.

### 5. Run Tests with Pytest

```yaml
- name: Run tests with pytest
  run: |
    pytest --verbose --tb=short --cov=. --cov-report=xml --cov-report=term
```

Executa os testes usando pytest com várias opções:

- **`--verbose`**: Saída detalhada, mostra cada teste executado individualmente
- **`--tb=short`**: Traceback resumido em caso de falha (não mostra todo o stack completo)
- **`--cov=.`**: Calcula cobertura de código para o diretório atual (`.`)
- **`--cov-report=xml`**: Gera relatório de cobertura em formato XML no arquivo `coverage.xml` (usado pelo Codecov)
- **`--cov-report=term`**: Exibe relatório de cobertura no terminal durante a execução

### 6. Upload Coverage to Codecov

```yaml
- name: Upload coverage to Codecov
  if: matrix.python-version == '3.11'
  uses: codecov/codecov-action@v4
  with:
    file: ./coverage.xml
    flags: unittests
    name: codecov-umbrella
```

Envia o relatório de cobertura para o serviço **Codecov**.

#### O que é Codecov?

**Codecov** (https://codecov.io) é um serviço web que analisa e visualiza a **cobertura de testes** do código.

**Cobertura de código** mede quantas linhas do código foram executadas durante os testes:

```python
def calcular(a, b, operacao):
    if operacao == 'soma':        # ✅ Testado
        return a + b               # ✅ Testado
    elif operacao == 'sub':        # ❌ Não testado
        return a - b               # ❌ Não testado
    else:                          # ❌ Não testado
        return None                # ❌ Não testado

# Cobertura: 33% (2 de 6 linhas testadas)
```

#### Recursos do Codecov:

1. **Recebe** o arquivo `coverage.xml` gerado pelo pytest
2. **Analisa** quais linhas foram testadas e quais não foram
3. **Calcula** percentuais de cobertura
4. **Gera relatórios visuais** interativos
5. **Integra** com GitHub, mostrando cobertura em Pull Requests
6. **Rastreia** histórico de cobertura ao longo do tempo
7. **Alerta** se a cobertura diminuir

#### Condicional Importante

```yaml
if: matrix.python-version == '3.11'
```

- **Executa apenas no job Python 3.11**
- Evita enviar 3 relatórios duplicados (um por versão da matriz)
- Usa a versão mais recente como referência para o Codecov

#### Parâmetros do Upload:

- **`file: ./coverage.xml`**: Arquivo gerado pelo pytest com `--cov-report=xml`
  - O nome `coverage.xml` é o **padrão do pytest-cov** (definido automaticamente)
  - Criado na raiz do projeto quando você executa `pytest --cov-report=xml`
- **`flags: unittests`**: Tag para categorizar no Codecov (útil para separar unit tests de integration tests)

- **`name: codecov-umbrella`**: Nome identificador do upload no Codecov

#### Como Usar o Codecov:

1. Criar conta gratuita em https://codecov.io
2. Conectar seu repositório GitHub
3. Configurar token (opcional para repositórios públicos)
4. O pipeline envia automaticamente os relatórios
5. Visualizar em https://codecov.io/gh/seu-usuario/seu-repo

## Vantagens da Matrix Strategy

1. **Compatibilidade**: Garante que o código funciona em múltiplas versões do Python
2. **Paralelização**: Os 3 jobs rodam simultaneamente, reduzindo tempo total
3. **Detecção Precoce**: Identifica problemas específicos de versão antes do deploy
4. **Cobertura Ampla**: Testa em Python 3.9, 3.10 e 3.11 simultaneamente

Se qualquer uma das versões falhar, você saberá exatamente qual versão do Python tem problemas, facilitando a correção.

## Resultado

O job test garante que:

- ✅ Todos os testes passam em Python 3.9, 3.10 e 3.11
- ✅ O código tem cobertura adequada de testes
- ✅ Não há regressões ou bugs introduzidos
- ✅ O código é compatível com múltiplas versões do Python
- ✅ Métricas de cobertura são rastreadas no Codecov

Este job é fundamental para garantir a qualidade e confiabilidade do código antes de prosseguir para os próximos estágios do pipeline.

---

# CI/CD Pipeline - Job Security

## Visão Geral

O job **security** realiza varredura de segurança no código e nas dependências do projeto, identificando vulnerabilidades conhecidas e problemas de segurança. Este job roda **em paralelo com o job test**, otimizando o tempo total do pipeline.

## Configuração do Job

```yaml
security:
  name: Security Scan
  runs-on: ubuntu-latest
  needs: lint
```

- **name**: "Security Scan" - Nome descritivo do job
- **runs-on**: ubuntu-latest - Executa em Ubuntu
- **needs: lint** - Depende apenas do job `lint`, rodando **em paralelo** com o job `test`

## Ferramentas de Segurança

### 1. Safety - Verificação de Vulnerabilidades em Dependências

**Safety** verifica se as dependências instaladas (pacotes Python) têm **vulnerabilidades conhecidas** registradas em bancos de dados CVE (Common Vulnerabilities and Exposures).

```yaml
- name: Run Safety (Dependency Vulnerability Check)
  run: safety check
```

#### Como funciona:

- Lê todos os pacotes instalados no ambiente
- Consulta banco de dados de vulnerabilidades
- Reporta pacotes com problemas de segurança conhecidos
- **Bloqueia o pipeline** se vulnerabilidades forem encontradas

#### Exemplos de vulnerabilidades detectadas:

- SQL Injection em versões antigas do Django
- Execução remota de código em bibliotecas de serialização
- Bypass de autenticação em frameworks web
- Exposição de dados sensíveis

### 2. Bandit - Análise de Segurança do Código-Fonte

**Bandit** analisa o **código-fonte Python** em busca de **problemas de segurança comuns** e más práticas.

```yaml
- name: Run Bandit (Security Linting)
  run: bandit -r . -f json -o bandit-report.json || true
```

#### Parâmetros:

- **`-r .`**: Recursivo, analisa todos os arquivos Python
- **`-f json`**: Formato de saída JSON
- **`-o bandit-report.json`**: Salva relatório em arquivo
- **`|| true`**: **Não falha o pipeline**, apenas gera relatório para análise

#### O que o Bandit detecta:

- ✅ Senhas hardcoded no código
- ✅ Uso de funções inseguras (eval, exec, pickle)
- ✅ SQL injection vulnerável
- ✅ Comandos de shell sem sanitização
- ✅ Uso de HTTP ao invés de HTTPS
- ✅ Criptografia fraca
- ✅ Permissões de arquivo inseguras

## Upload de Artefatos

```yaml
- name: Upload Bandit Report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: bandit-report
    path: bandit-report.json
```

O relatório do Bandit é salvo como **artifact** (artefato) do GitHub Actions.

### O que são Artifacts?

**Artifacts** são arquivos gerados durante a execução do workflow que ficam **disponíveis para download**.

#### Características:

- **`if: always()`**: Salva o relatório mesmo se o job falhar
- Disponível por **90 dias** (padrão do GitHub)
- Acessível via interface do GitHub Actions
- Formato JSON, fácil de processar e analisar

#### Como acessar:

1. Vá até a página do workflow no GitHub Actions
2. Na seção "Artifacts", clique em "bandit-report"
3. Baixe o arquivo JSON para análise detalhada

## Passos do Job

1. **Checkout code** - Clona o repositório
2. **Set up Python** - Instala Python 3.11
3. **Install dependencies** - Instala Safety, Bandit e dependências do projeto
4. **Run Safety** - Verifica vulnerabilidades em dependências (bloqueia se encontrar)
5. **Run Bandit** - Analisa código-fonte (gera relatório, não bloqueia)
6. **Upload Bandit Report** - Salva relatório como artifact (sempre executa)

## Resultado

O job security garante que:

- ✅ Dependências não têm vulnerabilidades conhecidas
- ✅ Código-fonte é analisado para problemas de segurança
- ✅ Relatórios detalhados estão disponíveis para análise
- ✅ Pipeline é bloqueado se vulnerabilidades críticas forem encontradas
- ✅ Problemas de segurança são identificados antes do deploy

Este job é essencial para proteger a aplicação contra vulnerabilidades conhecidas e más práticas de segurança, prevenindo incidentes de segurança em produção.

---

# CI/CD Pipeline - Job Build

## Visão Geral

O job **build** cria a imagem Docker da aplicação e a publica no Docker Hub. Ele só executa após os jobs de teste e segurança passarem com sucesso, garantindo que apenas código validado seja empacotado.

## Configuração do Job

```yaml
build:
  name: Build Docker Image
  runs-on: ubuntu-latest
  needs: [test, security]
  outputs:
    image-tag: ${{ secrets.DOCKERHUB_USERNAME }}/task-manager:sha-${{ github.sha }}
    image-digest: ${{ steps.build.outputs.digest }}
```

- **name**: "Build Docker Image" - Nome descritivo
- **runs-on**: ubuntu-latest - Executa em Ubuntu
- **needs: [test, security]** - **Espera AMBOS os jobs passarem**. Se qualquer um falhar, o build não acontece.
- **outputs**: Compartilha informações com jobs posteriores (deploy)

### Outputs - Compartilhamento de Informações

Os outputs permitem que este job passe informações para jobs subsequentes:

- **`image-tag`**: Tag completa da imagem (ex: `usuario/task-manager:sha-abc123`)
- **`image-digest`**: Digest SHA256 da imagem (garantia de integridade)

Jobs posteriores acessam via: `${{ needs.build.outputs.image-tag }}`

## Ferramentas e Recursos

### Docker Buildx

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3
```

**Buildx** é uma ferramenta avançada que permite:

- ✅ **Builds multiplataforma** (AMD64, ARM64 simultaneamente)
- ✅ **Cache inteligente** para acelerar builds
- ✅ **Build paralelo** de múltiplas arquiteturas
- ✅ **Suporte a BuildKit** (engine moderna do Docker)

### Autenticação Condicional

```yaml
- name: Log in to Docker Hub
  if: github.event_name != 'pull_request'
  uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}
```

**Só faz login se NÃO for Pull Request**:

- ✅ Push para `main`/`develop`: faz login e push da imagem
- ❌ Pull Request: apenas builda (validação), não faz push

**Por quê?** PRs podem vir de forks externos que não devem ter acesso aos secrets.

### Tags Automáticas

```yaml
- name: Extract metadata
  id: meta
  uses: docker/metadata-action@v5
  with:
    images: ${{ secrets.DOCKERHUB_USERNAME }}/task-manager
    tags: |
      type=ref,event=branch
      type=ref,event=pr
      type=sha,prefix=sha-
      type=raw,value=latest,enable={{is_default_branch}}
```

A action **metadata** gera automaticamente tags baseadas no contexto Git:

#### Tags Geradas por Cenário:

**Push para `main` (commit abc123):**

```
task-manager:main
task-manager:sha-abc123
task-manager:latest
```

**Push para `develop` (commit def456):**

```
task-manager:develop
task-manager:sha-def456
```

**Pull Request #10:**

```
task-manager:pr-10
task-manager:sha-ghi789
```

#### Tipos de Tags:

- **`type=ref,event=branch`**: Nome da branch (main, develop)
- **`type=ref,event=pr`**: Número do PR (pr-10)
- **`type=sha,prefix=sha-`**: Hash do commit (imutável, rastreável)
- **`type=raw,value=latest`**: Tag "latest" apenas para branch principal

### Build Multiplataforma

```yaml
- name: Build and push Docker image
  id: build
  uses: docker/build-push-action@v5
  with:
    context: .
    platforms: linux/amd64,linux/arm64
    push: ${{ github.event_name != 'pull_request' }}
    tags: ${{ steps.meta.outputs.tags }}
    labels: ${{ steps.meta.outputs.labels }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

#### Parâmetros Principais:

**`platforms: linux/amd64,linux/arm64`**

- Cria imagens para **Intel/AMD** (servidores tradicionais) e **ARM** (Raspberry Pi, AWS Graviton, Apple M1/M2)
- Build único que funciona em múltiplas arquiteturas

**`push: ${{ github.event_name != 'pull_request' }}`**

- Condicional: só faz push se não for PR
- PRs apenas validam (build sem push)

**`tags: ${{ steps.meta.outputs.tags }}`**

- Usa tags geradas pelo passo "Extract metadata"
- Múltiplas tags aplicadas automaticamente

**`cache-from: type=gha` / `cache-to: type=gha,mode=max`**

- **Lê e salva cache** no GitHub Actions Cache
- `mode=max`: Armazena todas as layers para máxima eficiência
- Reduz tempo de build de ~5min para ~30seg em builds subsequentes

### Referência Entre Passos

```yaml
# Passo 4: Gera outputs
- id: meta
  uses: docker/metadata-action@v5
  # Gera automaticamente:
  # - outputs.tags
  # - outputs.labels

# Passo 5: Usa os outputs
- id: build
  uses: docker/build-push-action@v5
  with:
    tags: ${{ steps.meta.outputs.tags }} # ← Referencia passo "meta"
    labels: ${{ steps.meta.outputs.labels }} # ← Referencia passo "meta"
```

**Como funciona:**

- `id: meta` cria uma referência ao passo
- `steps.meta.outputs.tags` acessa os valores gerados
- Permite desacoplamento e reutilização de configurações

## Fluxo de Execução

```
1. Espera test + security passarem
   ↓
2. Faz checkout do código
   ↓
3. Configura Docker Buildx
   ↓
4. [Se não for PR] Faz login no Docker Hub
   ↓
5. Gera tags automáticas (main, sha, latest)
   ↓
6. Builda imagem para AMD64 + ARM64 com cache
   ↓
7. [Se não for PR] Faz push para Docker Hub
   ↓
8. Exporta image-tag e digest para jobs seguintes
```

## Resultado

O job build garante que:

- ✅ Imagem Docker criada apenas com código validado (testes + segurança)
- ✅ Suporte multiplataforma (AMD64 + ARM64)
- ✅ Tags automáticas e organizadas por contexto Git
- ✅ Cache inteligente acelera builds subsequentes
- ✅ Pull Requests validados sem acesso a secrets
- ✅ Imagem disponível no Docker Hub para deploy
- ✅ Rastreabilidade via tags SHA (imutáveis)
- ✅ Informações passadas para jobs de deploy via outputs

Este job é fundamental para empacotar a aplicação em um formato portável, pronto para deploy em qualquer ambiente compatível com Docker.

---

# CI/CD Pipeline - Job Integration-Test

## Visão Geral

O job **integration-test** testa a aplicação completa rodando em um container Docker, verificando se todos os componentes funcionam juntos corretamente (API, frontend, banco de dados, etc). Diferente dos testes unitários que testam funções isoladas, os testes de integração validam o **sistema completo** em um ambiente real.

## Configuração do Job

```yaml
integration-test:
  name: Integration Tests
  runs-on: ubuntu-latest
  needs: build
  if: github.event_name != 'pull_request'
```

- **name**: "Integration Tests" - Nome descritivo
- **runs-on**: ubuntu-latest - Executa em Ubuntu
- **needs: build** - Depende do job `build` (aguarda a imagem Docker ser criada)
- **if: github.event_name != 'pull_request'** - **Não executa em Pull Requests**

## Passos do Job

### 1. Checkout Code

```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

Clona o repositório para ter acesso ao Dockerfile e código.

### 2. Build Local Docker Image

```yaml
- name: Build local Docker image for testing
  run: docker build -t local-task-manager:test .
```

Constrói a imagem Docker **localmente** para testes.

**Por que buildar novamente?**

- O job `build` fez push para Docker Hub, mas não queremos depender de download
- Build local é mais rápido (cache do runner)
- Tag simples `local-task-manager:test` (local, não enviada ao Docker Hub)

### 3. Start Application Container

```yaml
- name: Start application container
  run: |
    docker run -d -p 8000:8000 --name integration-test-app \
      local-task-manager:test
```

Inicia o container da aplicação em background.

#### Parâmetros do Docker Run:

- **`-d`**: Detached mode (background) - container roda sem bloquear
- **`-p 8000:8000`**: Port mapping - porta 8000 do container → porta 8000 do host
- **`--name integration-test-app`**: Nome do container (para parar/remover depois)

**Resultado**: Aplicação rodando em background, acessível em `http://localhost:8000`

### 4. Wait for Application to be Ready

```yaml
- name: Wait for application to be ready
  run: |
    timeout 60 bash -c 'until curl -f http://localhost:8000/api/health; do sleep 2; done'
```

Aguarda a aplicação estar **completamente inicializada** antes de testar.

#### Como funciona:

- **`timeout 60`**: Falha se a app não responder em 60 segundos
- **`until curl -f .../health; do sleep 2; done`**: Loop "até que" funcione
  - Tenta acessar endpoint de health
  - Se falhar, aguarda 2 segundos e tenta novamente
  - Quando retornar HTTP 200, sai do loop

**Por que necessário?**

- Container inicia rápido, mas app demora para ficar pronta
- Banco de dados precisa migrar
- Servidor web precisa iniciar
- Sem isso, testes falhariam com "connection refused"

### 5. Run API Integration Tests

Testa o **fluxo completo CRUD** (Create, Read, Update, Delete) da aplicação:

#### a) Health Check

```bash
curl -f http://localhost:8000/api/health
```

Verifica se a API está respondendo (método GET padrão).

#### b) Criar Tarefa (POST)

```bash
TASK_ID=$(curl -s -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Integration Test Task","priority":"high"}' | \
  python -c "import sys, json; print(json.load(sys.stdin)['id'])")
```

- **`-X POST`**: Especifica método HTTP POST
- **`-H "Content-Type: application/json"`**: Header JSON
- **`-d '{...}'`**: Corpo da requisição
- **`| python -c ...`**: Extrai o ID da resposta JSON
- **`TASK_ID=$(...)`**: Armazena ID em variável

**Resposta esperada**: `{"id": "abc-123", "title": "...", "priority": "high", "completed": false}`

#### c) Buscar Tarefa (GET)

```bash
curl -f http://localhost:8000/api/tasks/$TASK_ID
```

Verifica se a tarefa criada pode ser recuperada (sem `-X` = GET automático).

#### d) Atualizar Tarefa (PUT)

```bash
curl -f -X PUT http://localhost:8000/api/tasks/$TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

Marca a tarefa como completa.

#### e) Estatísticas (GET)

```bash
curl -f http://localhost:8000/api/stats
```

Testa endpoint de estatísticas/agregação de dados.

#### f) Deletar Tarefa (DELETE)

```bash
curl -f -X DELETE http://localhost:8000/api/tasks/$TASK_ID
```

Remove a tarefa criada e limpa dados de teste.

### 6. Test Frontend Accessibility

```yaml
- name: Test frontend accessibility
  run: |
    curl -f http://localhost:8000/
    curl -f http://localhost:8000/static/style.css
    curl -f http://localhost:8000/static/script.js
```

Testa se o **frontend** está acessível:

- Página principal (HTML)
- Arquivo CSS
- Arquivo JavaScript

**Verifica**:

- ✅ Servidor serve arquivos estáticos
- ✅ Rotas de frontend configuradas
- ✅ Sem erros 404 em recursos essenciais

### 7. Cleanup Integration Test Container

```yaml
- name: Cleanup integration test container
  if: always()
  run: docker stop integration-test-app && docker rm integration-test-app
```

**Sempre limpa o container**, mesmo se testes falharem.

- **`if: always()`**: Executa independente de falhas
- **`docker stop`**: Para o container
- **`docker rm`**: Remove o container
- **Por quê?** Libera recursos e evita conflitos

## Métodos HTTP no curl

**Regra**: Sem `-X` = GET automático | Com `-X MÉTODO` = Método especificado

## O que este job valida

- ✅ **Integração completa**: API + Banco + Frontend funcionando juntos
- ✅ **CRUD completo**: Create, Read, Update, Delete
- ✅ **Endpoints funcionais**: Todos os endpoints críticos respondem
- ✅ **Servidor web**: Serve arquivos estáticos corretamente
- ✅ **Container funcional**: Imagem Docker inicia e roda corretamente
- ✅ **Fluxo real de usuário**: Simula operações reais na aplicação
- ✅ **Ambiente real**: Testa com banco de dados e serviços reais (não mocks)

## Resultado

O job integration-test garante que:

- ✅ Aplicação completa funciona em container Docker
- ✅ API responde corretamente a todas as operações
- ✅ Banco de dados está integrado e funcionando
- ✅ Frontend está acessível e arquivos estáticos carregam
- ✅ Fluxo completo de usuário funciona sem erros
- ✅ Sistema está pronto para deploy em ambiente real

Este job é essencial para validar que todos os componentes da aplicação funcionam juntos corretamente antes de fazer deploy para staging ou produção. Ele complementa os unit tests testando o **sistema inteiro** ao invés de componentes isolados.

---

# CI/CD Pipeline - Job Performance-Test

## Visão Geral

O job **performance-test** testa o **desempenho** da aplicação sob carga, simulando múltiplos usuários acessando simultaneamente. Enquanto os testes de integração verificam se a aplicação **funciona**, os testes de performance verificam se ela **funciona bem sob pressão**.

## Configuração do Job

```yaml
performance-test:
  name: Performance Tests
  runs-on: ubuntu-latest
  needs: integration-test
  if: github.event_name != 'pull_request'
```

- **name**: "Performance Tests" - Nome descritivo
- **runs-on**: ubuntu-latest - Executa em Ubuntu
- **needs: integration-test** - Depende do job `integration-test` passar primeiro
- **if: github.event_name != 'pull_request'** - **Não executa em Pull Requests**

### Por que depende de integration-test?

```
integration-test → performance-test
```

**Lógica**: Só faz sentido testar desempenho se a aplicação **funciona corretamente**. Se os testes de integração falharem, não adianta testar performance.

### Comparação: Integration vs Performance

| Aspecto        | Integration Test   | Performance Test                        |
| -------------- | ------------------ | --------------------------------------- |
| **Pergunta**   | Funciona?          | Funciona bem sob carga?                 |
| **Usuários**   | 1 usuário simulado | 50+ usuários simultâneos                |
| **Duração**    | Rápido (~30s)      | Mais longo (~2min)                      |
| **O que mede** | Funcionalidade     | Velocidade, capacidade, limites         |
| **Falha se**   | API retorna erro   | Tempo de resposta alto, erros sob carga |

## Ferramenta: Locust

### O que é Locust?

```yaml
- name: Install dependencies
  run: pip install locust
```

**Locust** é uma ferramenta Python de teste de carga que:

- ✅ Simula **milhares de usuários** simultâneos
- ✅ Mede **tempo de resposta** e **throughput** (requisições/segundo)
- ✅ Identifica **gargalos** de performance
- ✅ Detecta quando a aplicação **quebra** sob carga

**Alternativas**: JMeter, k6, Gatling

### Locustfile - Script de Teste

O teste requer um arquivo `.github/workflows/locustfile.py` que define **quais requests fazer**:

## Execução do Teste de Carga

```yaml
- name: Run performance tests
  run: |
    docker run -d -p 8000:8000 --name perf-test-app local-task-manager:test
    timeout 60 bash -c 'until curl -f http://localhost:8000/api/health; do sleep 2; done'

    locust -f .github/workflows/locustfile.py \
      --host http://localhost:8000 \
      --users 50 \
      --spawn-rate 5 \
      --run-time 2m \
      --headless \
      --only-summary
```

### Parâmetros do Locust Explicados:

**`-f .github/workflows/locustfile.py`**

- Arquivo Python que define quais requests fazer
- Script de teste de carga personalizado

**`--host http://localhost:8000`**

- URL base da aplicação a testar
- Todos os endpoints no locustfile usam essa base

**`--users 50`**

- **50 usuários simultâneos** (virtuais)
- Simula 50 pessoas usando a app ao mesmo tempo
- Quanto mais usuários, mais carga

**`--spawn-rate 5`**

- **5 usuários por segundo** são adicionados
- Rampa gradual de carga (não sobrecarrega de uma vez)
- 50 usuários ÷ 5/s = **10 segundos** para atingir carga máxima

**`--run-time 2m`**

- Duração total do teste: **2 minutos**
- Após atingir 50 usuários, mantém por 1min50s
- Permite estabilização e medição consistente

**`--headless`**

- Modo **sem interface gráfica**
- Apenas output de texto (ideal para CI/CD)

**`--only-summary`**

- Mostra apenas **resumo final**
- Não mostra detalhes de cada request
- Output limpo e conciso

## Exemplo de Output do Locust

```
Type     Name                # reqs      # fails  |     Avg     Min     Max  Median  |   req/s
--------|----------------|---------|-------------|-------|-------|-------|--------|--------
GET      /api/tasks          3000     0(0.00%)  |      45      12     234      38  |   25.0
POST     /api/tasks          1000     0(0.00%)  |      78      23     456      65  |    8.3
GET      /api/stats          2000     0(0.00%)  |      32       8     189      28  |   16.7
--------|----------------|---------|-------------|-------|-------|-------|--------|--------
         Aggregated          6000     0(0.00%)  |      48       8     456      35  |   50.0

Response time percentiles (approximated):
Type     Name                50%    66%    75%    80%    90%    95%    98%    99%  99.9%   100%
--------|----------------|--------|------|------|------|------|------|------|------|------|------
GET      /api/tasks           38     42     48     52     68     89    145    198    230    234
POST     /api/tasks           65     72     82     88    112    156    289    378    450    456
GET      /api/stats           28     31     35     38     48     62     98    134    185    189
--------|----------------|--------|------|------|------|------|------|------|------|------|------
         Aggregated           35     40     46     51     68     92    156    234    450    456
```

### Métricas Medidas:

- **# reqs**: Número total de requisições feitas
- **# fails**: Número de falhas (erros HTTP)
- **Avg**: Tempo médio de resposta (ms)
- **Min/Max**: Tempo mais rápido/lento (ms)
- **Median**: Tempo do meio - 50% mais rápido, 50% mais lento
- **req/s**: Requisições por segundo (throughput)
- **Percentis**: 95% das requests respondem em X ms ou menos

## O que o Teste Identifica

### Problemas de Performance:

**Tempo de resposta alto**:

```
❌ Avg: 2000ms (2 segundos) → Muito lento!
✅ Avg: 50ms → Rápido
```

**Falhas sob carga**:

```
❌ 3000 requests, 500 fails (16.6%) → Sistema quebrando
✅ 3000 requests, 0 fails (0%) → Sistema estável
```

**Gargalos**:

```
GET /api/tasks    Avg: 40ms   ✅ OK
POST /api/tasks   Avg: 1200ms ❌ Gargalo! (criar tarefa muito lento)
GET /api/stats    Avg: 32ms   ✅ OK
```

**Capacidade limitada**:

```
10 usuários:  ✅ OK, avg 50ms
50 usuários:  ✅ OK, avg 80ms
100 usuários: ❌ FALHA, avg 5000ms, 30% erros → Limite encontrado
```

## Cleanup

```yaml
- name: Cleanup
  if: always()
  run: docker stop perf-test-app && docker rm perf-test-app
```

Sempre limpa o container, mesmo se teste falhar.

## Resultado

O job performance-test garante que:

- ✅ Aplicação suporta **múltiplos usuários simultâneos**
- ✅ Tempo de resposta permanece **aceitável** sob carga
- ✅ Sistema **não quebra** com 50 usuários
- ✅ **Nenhum gargalo** crítico de performance
- ✅ Throughput adequado (requisições/segundo)
- ✅ **Estabilidade** sob uso real simulado
- ✅ Identificação de **limites de capacidade**

**Resumo**: Enquanto integration-test verifica **se funciona**, performance-test verifica **se aguenta a carga**. Este job previne que a aplicação seja lenta ou instável em produção quando múltiplos usuários acessam simultaneamente, garantindo uma **experiência de usuário adequada** mesmo em horários de pico.

---

# CI/CD Pipeline - Job Deploy-Staging

## Visão Geral

O job **deploy-staging** automatiza o deploy da aplicação para o ambiente de **staging** (pré-produção). Staging é uma réplica do ambiente de produção onde você valida a aplicação em condições reais antes de liberar para usuários finais.

## Configuração do Job

```yaml
deploy-staging:
  name: Deploy to Staging
  runs-on: ubuntu-latest
  needs: [integration-test, performance-test]
  if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
  environment:
    name: staging
    url: https://task-manager-staging.example.com
```

### Dependências e Condições

**Dependências**:

```yaml
needs: [integration-test, performance-test]
```

```
lint → test/security → build → integration-test → performance-test → deploy-staging
```

O deploy só executa se **ambos** os jobs anteriores passarem.

**Condição de Execução**:

```yaml
if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
```

- ✅ **Branch**: Apenas `develop`
- ✅ **Evento**: Apenas `push` (não Pull Requests)
- ✅ **Resultado**: Deploy só acontece em push direto para develop

| Cenário               | Executa?                |
| --------------------- | ----------------------- |
| Push para `develop`   | ✅ SIM                  |
| Push para `main`      | ❌ NÃO (branch errada)  |
| PR para `develop`     | ❌ NÃO (é PR, não push) |
| Push para `feature/x` | ❌ NÃO (branch errada)  |

## GitHub Environment

```yaml
environment:
  name: staging
  url: https://task-manager-staging.example.com
```

**GitHub Environments** permitem:

- ✅ **Protection Rules**: Aprovadores obrigatórios, delay timers
- ✅ **Secrets Específicos**: Variáveis diferentes de produção
- ✅ **Deployment History**: Rastreamento de deploys
- ✅ **URL Clicável**: Acesso rápido ao ambiente deployado

**Configuração**:

- Repository → Settings → Environments → New environment
- Nome: `staging`
- Protection: Required reviewers (opcional)
- Secrets: Keys de staging (não produção)

## Acessando Outputs de Jobs Anteriores

```yaml
echo "Image: ${{ needs.build.outputs.image-tag }}"
```

Acessa o output `image-tag` do job `build`:

```yaml
# Job build
outputs:
  image-tag: ${{ secrets.DOCKERHUB_USERNAME }}/task-manager:sha-${{ github.sha }}
```

**Resultado**:

```
Image: myuser/task-manager:sha-abc123def456
```

Esta é a **mesma imagem Docker** buildada, testada e validada nos jobs anteriores.

## Deploy Step

```yaml
- name: Deploy to staging
  run: |
    echo "Deploying to staging environment..."
    echo "Image: ${{ needs.build.outputs.image-tag }}"
    # Add your staging deployment logic here
```

**Status Atual**: Placeholder - mostra mensagem mas **não faz deploy real**.

## Fluxo de Deploy

```
1. Desenvolve feature em branch feature/nova-funcionalidade
   ↓
2. Merge para develop (via Pull Request aprovado)
   ↓
3. GitHub Actions executa pipeline completo
   ↓
4. Se todos os testes passarem → Deploy automático para STAGING
   ↓
5. QA testa em staging URL
   ↓
6. Se validado → Merge develop → main
   ↓
7. Deploy para PRODUCTION (job deploy-production)
```

## Proteção Contra Código com Bugs

**Merge para develop + Testes OK**:

```
lint ✅ → test ✅ → security ✅ → build ✅
  → integration-test ✅ → performance-test ✅
  → deploy-staging EXECUTA ✅
```

**Merge para develop + Teste falha**:

```
lint ✅ → test ✅ → security ❌ FALHOU
  → build ⏭️ PULADO → integration-test ⏭️ PULADO
  → performance-test ⏭️ PULADO → deploy-staging ⏭️ PULADO
```

**Resultado**: Código com falhas **NÃO chega** ao staging.

## Por que Staging é Importante?

Staging detecta problemas **antes de produção**:

- ✅ Testa em ambiente idêntico a produção
- ✅ Valida integrações com serviços externos
- ✅ QA testa novas features
- ✅ Stakeholders revisam mudanças
- ✅ Verifica migrations de banco de dados
- ✅ Testa configurações específicas do ambiente

## Resultado

O job deploy-staging garante que:

- ✅ Deploy só acontece após **todos os testes** passarem
- ✅ Deploy só ocorre em **branch develop** (não em PRs)
- ✅ Usa a **imagem Docker correta** validada pelos testes
- ✅ Deploy é **rastreável** via GitHub Environments
- ✅ Ambiente de staging fica **isolado** de produção
- ✅ QA pode **validar** antes de liberar para produção
- ✅ Problemas são **detectados cedo** (antes de afetar usuários)

**Resumo**: Este job automatiza o deploy para o ambiente de **pré-produção** sempre que código é mergeado na branch `develop` e passa por todos os testes. Permite validação final em ambiente real antes de liberar para usuários finais, reduzindo significativamente o risco de bugs em produção.

---

# CI/CD Pipeline - Job Deploy-Production

## Visão Geral

O job **deploy-production** realiza o deploy da aplicação para o ambiente de **produção**, onde os **usuários finais** acessam. Este é o **estágio mais crítico** do pipeline, executado apenas em push para a branch `main` após validação completa.

## Configuração do Job

```yaml
deploy-production:
  name: Deploy to Production
  runs-on: ubuntu-latest
  needs: [integration-test, performance-test]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  environment:
    name: production
    url: https://task-manager.example.com
```

### Condição de Execução

```yaml
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

**Diferença vs Staging**:

- Staging: `refs/heads/develop`
- Production: `refs/heads/main`

### Mesmas Dependências, Dupla Validação

```yaml
needs: [integration-test, performance-test]
```

**Fluxo Completo**:

```
lint → test/security → build → integration-test → performance-test
                                                         ↓
                                              ┌──────────┴──────────┐
                                              ↓                     ↓
                                       deploy-staging      deploy-production
                                       (branch=develop)     (branch=main)
```

**Por que rodar testes novamente?**

Quando você faz merge `develop` → `main`:

- Pipeline executa **todos os jobs novamente** na branch `main`
- **Não reutiliza** resultados da branch `develop`
- **Garantia dupla**: Código testado em develop E em main

## GitHub Environment: Production

```yaml
environment:
  name: production
  url: https://task-manager.example.com
```

## Fluxo Completo: Development → Production

```
1. Feature desenvolvida em branch feature/nova-funcionalidade
   ↓
2. PR para develop → Code review → Merge
   ↓
3. Pipeline em develop:
   - Testes executam ✅
   - deploy-staging EXECUTA ✅
   - deploy-production PULADO (branch errada)
   ↓
4. QA testa em staging
   ↓
5. PR: develop → main → Code review → Merge
   ↓
6. Pipeline em main:
   - Testes executam NOVAMENTE ✅
   - deploy-staging PULADO (branch errada)
   - deploy-production AGUARDA APROVAÇÃO ⏸️
   ↓
7. Aprovador verifica:
   - Staging OK? ✅
   - Logs limpos? ✅
   - Métricas boas? ✅
   ↓
8. Aprovação concedida → Deploy para PRODUCTION ✅
   ↓
9. App disponível em https://task-manager.example.com
```

## Deploy Step

```yaml
- name: Deploy to production
  run: |
    echo "Deploying to production environment..."
    echo "Image: ${{ needs.build.outputs.image-tag }}"
    # Add your production deployment logic here
```

**Status Atual**: Placeholder

## Por que Production é Mais Crítico?

### Staging Pode Falhar, Production NÃO Pode

```
Staging deploy falha:
  ├─ Desenvolvedores investigam
  ├─ Fix é desenvolvido
  └─ Re-deploy (sem impacto a usuários) ✅

Production deploy falha:
  ├─ ❌ Usuários afetados IMEDIATAMENTE
  ├─ ❌ Perda de receita
  ├─ ❌ Reputação prejudicada
  └─ 🚨 ROLLBACK IMEDIATO OBRIGATÓRIO
```

### Problemas que Aparecem APENAS em Production

Mesmo com todos os testes passando:

```
✅ Unit tests OK
✅ Integration tests OK
✅ Performance tests OK (50 usuários)
✅ Staging funcionando perfeitamente

❌ Production: 10.000 usuários simultâneos → CRASH!

Causa: Problema de escala não detectado em testes
Solução: Canary deployment + monitoring
```

## Resultado

O job deploy-production garante que:

- ✅ Deploy só acontece em **branch main**
- ✅ Apenas código **validado em staging** chega aqui
- ✅ **Aprovação manual** pode ser exigida (critical!)
- ✅ Usa a **mesma imagem Docker** testada
- ✅ Deploy é **rastreável e auditável**
- ✅ Estratégias de deploy seguro disponíveis (blue-green, canary)
- ✅ **Rollback imediato** em caso de problemas
- ✅ Usuários finais recebem **código de alta qualidade**

**Resumo**: Este é o **passo mais crítico** da pipeline. Deploy para produção só acontece em push para `main`, após todos os testes passarem, e idealmente com aprovação manual. Diferente de staging (ambiente de testes), produção serve **usuários reais com dados reais**, tornando qualquer erro extremamente custoso. Proteções como required reviewers, wait timers, estratégias de deploy gradual (canary, blue-green) e planos de rollback são **essenciais** para minimizar riscos.

---

# CI/CD Pipeline - Job Notify

## Visão Geral

O job **notify** envia notificações sobre o resultado dos deploys. É o **último job** da pipeline e executa **mesmo se os deploys falharem**, garantindo que a equipe sempre seja informada em tempo real.

## Configuração do Job

```yaml
notify:
  name: Notify Deployment
  runs-on: ubuntu-latest
  needs: [deploy-staging, deploy-production]
  if: always() && (needs.deploy-staging.result != 'skipped' || needs.deploy-production.result != 'skipped')
```

### Dependências

```yaml
needs: [deploy-staging, deploy-production]
```

**Fluxo**:

```
deploy-staging  ────┐
                    ├──→ notify
deploy-production ──┘
```

Aguarda ambos os jobs de deploy terminarem (ou serem pulados).

### A Função `always()`

```yaml
if: always() && (...)
```

**Comportamento padrão** (sem `always()`):

```
deploy-staging: ✅ success
deploy-production: ❌ failure
notify: ⏭️ PULADO (dependência falhou)
```

**Com `always()`**:

```
deploy-staging: ✅ success
deploy-production: ❌ failure
notify: ✅ EXECUTA (always força execução)
```

**Motivo**: Você QUER ser notificado **especialmente quando algo falha**!


### Condição de Execução

```yaml
if: always() && (needs.deploy-staging.result != 'skipped' || needs.deploy-production.result != 'skipped')
```

**Lógica**: Executa se **pelo menos um** deploy não foi pulado.

## Steps de Notificação

### Step 1: Notify Success

```yaml
- name: Notify success
  if: needs.deploy-staging.result == 'success' || needs.deploy-production.result == 'success'
  run: |
    echo "Deployment successful!"
    echo "Staging: ${{ needs.deploy-staging.result }}"
    echo "Production: ${{ needs.deploy-production.result }}"
```

**Condição**: Pelo menos um deploy teve **sucesso**.


### Step 2: Notify Failure

```yaml
- name: Notify failure
  if: needs.deploy-staging.result == 'failure' || needs.deploy-production.result == 'failure'
  run: |
    echo "Deployment failed!"
    echo "Staging: ${{ needs.deploy-staging.result }}"
    echo "Production: ${{ needs.deploy-production.result }}"
```

**Condição**: Pelo menos um deploy **falhou**.

## Por que Notificações São Críticas?

### Visibilidade em Tempo Real

**Sem notificações**:

```
18:30 - Deploy para production
18:31 - ❌ Deploy falha (ninguém sabe)
19:00 - Usuário reporta bug
19:15 - Time descobre deploy quebrado
19:20 - Inicia rollback
└─ 50 minutos com app quebrada
```

**Com notificações**:

```
18:30 - Deploy para production
18:31 - ❌ Deploy falha
18:31 - 🚨 Slack: "@channel Production deploy failed!"
18:32 - DevOps vê alerta
18:33 - Inicia rollback
└─ 3 minutos com app quebrada
```

## Resultado

O job notify garante que:

- ✅ Equipe é **sempre informada** sobre deploys
- ✅ Executa **mesmo quando deploy falha** (always)
- ✅ Notifica **sucesso e falha** separadamente
- ✅ Mostra **status de ambos** os ambientes
- ✅ Só executa se **pelo menos um deploy** não foi pulado
- ✅ **Não executa** em Pull Requests (deploys não rodam)
- ✅ Permite **integração** com Slack, Discord, email, Teams
- ✅ **Reação rápida** a problemas em produção

**Resumo**: Este job fecha a pipeline garantindo que a equipe seja notificada sobre o resultado dos deploys. Usando `always()`, ele executa mesmo se os deploys falharem (quando notificações são mais críticas). Atualmente é um placeholder, mas pode ser facilmente integrado com Slack, Discord, email ou qualquer sistema de notificação para alertar a equipe em tempo real, permitindo reação rápida a falhas e visibilidade completa do processo de deploy.
