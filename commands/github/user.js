const { github_token } = require('../../config.json');
const { Octokit } = require("octokit");
const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, ButtonBuilder } = require('discord.js');
const { fetch } = require('node-fetch');

const octokit = new Octokit({ auth: github_token, request: { fetch } });


module.exports = {
    data: new SlashCommandBuilder()
        .setName('ghuser')
        .setDescription('Provides information about a user.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Info about the user')
                .addStringOption(option => option.setName('username').setDescription('The username').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('repos')
                .setDescription('Get a list of public repos for a user')
                .addStringOption(option => option.setName('username').setDescription('The username').setRequired(true))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const username = interaction.options.getString('username');

        if (subcommand === 'info') {
            const request = await octokit.request('GET /users/{username}', {
                username: username,
            });
            const data = request.data;

            const main_embed = {
                color: 0x0099ff,
                title: data.name,
                url: data.html_url,
                thumbnail: {
                    url: data.avatar_url,
                },
                fields: [],
            };

            if (data.bio) {
                main_embed.fields.push({
                    name: 'Bio',
                    value: data.bio,
                });
            }

            if (data.created_at) {
                const date = data.created_at.toString();
                main_embed.fields.push({
                    name: 'Created at',
                    value: date,
                });
            }

            if (data.location) {
                main_embed.fields.push({
                    name: 'Location',
                    value: data.location,
                });
            }

            if (data.company) {
                main_embed.fields.push({
                    name: 'Company',
                    value: data.company,
                });
            }

            const selectMenu = new StringSelectMenuBuilder({
                custom_id: 'select_menu',
                placeholder: 'Select an option',
                min_values: 1,
                max_values: 1,
                options: [
                    { label: 'Main', description: 'Main menu', value: 'main' },
                    { label: 'Statistics', description: 'View top contributers', value: 'stats' },
                    { label: 'Socials', description: 'User\'s socials', value: 'socials' },
                ]
            });

            const actionRow = new ActionRowBuilder().addComponents(selectMenu);

            const reply = await interaction.reply({ embeds: [main_embed], components: [actionRow] });

            const collector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'select_menu') {
                    const selectedValue = interaction.values[0];

                    if (selectedValue === 'main') {
                        await interaction.update({ embeds: [main_embed], components: [actionRow] });
                    }
                    if (selectedValue === 'stats') {
                        const stats_embed = {
                            color: 0x0099ff,
                            title: data.name,
                            url: data.html_url,
                            thumbnail: {
                                url: data.avatar_url,
                            },
                            fields: [
                                {
                                    name: 'Public repos',
                                    value: data.public_repos.toString(),
                                },
                                {
                                    name: 'Public gists',
                                    value: data.public_gists.toString(),
                                },
                                {
                                    name: 'Followers',
                                    value: data.followers.toString(),
                                },
                                {
                                    name: 'Following',
                                    value: data.following.toString(),
                                },
                            ],
                        };

                        const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                        await interaction.update({ embeds: [stats_embed], components: [newActionRow] });
                    }
                    if (selectedValue === 'socials') {
                        const socials_embed = {
                            color: 0x0099ff,
                            title: data.name,
                            url: data.html_url,
                            thumbnail: {
                                url: data.avatar_url,
                            },
                            fields: [],
                        };

                        if (data.twitter_username) {
                            socials_embed.fields.push({
                                name: 'Twitter',
                                value: data.twitter_username,
                            });
                        }

                        if (data.blog) {
                            socials_embed.fields.push({
                                name: 'Blog',
                                value: data.blog,
                            });
                        }

                        if (data.email) {
                            socials_embed.fields.push({
                                name: 'Email',
                                value: data.email,
                            });
                        }

                        if (data.hireable) {
                            socials_embed.fields.push({
                                name: 'Hireable',
                                value: data.hireable.toString(),
                            });
                        }

                        const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                        await interaction.update({ embeds: [socials_embed], components: [newActionRow] });
                    }
                }
            });

            collector.on('end', () => {
                actionRow.components.forEach((component) => component.setDisabled(true));
                reply.edit({ components: [actionRow] });
            });
        }
        if (subcommand === 'repos') {
            const request = await octokit.request('GET /users/{username}/repos', {
                username: username,
            });
            const data = request.data;

            const pageSize = 10;
            const pages = [];
            for (let i = 0; i < data.length; i += pageSize) {
                pages.push(data.slice(i, i + pageSize));
            }

            let currentPage = 0;

            const updateReposEmbed = async (pageIndex) => {
                const reposData = pages[pageIndex];
                const repos_embed = {
                    color: 0x0099ff,
                    title: 'Repositories',
                    url: "https://github.com/" + username + "?tab=repositories",
                    fields: [],
                };

                reposData.forEach((repo) => {
                    repos_embed.fields.push(
                        {
                            name: repo.name,
                            value: `[Repository](${repo.html_url})`,
                        },
                    );
                });

                const actionRow = getActionRow(currentPage);
                await interaction.editReply({ embeds: [repos_embed], components: [ actionRow] });
            };

            const getActionRow = (pageIndex) => {
                const previousButton = new ButtonBuilder()
                    .setCustomId(`previous_${pageIndex}`)
                    .setLabel('Previous')
                    .setStyle('Primary')
                    .setDisabled(pageIndex === 0);

                const nextButton = new ButtonBuilder()
                    .setCustomId(`next_${pageIndex}`)
                    .setLabel('Next')
                    .setStyle('Primary')
                    .setDisabled(pageIndex === pages.length - 1);

                return new ActionRowBuilder().addComponents([previousButton, nextButton]);
            };

            const reposData = pages[0];
            const repos_embed = {
                color: 0x0099ff,
                title: 'Repositories',
                url: "https://github.com/" + username + "?tab=repositories",
                fields: [],
            };

            reposData.forEach((repo) => {
                repos_embed.fields.push(
                    {
                        name: repo.name,
                        value: `[Repository](${repo.html_url})`,
                    },
                );
            });

            const actionRow = getActionRow(currentPage);
            await interaction.reply({ embeds: [repos_embed], components: [ actionRow] });

            const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) return;

                const [action, pageIndex] = buttonInteraction.customId.split('_');

                if (action === 'previous') {
                    currentPage = Math.max(0, parseInt(pageIndex, 10) - 1);
                } else if (action === 'next') {
                    currentPage = Math.min(pages.length - 1, parseInt(pageIndex, 10) + 1);
                }

                await buttonInteraction.deferUpdate();
                await updateReposEmbed(currentPage);
            });

            collector.on('end', () => {
                actionRow.components.forEach((component) => component.setDisabled(true));
                interaction.editReply({ components: [actionRow] });
            });
        }
    },
};
