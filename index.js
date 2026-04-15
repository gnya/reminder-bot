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
const chrono = require("chrono-node");

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

function sendMessage(context, sendFunc, messageArray) {
  sendFunc.bind(context)({
    embeds: [{ color: 0x2ca4e6, description: messageArray.join("\n") }],
  });
}

function sendError(context, sendFunc, messageArray) {
  sendFunc.bind(context)({
    embeds: [{ color: 0xe65011, description: messageArray.join("\n") }],
    ephemeral: true, // エラー時は自分にだけ見えるようにすると親切
  });
}

function add(interaction) {
  const name = interaction.options.getString("name");
  const dateInput = interaction.options.getString("date"); // 文字列として取得
  const parsedDate = chrono.ja.parseDate(dateInput);

  if (!parsedDate) {
    sendError(interaction, interaction.reply, [
      `🚨⠀日付を読み取れませんでした: 「${dateInput}」`,
    ]);

    return;
  }

  const dateTimestamp = parsedDate.getTime();

  // 未来チェック
  if (dateTimestamp <= Date.now()) {
    sendError(interaction, interaction.reply, [
      "🚨⠀過去の日付は登録できません。",
      `⠀⠀⠀解析結果: \`${parsedDate.toLocaleString("ja-JP")}\``,
    ]);
    return;
  }

  const reminders = loadJSON(REMINDERS_JSON_PATH);
  const id = (reminders[reminders.length - 1]?.id || 0) + 1;

  reminders.push({ id: id, name: name, date: dateTimestamp });
  saveJSON(reminders, REMINDERS_JSON_PATH);

  // 表示用にフォーマット
  const formattedDate = parsedDate.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  sendMessage(interaction, interaction.reply, [
    `✅⠀予定を追加しました！`,
    `⠀⠀⠀**内容:** ${name}`,
    `⠀⠀⠀**日時:** \`${formattedDate}\``,
  ]);
  updateActivity(reminders);
}

function remove(interaction) {
  const name = interaction.options.getString("name");
  const id = interaction.options.getNumber("id");

  if ((name == null && id == null) || (name != null && id != null)) {
    sendError(interaction, interaction.reply, [
      "🚨⠀予定の削除に失敗しました:",
      "⠀⠀⠀名前かIDのどちらかを指定してください",
    ]);

    return;
  }

  const reminders = loadJSON(REMINDERS_JSON_PATH);
  const index = reminders.findIndex((r) => r.name === name || r.id === id);

  if (index < 0) {
    sendError(interaction, interaction.reply, [
      "🚨⠀予定の削除に失敗しました:",
      "⠀⠀⠀指定された予定が存在しませんでした",
    ]);

    return;
  }

  reminders.splice(index, 1);

  saveJSON(reminders, REMINDERS_JSON_PATH);

  sendMessage(interaction, interaction.reply, [
    "✅⠀予定を削除しました。",
    `⠀⠀⠀**現在の件数:** ${reminders.length}件`,
  ]);
  updateActivity(reminders);
}

function clear(interaction) {
  saveJSON([], REMINDERS_JSON_PATH);

  sendMessage(interaction, interaction.reply, [
    "✅⠀すべての予定を削除しました。",
  ]);
  updateActivity([]);
}

function list(interaction) {
  const data = loadJSON(REMINDERS_JSON_PATH);

  if (data.length === 0) {
    sendMessage(interaction, interaction.reply, [
      "🪦⠀登録されている予定はありません。",
    ]);
  }

  const listText = data
    .map((r) => {
      const d = new Date(r.date).toLocaleString("ja-JP");
      return `ID: ${r.id} | ${d} | ${r.name}`;
    })
    .join("\n");

  sendMessage(interaction, interaction.reply, [
    "✅⠀現在の予定リスト:",
    `⠀⠀⠀\`\`\`\n${listText}\n\`\`\``,
  ]);
}

function help(interaction) {
  sendMessage(interaction, interaction.reply, [
    "🧭⠀コマンド一覧:",
    "⠀⠀⠀/add, /remove, /clear, /list, /help",
  ]);
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
    const now = Date.now();

    for (const reminder of reminders) {
      const delta = Math.round((reminder.date - now) / (60 * 1000));

      // 既に時刻を過ぎている場合は無視する
      if (delta < 0) {
        continue;
      }

      if (delta === 0) {
        // 時間になったら通知
        sendMessage(channel, channel.send, [
          `🔔 ${reminder.name}: 時間になりました！`,
        ]);
      } else if (delta >= 1440 && delta % 1440 === 0) {
        // 24時間前までは1日おきに通知
        const days = Math.floor(delta / 1440);
        sendMessage(channel, channel.send, [
          `🔔 ${reminder.name}: 残り${days}日です。`,
        ]);
      } else if (delta < 1440 && delta % 720 === 0) {
        // 24時間を切ったら12時間おきに通知
        const hours = Math.floor(delta / 60);
        sendMessage(channel, channel.send, [
          `🔔 ${reminder.name}: 残り${hours}時間です。`,
        ]);
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
