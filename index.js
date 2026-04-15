require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  Events,
  ApplicationCommandOptionType,
} = require("discord.js");
const fs = require("fs");
const { type } = require("os");
const path = require("path");
const cron = require("node-cron");

const COMMANDS_JSON_PATH = path.join(__dirname, "commands.json");
const REMINDERS_JSON_PATH = path.join(__dirname, "reminders.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // サーバーに関する情報
    GatewayIntentBits.GuildMessages, // メッセージに関する情報
    GatewayIntentBits.MessageContent, // メッセージの内容を読み取る
  ],
});

// JSONファイルを読み込む関数
function loadJSON(filepath) {
  try {
    const text = fs.readFileSync(filepath, "utf8");

    return JSON.parse(text);
  } catch (err) {
    console.error("JSONファイルの読み込みに失敗しました:", err);

    return [];
  }
}

// JSONファイルを書き出す関数
function saveJSON(data, filepath) {
  try {
    const text = JSON.stringify(data, null, 2);

    fs.writeFileSync(filepath, text);
  } catch (err) {
    console.error("JSONファイルの書き出しに失敗しました:", err);
  }
}

// アクティビティの表示を更新する関数
function updateActivity(reminders) {
  client.user.setActivity(`${reminders.length}件の予定をリマインド中`, {
    type: ActivityType.Watching,
  });
}

function add(interaction) {
  const name = interaction.options.getString("name");
  const date = Date.parse(interaction.options.getString("date"));

  if (isNaN(date)) {
    interaction.reply("予定の追加に失敗しました: 入力された日付が無効です");

    return;
  } else if (date <= Date.now()) {
    interaction.reply("予定の追加に失敗しました: 未来の日付を入力してください");

    return;
  }

  const reminders = loadJSON(REMINDERS_JSON_PATH);
  const id = (reminders[reminders.length - 1]?.id || 0) + 1;

  reminders.push({ id: id, name: name, date: date });

  saveJSON(reminders, REMINDERS_JSON_PATH);

  interaction.reply(`予定を追加しました。現在の件数: ${reminders.length}件`);
  updateActivity(reminders);
}

function remove(interaction) {
  const name = interaction.options.getString("name");
  const id = interaction.options.getNumber("id");

  if ((name == null && id == null) || (name != null && id != null)) {
    interaction.reply(
      "予定の削除に失敗しました: 名前かIDのどちらかを指定してください",
    );

    return;
  }

  const reminders = loadJSON(REMINDERS_JSON_PATH);
  const index = reminders.findIndex((r) => r.name === name || r.id === id);

  if (index < 0) {
    interaction.reply(
      "予定の削除に失敗しました: 指定された予定が存在しませんでした",
    );

    return;
  }

  reminders.splice(index, 1);

  saveJSON(reminders, REMINDERS_JSON_PATH);

  interaction.reply(`予定を削除しました。現在の件数: ${reminders.length}件`);
  updateActivity(reminders);
}

function clear(interaction) {
  saveJSON([], REMINDERS_JSON_PATH);

  interaction.reply("すべての予定を削除しました。");
  updateActivity([]);
}

function update(interaction) {
  // TODO 実装予定
}

function list(interaction) {
  const data = loadJSON(REMINDERS_JSON_PATH);

  if (data.length === 0) {
    interaction.reply("登録されている予定はありません。");
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
  // 必要な環境変数の存在確認をする
  for (const prop of ["DISCORD_GUILD_ID", "TARGET_CHANNEL_ID"]) {
    if (!(prop in process.env)) {
      console.error(`環境変数 ${prop} が設定されていません。`);

      return;
    }
  }

  // コマンドを登録する
  await client.application.commands.set(
    loadJSON(COMMANDS_JSON_PATH),
    process.env.DISCORD_GUILD_ID,
  );

  // サーバーアクティビティを更新する
  updateActivity(loadJSON(REMINDERS_JSON_PATH));

  // チャンネルIDからチャンネルを取得
  const channel = await client.channels.fetch(process.env.TARGET_CHANNEL_ID);

  if (!channel) {
    console.error(
      "エラー: 指定されたチャンネルが見つかりません。Botがそのチャンネルを見る権限があるか確認してください。",
    );

    return;
  }

  // 1分ごとにコールバックを実行する
  cron.schedule("* * * * *", () => {
    const reminders = loadJSON(REMINDERS_JSON_PATH);
    const now = new Date();

    // TODO 24時間前までは1日おきに通知
    // TODO 24時間を切ったら12時間おきに通知
    for (reminder of reminders) {
      const delta = Math.round((reminder.date - now.getTime()) / (60 * 1000));

      console.log(`test: ${reminder.name} ${delta}`);

      // 既に時刻を過ぎている場合は無視する
      if (delta < 0) {
        return;
      }

      // ひとまず10分刻みで通知するようにする
      if (delta === 0) {
        channel.send(`${reminder.name}: 時間になりました！`);
      } else if (delta % 10 === 0) {
        channel.send(`${reminder.name}: 残り${delta}分です。`);
      }
    }
  });
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
    case "clear":
      clear(interaction);
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
