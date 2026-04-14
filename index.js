require('dotenv').config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           // サーバーに関する情報
        GatewayIntentBits.GuildMessages,    // メッセージに関する情報
        GatewayIntentBits.MessageContent,   // メッセージの内容を読み取る（重要！）
    ],
});

// Botが起動したときに実行される処理
client.once(Events.ClientReady, (c) => {
});

// メッセージを受け取ったときに実行される処理
client.on(Events.MessageCreate, (message) => {
    // 送信者がBot自身なら無視する（無限ループ防止）
    if (message.author.bot) return;

    // 「!hello」というメッセージが送られたら返信する
    if (message.content === '!hello') {
        message.reply('Hello world!');
    }
});

client.login(process.env.DISCORD_TOKEN);