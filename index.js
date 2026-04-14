require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  Events,
  ApplicationCommandOptionType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const JSON_PATH = path.join(__dirname, "reminders.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // サーバーに関する情報
    GatewayIntentBits.GuildMessages, // メッセージに関する情報
    GatewayIntentBits.MessageContent, // メッセージの内容を読み取る
  ],
});

// JSONファイルを読み込む関数
function loadReminders() {
  try {
    const data = fs.readFileSync(JSON_PATH, "utf8");
    console.log(`${data} を読み込みました。`);
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// JSONファイルに保存する関数
function saveReminders(reminders) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(reminders, null, 2));
  // 変数名を reminders に修正
  console.log(`${JSON.stringify(reminders)} を登録しました。`);
}

// アクティビティの表示を更新する関数
function updateActivity(currentData) {
  client.user.setActivity(`${currentData.length}件の予定をリマインド中`, {
    type: ActivityType.Watching,
  });
}

function add(interaction) {
  const currentData = loadReminders();
  const newEntry = {
    id: Date.now(),
    content: "追加テスト", // 本来は interaction.options から取得します
    time: new Date().toLocaleString(),
  };

  currentData.push(newEntry);
  saveReminders(currentData);

  interaction.reply(
    `データを追加しました。現在の件数: ${currentData.length}件`,
  );

  updateActivity(currentData);
}

function remove(interaction) {
  updateActivity(currentData);
}

function list(interaction) {
  const data = loadReminders();
  // 配列が空の場合のケア
  if (data.length === 0) {
    return interaction.reply("登録されているリマインドはありません。");
  }
  interaction.reply(
    `現在のリスト:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``,
  );
}

function help(interaction) {
  interaction.reply("コマンド一覧: /add, /list, /remove, /update");
}

// Botが起動したときに実行される処理
client.once(Events.ClientReady, async () => {
  const channelId = process.env.TARGET_CHANNEL_ID;

  if (!channelId) {
    console.error("エラー: TARGET_CHANNEL_ID が設定されていません。");
    return;
  }

  try {
    // チャンネルIDからチャンネルを取得
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error(
        "エラー: 指定されたチャンネルが見つかりません。Botがそのチャンネルを見る権限があるか確認してください。",
      );
      return;
    }
  } catch (error) {
    console.error("起動時にエラーが発生しました:", error);
  }

  // コマンドを登録する
  client.application.commands.set(
    [
      {
        name: "add",
        description: "予定を追加します",
        options: [
          {
            name: "name",
            description: "予定の名前",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: "date",
            description: "予定の日付",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
      {
        name: "remove",
        description: "予定を削除します",
        options: [
          {
            name: "name",
            description: "予定の名前",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
      {
        name: "update",
        description: "予定を更新します",
      },
      {
        name: "list",
        description: "予定の一覧を表示します",
      },
      {
        name: "help",
        description: "このBotのヘルプを表示します",
      },
    ],
    process.env.DISCORD_GUILD_ID,
  );

  updateActivity(loadReminders());
});

// コマンドを受け取ったときに実行される処理
client.on(Events.InteractionCreate, (interaction) => {
  // コマンドではないなら無視する
  if (!interaction.isCommand()) {
    return;
  }

  // コマンドが送られてきたら返信する
  switch (interaction.commandName) {
    case "add":
      add(interaction);
      break;
    case "remove":
      remove(interaction);
      break;
    case "update":
      update(interaction);
      break;
    case "list":
      list(interaction);
      break;
    case "help":
      help(interaction);
      break;
    default:
  }
});

client.login(process.env.DISCORD_TOKEN);
