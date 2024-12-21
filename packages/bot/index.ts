import { Telegraf } from 'telegraf';
import config from './config'; 
import { fetchDataFromContract } from '../../temp/src/index'; 


if (!config.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be provided!');
}

const bot = new Telegraf(config.BOT_TOKEN);

// Basic commands
bot.command('start', (ctx: any) => {
  ctx.reply('Welcome to StarBeam! 🚀\nUse /help to see available commands.');
});

bot.command('help', (ctx: any) => {
  ctx.reply(
    'Available commands:\n' +
    '/start - Start the bot\n' +
    '/help - Show this help message\n' +
    '/webapp - Open the Mini App'
  );
});

bot.command('webapp', (ctx: any) => {
    ctx.reply('Open Web App', {
      reply_markup: {
        inline_keyboard: [[
          { text: "Open App", url: config.WEBAPP_URL || '' }
        ]]
      }
    });
  });

bot.command('fetch', async (ctx: any) => {
    try {
        const contractId = "CBGHASHQZIWWTJFWQOPEG5GXEJYV3XLQEQHDR4ABHZXUM5OYSS65U5T4"; // Example contract ID
        const data = await fetchDataFromContract(contractId);
        ctx.reply(`Fetched data: ${JSON.stringify(data)}`);
    } catch (error: any) { // Explicitly typing error as any
        ctx.reply(`Error fetching data: ${error.message}`);
    }
});

bot.launch();
console.log('Bot is running...');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));