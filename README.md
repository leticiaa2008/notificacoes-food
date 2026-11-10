1. Criar o .env.example
No terminal, dentro de C:\Users\Aluno\Desktop\food-fotos-main, execute:
notepad .env.example


Cole este conteúdo:
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA


Salve e feche. Esse arquivo contém apenas exemplos, não suas credenciais reais.
2. Proteger o .env no .gitignore
Execute:
notepad .gitignore


Confira se estas linhas existem. Se não existirem, adicione-as:
# Variáveis de ambiente
.env
.env.*
!.env.example

# Dependências e arquivos gerados
node_modules/
dist/


Salve o arquivo. Isso impede que o .env local seja incluído normalmente nos próximos commits.
3. Atualizar o README.md
Execute:
notepad README.md


Adicione estas instruções ao arquivo, preservando o conteúdo que já existe:
## Como executar o projeto

### Requisitos
- Node.js e npm instalados.
- Projeto criado no Supabase.

### Instalação

Na pasta raiz do projeto, execute:

```bash
npm install
```

### Configuração do Supabase

1. Copie o arquivo `.env.example`.
2. Crie um arquivo chamado `.env` na raiz, ao lado do `package.json`.
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os dados do seu projeto Supabase.
4. No Supabase Storage, configure o bucket `fotos-camera` e as políticas de acesso necessárias.

Não utilize a chave `service_role` no frontend. As variáveis com prefixo `VITE_` ficam acessíveis no aplicativo compilado; as permissões devem ser controladas pelas políticas do Supabase.

### Executar em desenvolvimento

```bash
npm run dev
```

### Gerar a versão de produção

```bash
npm run build
```

### Sincronizar com Android

```bash
npx cap sync android
npx cap open android
```

### Segurança das variáveis

O arquivo `.env` contém configurações locais e não deve ser enviado ao GitHub. O arquivo `.env.example` deve conter somente nomes das variáveis e valores demonstrativos.

Para builds pelo GitHub Actions, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em **Settings → Secrets and variables → Actions** e disponibilize os secrets durante a etapa de build.


Salve e feche.
4. Confira se o .env não será enviado
Execute:
git status


Se .env aparecer como arquivo rastreado ou preparado para commit, não faça o push ainda. Se ele já tiver sido adicionado ao controle de versão, o .gitignore sozinho não o remove do Git.
5. Envie as alterações ao GitHub
Como você teve um problema anterior com git pull --rebase, primeiro confira o estado atual:
git status


Se não houver conflitos, adicione somente os arquivos que devem ser enviados:
git add README.md .env.example .gitignore
git commit -m "Adiciona instrucoes de execucao e exemplo de ambiente"
git push origin main


Importante: não use git add . antes de confirmar que o .env está protegido e não está sendo rastreado. E lembre-se: a chave pública do Supabase não substitui as políticas de segurança do banco e do Storage.
