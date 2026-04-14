require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  Events,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // サーバーに関する情報
    GatewayIntentBits.GuildMessages, // メッセージに関する情報
    GatewayIntentBits.MessageContent, // メッセージの内容を読み取る（重要！）
  ],
});

// Botが起動したときに実行される処理
client.once(Events.ClientReady, () => {
  client.user.setActivity("かにさん", { type: ActivityType.Watching });

  // コマンドを登録する
  client.application.commands.set(
    [
      {
        name: "add",
        description: "Add",
      },
      {
        name: "remove",
        description: "Remove",
      },
      {
        name: "update",
        description: "Update",
      },
      {
        name: "list",
        description: "List",
      },
      {
        name: "help",
        description: "Help",
      },
    ],
    process.env.DISCORD_GUILD_ID,
  );
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
      interaction.reply("Add");
      break;
    case "remove":
      interaction.reply("Remove");
      break;
    case "update":
      interaction.reply("Update");
      break;
    case "list":
      interaction.reply("List");
      break;
    case "help":
      interaction.reply("Help");
      break;
    default:
  }
});

client.login(process.env.DISCORD_TOKEN);
