const express = require ('express');
const bodyParser = require ('body-parser');
const path = require ('path');
const { Sequelize, DataTypes } = require('sequelize'); 
const app = express ();

// Configuração do Sequelize para conectar ao banco de dados MySQL
const sequelize = new Sequelize('yuri_tarefas', 'root', 'admin', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false, // Desativa logs de SQL no console
});

// Teste de conexão com o banco de dados
sequelize.authenticate()
  .then(() => console.log('Conexão com o banco de dados bem-sucedida!'))
  .catch(err => console.error('Erro ao conectar ao banco de dados:', err));

  const Usuario = sequelize.define('Usuario', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    senha: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });
  
  // Sincronizar o modelo com o banco de dados
sequelize.sync()
  .then(() => console.log('Tabela de usuários sincronizada com o banco de dados.'))
  .catch(err => console.error('Erro ao sincronizar tabela:', err));

  const Tarefa = sequelize.define('Tarefa', {
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'todo', // Status padrão: "A Fazer"
    },
  });
  
  // Sincronizar o modelo com o banco de dados
sequelize.sync()
  .then(() => console.log('Tabela de tarefas sincronizada com o banco de dados.'))
  .catch(err => console.error('Erro ao sincronizar tabela de tarefas:', err));

app.use(bodyParser.json()); // Adiciona suporte para JSON
app.use(bodyParser.urlencoded({ extended: true })); // Suporte para dados de formulário

app.get('/usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'usuarios.html'));
}); 

app.get('/gerenciar', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'gerenciar.html'));
});

app.get('/cadastro', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'cadastro.html'));
});

app.post('/cadastro', async (req, res) => {
  const { email, senha } = req.body;
  console.log('Dados recebidos:', email, senha);

  try {
    // Criar um novo usuário no banco de dados
    await Usuario.create({ email, senha });

    // Redirecionar para a página principal com uma mensagem de sucesso
    res.redirect('/?mensagem=Usuario%20cadastrado%20com%20sucesso');
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.send('Erro ao cadastrar usuário. Verifique se o email já está em uso.');
  }
});

app.post('/gerenciar', async (req, res) => {
  const { email, senha } = req.body;

  try {
    // Verificar se o email e a senha existem no banco de dados
    const usuario = await Usuario.findOne({ where: { email, senha: senha} });

    if (usuario) {
      // Redirecionar para a página gerenciar.html
      res.sendFile(path.join(__dirname, 'views', 'gerenciar.html'));
    } else {
      res.send('Credenciais inválidas. Tente novamente.');
    }
  } catch (err) {
    console.error('Erro ao verificar credenciais:', err);
    res.status(500).send('Erro no servidor. Tente novamente mais tarde.');
  }
});

app.post('/adicionar-tarefa', async (req, res) => {
  const { taskName, taskStatus } = req.body;

  try {
    const tarefa = await Tarefa.create({ nome: taskName, status: taskStatus });
    res.status(201).json(tarefa); // Retorna a tarefa criada como JSON
  } catch (err) {
    console.error('Erro ao adicionar tarefa:', err);
    res.status(500).send('Erro ao adicionar tarefa.');
  }
});

app.get('/', (req, res) => {
  const mensagem = req.query.mensagem; // Captura a mensagem da URL
  res.send(`
    <div>
      ${mensagem ? `<p style="color: green;">${mensagem}</p>` : ''}
      <button><a href="/usuarios">Fazer login</a></button>
      <button><a href="/cadastro">Cadastrar</a></button>
    </div>
    <script>
      // Remove a mensagem após 3 segundos, se ela existir
      ${mensagem ? `
        setTimeout(() => {
          const mensagemEl = document.querySelector('p');
          if (mensagemEl) mensagemEl.remove();

          // Remove o parâmetro "mensagem" da URL sem recarregar a página
          const url = new URL(window.location.href);
          url.searchParams.delete('mensagem');
          window.history.replaceState({}, document.title, url.toString());
        }, 3000);
      ` : ''}
    </script>
  `);
});

app.get('/gerenciar', async (req, res) => {
  try {
    const tarefas = await Tarefa.findAll(); // Buscar todas as tarefas
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gerenciamento de Lista de Tarefas</title>
      </head>
      <body>
        <div>
          <form action="/adicionar-tarefa" method="post">
            <input type="text" name="taskName" placeholder="Nome da tarefa" required>
            <select name="taskStatus">
              <option value="todo">A Fazer</option>
              <option value="doing">Fazendo</option>
              <option value="done">Feito</option>
            </select>
            <button type="submit">Adicionar Tarefa</button>
          </form>
          <div id="todo">
            <h2>A Fazer</h2>
            ${tarefas
              .filter(tarefa => tarefa.status === 'todo')
              .map(tarefa => `<p>${tarefa.nome}</p>`)
              .join('')}
          </div>
          <div id="doing">
            <h2>Fazendo</h2>
            ${tarefas
              .filter(tarefa => tarefa.status === 'doing')
              .map(tarefa => `<p>${tarefa.nome}</p>`)
              .join('')}
          </div>
          <div id="done">
            <h2>Feito</h2>
            ${tarefas
              .filter(tarefa => tarefa.status === 'done')
              .map(tarefa => `<p>${tarefa.nome}</p>`)
              .join('')}
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Erro ao buscar tarefas:', err);
    res.status(500).send('Erro ao carregar tarefas.');
  }
});

// Rota API para buscar o resumo das tarefas
app.get('/api/tarefas', async (req, res) => {
  try {
    const tarefas = await Tarefa.findAll(); // Buscar todas as tarefas do banco de dados
    res.json(tarefas); // Retorna as tarefas como JSON
  } catch (err) {
    console.error('Erro ao buscar tarefas:', err);
    res.status(500).send('Erro ao carregar tarefas.');
  }
});
// Rota para renderizar o arquivo HTML
app.get('/tarefas', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'tarefas.html'));
});

app.listen(3000, () => console.log('Servidor rodando na porta 3000'));
