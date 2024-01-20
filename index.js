const { Client, GatewayIntentBits } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const companies = new Map();

const commandData = {
    name: "창업",
    description: "Starts a new investment game",
    options: [
        {
            name: "companyname",
            type: 3,
            description: "Name of the company",
            required: true,
        },
        {
            name: "amount",
            type: 4, // INTEGER type
            description: "Initial investment amount",
            required: true,
        },
    ],
};

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === "창업") {
        const companyName = options.getString("companyname");
        const amount = options.getInteger("amount");

        if (companies.has(interaction.guildId)) {
            interaction.reply("이미 투자 중인 게임이 있습니다.");
            return;
        }

        // 새로운 투자 시작
        companies.set(interaction.guildId, {
            companyName,
            value: amount,
            turns: 0,
        });

        const embed = new EmbedBuilder()
            .setTitle("투자 시작!")
            .setDescription(
                `**${companyName}**에 ${amount}코인을 투자했습니다.`
            );

        const fin = new ButtonBuilder()
            .setCustomId("exitInvestment")
            .setLabel("사업 철수")
            .setStyle("Danger");

        const row = new ActionRowBuilder().addComponents(fin);
        const respond = await interaction.reply({
            embeds: [embed],
            components: [row],
        });

        // 턴 시작
        const startTurn = async () => {
            const company = companies.get(interaction.guildId);

            if (!company) return;

            company.turns++;

            // 유지비
            company.value -= 5;

            // 이벤트
            const eventChance = Math.random() * 100;
            let eventMessage = "";

            if (eventChance < 5) {
                // 파산
                company.value = 0;
                eventMessage = "파산했습니다! 회사 가치가 0이 되었습니다.";
                const earnings = company.value;
                companies.delete(interaction.guildId);

                const embed = new EmbedBuilder()
                    .setTitle("사업 파산!")
                    .setDescription(
                        `**${company.companyName}**에서 ${earnings}코인을 얻었습니다.`
                    );

                await interaction.editReply({
                    embeds: [embed],
                });
            } else if (eventChance < 25) {
                // 손해
                const lossPercentage = Math.floor(
                    Math.random() * (30 - 10 + 1) + 10
                );
                const lossAmount = Math.floor(
                    (company.value * lossPercentage) / 100
                );
                company.value -= lossAmount;
                eventMessage = `손해를 봤습니다! 회사 가치가 ${lossPercentage}% 감소했습니다.`;
            } else if (eventChance < 30) {
                // 무난한 순항
                eventMessage =
                    "무난한 순항입니다. 회사 가치가 변동이 없습니다.";
            } else if (eventChance < 50) {
                // 좋은 일
                const gainPercentage = Math.floor(
                    Math.random() * (30 - 10 + 1) + 10
                );
                const gainAmount = Math.floor(
                    (company.value * gainPercentage) / 100
                );
                company.value += gainAmount;
                eventMessage = `좋은 일이 생겼습니다! 회사 가치가 ${gainPercentage}% 증가했습니다.`;
            } else if (eventChance < 99.9) {
                // 대박
                const jackpotMultiplier = Math.floor(
                    Math.random() * (200 - 100 + 1) + 100
                );
                const jackpotAmount = Math.floor(
                    (company.value * jackpotMultiplier) / 100
                );
                company.value += jackpotAmount;
                eventMessage = `대박이야! 회사 가치가 ${jackpotMultiplier}% 증가했습니다.`;
            } else {
                // 초대박
                const megaJackpotMultiplier = 500;
                const megaJackpotAmount = Math.floor(
                    (company.value * megaJackpotMultiplier) / 100
                );
                company.value += megaJackpotAmount;
                eventMessage = `초대박이야! 회사 가치가 ${megaJackpotMultiplier}% 증가했습니다.`;
            }

            const embed = new EmbedBuilder()
                .setTitle(`턴 ${company.turns}`)
                .setDescription(
                    `${eventMessage}\n유지비로 5코인이 차감되었습니다.\n현재 가치: ${company.value}코인`
                );

            const fin = new ButtonBuilder()
                .setCustomId("exitInvestment")
                .setLabel("사업 철수")
                .setStyle("Danger");

            const row = new ActionRowBuilder().addComponents(fin);
            const respond = await interaction.editReply({
                embeds: [embed],
                components: [row],
            });
            const collectorFilter = (i) => i.user.id === interaction.user.id;

            try {
                const confirmation = await respond.awaitMessageComponent({
                    filter: collectorFilter,
                    time: 10_000,
                });

                if (confirmation.customId === "exitInvestment") {
                    const earnings = company.value;
                    companies.delete(interaction.guildId);

                    const embed = new EmbedBuilder()
                        .setTitle("사업 철수!")
                        .setDescription(
                            `**${company.companyName}**에서 ${earnings}코인을 얻었습니다.`
                        );
                    const fin = new ButtonBuilder()
                        .setCustomId("exitInvestment")
                        .setLabel("사업 철수")
                        .setStyle("Danger")
                        .setDisabled(true);

                    const row = new ActionRowBuilder().addComponents(fin);

                    await interaction.editReply({
                        embeds: [embed],
                        components: [row],
                    });
                    await confirmation.update({
                        components: [],
                    });
                }
            } catch (e) {
                setTimeout(
                    () => startTurn(interaction.guildId, interaction.channelId),
                    0
                );
            }
        };

        startTurn();
    }
});

client.once("ready", async () => {
    try {
        console.log(`Logged in as ${client.user.tag}`);

        console.log("Started refreshing application (/) commands.");

        // Register the slash command
        const commands = await client.guilds.cache
            .get("1197357350508580924")
            ?.commands.set([commandData]);
        console.log(
            "Successfully registered application (/) commands:",
            commands
        );
    } catch (error) {
        console.error("Error registering application (/) commands:", error);
    }
});

client.login(
    "token"
);
