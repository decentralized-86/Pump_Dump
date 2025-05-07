const { Telegraf } = require("telegraf");
const { BOT_TOKEN, WEBAPP_URL } = require("../config");
const PumpUser = require("../models/PumpUser");
const { generateJwtToken } = require("../utils/gen");
const { configs } = require("../utils/val");
const logger = require("../services/logger");
const PumpProject = require("../models/PumpProject");

const baseBotLink = "https://t.me/PumpshiePumpBot";

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN must be provided!");
}
if (!WEBAPP_URL) {
  throw new Error("WEBAPP_URL must be provided!");
}

const bot = new Telegraf(BOT_TOKEN);

bot.command("help", (ctx) => {
  ctx.reply(
    "Available commands:\n" +
      "/start - Open the Mini App\n" +
      "/help - Show this help message\n"
  );
});

bot.command("start", async (ctx) => {
  const project = await PumpProject.aggregate([
    {
      $limit: 1,
    },
  ]).exec();
  if (project.length === 0) {
    const np = new PumpProject({
      projectId: "global123123",
      ownerId: "",
      name: "global",
      score: 0,
      walletAddress: "12312312312",
    });
    await np.save();
  }
  let user = await PumpUser.findOne({
    tgId: ctx.from.id,
  }).exec();
  if (!user) {
    let firstname = "";
    let lastname = "";

    if (ctx.from.first_name) {
      firstname = ctx.from.first_name;
    }
    if (ctx.from.last_name) {
      lastname = ctx.from.last_name;
    }

    const userProfilePhotos = await ctx.telegram.getUserProfilePhotos(
      ctx.from.id,
      0,
      1
    );
    console.log("User Profile Photos:", userProfilePhotos);

    let avatarUrl = "https://www.gravatar.com/avatar";
    if (
      userProfilePhotos.total_count > 0 &&
      userProfilePhotos.photos[0] &&
      userProfilePhotos.photos[0][0]
    ) {
      const fileId = userProfilePhotos.photos[0][0].file_id;
      const file = await ctx.telegram.getFile(fileId);

      console.log("File Response:", file); // Log the file response
      if (file && file.file_path) {
        avatarUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
      }
    }

    let inviterId;
    const message = ctx.message?.text || ""; // Full /start message
    const args = message.split(" "); // Split the command and the token
    if (args.length > 1) {
      inviterId = args[1]; // Extract the token
      const inviter = await PumpUser.findOne({
        tgId: inviterId,
      }).exec();
      if (!inviter) {
        inviterId = undefined;
      } else {
        inviter.balance += configs.inviteBalance;
        inviter.invitees.push(ctx.from.id);
        await inviter.save();
      }
    }

    const newUser = new PumpUser({
      tgId: ctx.from.id,
      userId: ctx.from.username || ctx.from.id,
      name: `${firstname} ${lastname}`,
      balance: inviterId ? configs.inviteBalance : 0,
      maxScore: 0,
      maxTime: 0,
      avatar: avatarUrl,
      inviteLink: `${baseBotLink}?start=${ctx.from.id}`,
      lastLoginAt: new Date(),
      lastDailyReward: 0,
      inviterId,
      walletAddress: "WalletAddress",
    });
    await newUser.save();
    user = newUser;
  }
  const token = generateJwtToken({
    tgId: user.tgId,
    userId: user.userId,
    inviteLink: user.inviteLink,
    inviterId: user.inviterId,
    avatar: user.avatar,
    name: user.name,
    inviteBalance: configs.inviteBalance,
  });

  logger.info(token);

  ctx.reply(
    "Welcome to Pumpshie Pumps! 🚀\nUse /help to see available commands.\nClick Open App to play.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Open App - Pumpshine Pumps!!!",
              web_app: {
                url: `${WEBAPP_URL}?token=${token}` || "",
              },
            },
          ],
        ],
      },
    }
  );
});

module.exports = bot;
