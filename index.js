const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

const xpltIDs = ['52578980', '42197244', '22509952'];
const dgnIDs = ['16896065', '42197244', '9811957'];

client.once('ready', async () => {
    console.log('Val Bot is online.');

    const commands = [
        {
            name: 'groupcheck',
            description: "Check information about a Roblox group",
            options: [
                {
                    name: 'groupid',
                    description: 'The ID of the Roblox group to check',
                    type: 3,
                    required: true,
                },
            ],
        },
    ];

    const guildId = '1136711517958590495';

    try {
        await client.guilds.cache.get(guildId)?.commands.set(commands);
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'groupcheck') {
        const groupId = options.getString('groupid');
        if (!groupId) {
            interaction.reply('Please provide a valid Roblox group ID');
            return;
        }

        const loadingEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setDescription('Fetching group information, please wait...');
        const loadingMsg = await interaction.reply({ embeds: [loadingEmbed] });

        try {
            const response = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}`);

            if (response.status === 200) {
                const groupData = response.data;
                const groupName = groupData.name;
                const memberCount = groupData.memberCount;
                const ownerUserId = groupData.owner.userId;
                const iconUrlResponse = await axios.get(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&size=420x420&format=Png&isCircular=false`);
                const iconUrl = iconUrlResponse.data.data[0].imageUrl;

                if (memberCount > 100000) {
                    const largeGroupEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('This group is too large to check. Please check a smaller group.');
                    await loadingMsg.delete();
                    await interaction.channel?.send({ embeds: [largeGroupEmbed] });
                    return;
                }

                const ownerResponse = await axios.get(`https://users.roblox.com/v1/users/${ownerUserId}`);
                const ownerData = ownerResponse.data;
                const ownerUsername = ownerData.name;

                let nextPageCursor = null;
                let membersData = [];

                do {
                    let url = `https://groups.roblox.com/v1/groups/${groupId}/users?sortOrder=Asc&limit=100`;
                    if (nextPageCursor) {
                        url += `&cursor=${nextPageCursor}`;
                    }

                    try {
                        const membersResponse = await axios.get(url);
                        membersData = membersData.concat(membersResponse.data.data);
                        nextPageCursor = membersResponse.data.nextPageCursor;
                    } catch (error) {
                        console.error(error);
                        const errorEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setDescription('An error occurred while fetching group members. Please try again later.');
                        await loadingMsg.delete();
                        await interaction.channel?.send({ embeds: [errorEmbed] });
                        return;
                    }
                } while (nextPageCursor);

                const xpltUsers = membersData
                    .filter(member => xpltIDs.includes(member.user.userId.toString()))
                    .map(member => member.user);

                const dgnUsers = membersData
                    .filter(member => dgnIDs.includes(member.user.userId.toString()))
                    .map(member => member.user);

                const totalExploitersAndDegens = xpltUsers.length + dgnUsers.length;
                const percentage = (totalExploitersAndDegens / memberCount) * 100;

                const xpltUsernames = xpltUsers.length > 0 ? xpltUsers.map(user => user.username).join('\n') : 'N/A';
                const dgnUsernames = dgnUsers.length > 0 ? dgnUsers.map(user => user.username).join('\n') : 'N/A';

                const botResponse = `
Owned by ${ownerUsername} | ${memberCount} members
The total percentage of members with a DGN or XPLT case is ${percentage.toFixed(1)}%

                    **EXPLOITERS**
                    \`\`\`
${xpltUsernames}
                    \`\`\`
                    **DEGENERATES**
                    \`\`\`
${dgnUsernames}
                    \`\`\`
                    `;

                const responseEmbed = new EmbedBuilder()
                    .setColor('#00A2FF')
                    .setTitle(groupName)
                    .setAuthor({ iconURL: 'https://i.imgur.com/TxIHTud.png', name: 'Clan Lookup' })
                    .setURL(`https://www.roblox.com/groups/${groupId}`)
                    .setDescription(botResponse)
                    .setThumbnail(iconUrl)
                    .addFields(
                        { name: 'XPLT Cases', value: xpltUsers.length.toString(), inline: true },
                        { name: 'DGN Cases', value: dgnUsers.length.toString(), inline: true }
                    )

                await loadingMsg.delete();
                await interaction.channel?.send({ embeds: [responseEmbed] });
            } else if (response.status === 404) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription('The provided group ID is not valid.');
                await loadingMsg.delete();
                await interaction.channel?.send({ embeds: [errorEmbed] });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription('An error occurred while fetching group data. Please try again later.');
                await loadingMsg.delete();
                await interaction.channel?.send({ embeds: [errorEmbed] });
            }
        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('An error occurred while fetching group data. Please try again later.');
            await loadingMsg.delete();
            await interaction.channel?.send({ embeds: [errorEmbed] });
        }
    }
});

client.login('');
