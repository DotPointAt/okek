const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const bot = new Telegraf(Token);
const CHANNEL_ID = '-1002178908288';
const name_CHANNEL_ID = '@BSSmaker; // Изменено на строку, чтобы сравнивать с именем канала

const ADMIN_ID = ['5942916457', '7165286219'];

bot.command('settings', async (ctx) => {
  if (isAdmin(ctx)) {
    await ctx.setMyCommands([
      {
        command: '/start',
        description: 'Запуск бота'
      },
      {
        command: '/help',
        description: 'Помощь'
      },
    ]);
    ctx.reply("Команды установлены."); a
  } else {
    ctx.reply("У вас нет прав для выполнения этой команды.");
  }
});

let users = {};

fs.readFile('users.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Ошибка при чтении файла:', err);
    return;
  }

  const lines = data.split('\n').filter(line => line.trim() !== "");
  for (const line of lines) {
    const match = line.match(/^(\d+) \((.+)\)$/);
    if (match) {
      const [, userId, username] = match;
      users[userId] = username;
    }
  }
});



function isAdmin(ctx) {
  return ctx.from && ctx.from.id.toString() === ADMIN_ID;
}

bot.use((ctx, next) => {
  if (ctx.chat && ctx.chat.username === BSSMAKER_CHANNEL_ID) {
    return; // Не реагировать на сообщения из канала @onkazakhstan
  }
  next();
});

// Функция для сохранения пользователей в файл
function saveUserToFile() {
  const data = Object.entries(users).map(([id, userInfo]) => {
    const invitedByPart = userInfo.invitedBy ? ` invited by ${userInfo.invitedBy}` : '';
    return `${id} (${userInfo.username}${invitedByPart})`;
  }).join('\n');
  fs.writeFileSync('users.txt', data);
}

// Функция для отправки уведомлений
async function sendNotification() {
  for (let userId in users) {
    try {
      await bot.telegram.sendMessage(userId, Notify, { reply_markup: kbrd });
    } catch (e) {
      console.error(`Failed to send notification to ${userId}. Error: ${e.message}`);
      if (e.code === 403) {
        console.log(`Deleting user ${userId} as they blocked the bot or can't be contacted.`);
        delete users[userId];
        saveUserToFile();
      }
    }
  }
}

let Notify = "";

async function checkSubscription(ctx) {
  try {
    const result = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
    return ['member', 'administrator', 'creator'].includes(result.status);
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

const startMenuKeyboard = Markup.keyboard([
  ['/start']
]).resize();

const mainMenuKeyboard = Markup.keyboard([
  ['Я соглашаюсь✅!']
]).resize();

const adminMenuKeyboard = Markup.keyboard([
  ['Я соглашаюсь✅!', 'Список пользователей']
]).resize();

bot.start(async (ctx) => {
  const commandText = ctx.message.text;
  const referrer = commandText.split('/start ')[1]; // Получаем имя пользователя, который пригласил

  if (referrer && !users[ctx.from.id]) {
    users[ctx.from.id] = {
      username: ctx.from.username,
      invitedBy: referrer
    };
    saveUserToFile();
  }

  if (!(await checkSubscription(ctx))) {
    return ctx.reply(
      'Пожалуйста, подпишитесь на канал @BSSmaker и нажмите на кнопку ниже для проверки!',
      Markup.inlineKeyboard([
        Markup.button.callback('Я подписался!✅', 'check_subscription')
      ])
    );
  }
  if (isAdmin(ctx)) {
    ctx.reply('Добро пожаловать в нашего бота, админ!', adminMenuKeyboard);
    ctx.reply(
      'Выберите одну из множества кнопок:',
      Markup.inlineKeyboard([
        [
          Markup.button.url('Кнопка 1', 'https://www.example1.com'),
          Markup.button.url('Кнопка 2', 'https://www.example2.com'),
        ],
        [
          Markup.button.url('Кнопка 3', 'https://www.example3.com'),
          Markup.button.url('Кнопка 4', 'https://www.example4.com')
        ],
        [Markup.button.url('Кнопка 5', 'https://www.example5.com')],
        // ... Добавьте столько строк кнопок, сколько вам нужно
      ])
    );
  } else {
    ctx.reply('Условия:\n\nВы соглашаетесь тем что мы  можем отобрать у вас баланс/статус\n\nВы соглашаетесь с тем что не будет возврата при покупке.', mainMenuKeyboard);
  }
});

bot.action('check_subscription', async (ctx) => {
  if (await checkSubscription(ctx)) {
    await ctx.answerCbQuery('Спасибо за подписку!');
    await ctx.reply('Перезапустите бота /start', startMenuKeyboard);
  } else {
    await ctx.answerCbQuery('Вы все еще не подписаны!');
  }
});

bot.hears('Создатель', async (ctx) => {
  if (await checkSubscription(ctx)) {
    ctx.reply('Создатель: @OrigNekit');
  }
});

bot.hears('Я соглашаюсь✅!', async (ctx) => {
  if (await checkSubscription(ctx)) {
    // Отправляем клавиатуру для запроса контактной информации
    ctx.reply("Пожалуйста, отправьте ваш номер телефона:", Markup.keyboard([
      Markup.button.contactRequest('Отправить мой номер')
    ]).resize());
  }
});

bot.on('contact', (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.username || "Аноним";
  const phoneNumber = ctx.message.contact.phone_number;

  // Сохраняем данные в файле number.txt
  fs.appendFileSync('number.txt', `${userId} (${userName}): ${phoneNumber}\n`);

  // После сохранения информации, отправляем пользователю благодарность или другое сообщение
  ctx.reply("Спасибо за предоставленную информацию!", mainMenuKeyboard);  // возвращаем основную клавиатуру
});


bot.hears('Старт', async (ctx) => {
  if (await checkSubscription(ctx)) {
    ctx.reply(
      'Ну я хз тут',
    )
  } else {
    bot.start(ctx); // Перенаправляем на /start
  }
});

bot.hears('Список пользователей', async (ctx) => {
  if (await checkSubscription(ctx) && isAdmin(ctx)) {
    const userList = Object.entries(users).map(([id, username]) => `${id} (${username})`).join('\n');
    ctx.reply(`Пользователи:\n${userList}`);
  }
});

bot.command('channel', async (ctx) => {
  if (await checkSubscription(ctx)) {
    ctx.reply(
      'Наш канал!',
      Markup.inlineKeyboard([
        [
          Markup.button.url('Перейти', 'https://t.me/bssmaker'),
        ]
      ])
    )
  }
});

bot.command('say', (ctx) => {
  if (isAdmin(ctx)) {
    const text = ctx.message.text.split('/say')[1];
    if (!text || !text.trim()) {
      return ctx.reply('Пожалуйста, предоставьте текст после команды /say.');
    }
    const inlKeyboard = Markup.inlineKeyboard([
      Markup.button.url('Перейти', 'https://t.me/bssmaker')
    ]);
    ctx.reply(text.trim(), inlKeyboard);
  } else {
    ctx.reply('У вас нет прав на использование этой команды.');
  }
});

bot.help(async (ctx) => {
  if (await checkSubscription(ctx)) {
    ctx.reply('Бот для создания приватных сервер в Brawl Stars!');
  }
});

bot.command('send_notify', async (ctx) => {
  if (isAdmin(ctx)) {
    if (Notify.trim() !== "") {
      sendNotification();
      ctx.reply('Уведомление отправлено!');
    } else {
      ctx.reply('Уведомление пустое. Нечего отправлять.');
    }
  } else {
    ctx.reply('У вас нет прав на выполнение этой команды.');
  }
});

bot.launch();
