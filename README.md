# Backend FutPlan

API desenvolvida em Flask para o gerenciamento do sistema FutPlan. O sistema gerencia autenticação, usuários, times, locais e partidas.

## 🚀 Tecnologias

*   **Python 3**
*   **Flask** (Framework Web)
*   **MySQL** (Banco de Dados)
*   **Flask-CORS** (Gerenciamento de CORS)
*   **Dotenv** (Gerenciamento de variáveis de ambiente)

## ⚙️ Pré-requisitos

*   Python 3.8 ou superior
*   MySQL Server instalado e rodando
*   Gerenciador de pacotes `pip`

## 🔧 Instalação e Configuração

1.  **Clone o repositório** (se ainda não o fez):
    ```bash
    git clone <url-do-repositorio>
    cd backend_futPlan
    ```

2.  **Crie um ambiente virtual (recomendado):**
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # Linux/Mac
    source venv/bin/activate
    ```

3.  **Instale as dependências:**
    ```bash
    pip install flask flask-cors python-dotenv mysql-connector-python
    # Se tiver um requirements.txt:
    # pip install -r requirements.txt
    ```

4.  **Configuração de Ambiente (.env):**
    Crie um arquivo chamado `.env` na raiz do projeto e defina as seguintes variáveis obrigatórias (baseado no `config.py`):

    ```env
    DB_PASSWORD=sua_senha_do_mysql
    JWT_SECRET_KEY=sua_chave_secreta_jwt
    ```

    > **Nota:** O sistema espera que o banco de dados se chame `futPlan` e o usuário seja `root` no `localhost`.

## ▶️ Executando o Projeto

Para iniciar o servidor de desenvolvimento:

```bash
python main.py
```

O servidor iniciará em `http://0.0.0.0:5000`.

## 📍 Endpoints (Blueprints)

O projeto está estruturado com os seguintes módulos de rotas:

*   `/auth` - Autenticação
*   `/users` - Gerenciamento de Usuários
*   `/times` - Gerenciamento de Times
*   `/locais` - Gerenciamento de Locais/Campos
*   `/partidas` - Gerenciamento de Partidas

## 🛡️ CORS

O projeto já está configurado para aceitar requisições das seguintes origens:
*   `http://localhost:8080`
