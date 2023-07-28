const { github_token } = require('../../config.json');
const { Octokit, App } = require("octokit");
const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType  } = require('discord.js');
const { fetch } = require('node-fetch');

const octokit = new Octokit({ auth: github_token, request: { fetch } });


module.exports = {
    data: new SlashCommandBuilder()
        .setName('repo')
        .setDescription('Provides information about a repo.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Info about the repo')
                .addStringOption(option => option.setName('owner').setDescription('The owner').setRequired(true))
                .addStringOption(option => option.setName('repo').setDescription('The repo').setRequired(true))),
        // .addSubcommand(subcommand =>
        //     subcommand
        //         .setName('contributors')
        //         .setDescription('Lists the contributors of a repo')
        //         .addStringOption(option => option.setName('owner').setDescription('The owner').setRequired(true))
        //         .addStringOption(option => option.setName('repo').setDescription('The repo').setRequired(true))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const repo = interaction.options.getString('repo');
        const owner = interaction.options.getString('owner');

        if (subcommand === 'info') {
            const request = await octokit.request('GET /repos/{owner}/{repo}', {
                owner: owner,
                repo: repo,
            });
            const data = request.data;

            const main_embed = {
                color: 0x0099ff,
                title: data.full_name,
                url: data.html_url,
                fields: [],
            };

            if (data.description) {
                main_embed.description = data.description;
            }
            if (data.language) {
                main_embed.fields.push(
                    {
                        name: 'Language',
                        value: data.language,
                        inline: true,
                    },
                );
            }
            if (data.homepage) {
                main_embed.fields.push(
                    {
                        name: 'Homepage',
                        value: data.homepage,
                        inline: true,
                    },
                );
            }
            if (data.license) {
                main_embed.fields.push(
                    {
                        name: 'License',
                        value: data.license.name,
                        inline: true,
                    },
                );
            }
            if (data.fork) {
                main_embed.fields.push(
                    {
                        name: 'Fork',
                        value: 'Yes',
                        inline: true,
                    },
                );
            }
            if (data.archived) {
                main_embed.fields.push(
                    {
                        name: 'Archived',
                        value: 'Yes',
                        inline: true,
                    },
                );
            }
            if (data.disabled) {
                main_embed.fields.push(
                    {
                        name: 'Disabled',
                        value: 'Yes',
                        inline: true,
                    },
                );
            }
            if (data.forks_count) {
                main_embed.fields.push(
                    {
                        name: 'Forks',
                        value: data.forks_count,
                        inline: true,
                    },
                );
            }
            if (data.stargazers_count) {
                main_embed.fields.push(
                    {
                        name: 'Stars',
                        value: data.stargazers_count,
                        inline: true,
                    },
                );
            }
            if (data.watchers_count) {
                main_embed.fields.push(
                    {
                        name: 'Watchers',
                        value: data.watchers_count,
                        inline: true,
                    },
                );
            }
            const selectMenu = new StringSelectMenuBuilder({
                custom_id: 'select_menu',
                placeholder: 'Select an option',
                min_values: 1,
                max_values: 1,
                options: [
                    { label: 'Main', description: 'Main menu', value: 'main' },
                    { label: 'Contributers', description: 'View top contributers', value: 'contributers' },
                    { label: 'Commits', description: 'View latest commits', value: 'commits' },
                ]
            });

            const actionRow = new ActionRowBuilder().addComponents(selectMenu);

            const reply = await interaction.reply({ embeds: [main_embed], components: [actionRow] });

            const collector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

            collector.on('collect', async (interaction) => {
                console.log(interaction);
                if (interaction.customId === 'select_menu') {
                    const selectedValue = interaction.values[0];
                    console.log(interaction);
                    if (selectedValue === 'main') {
                        await interaction.update({ embeds: [main_embed], components: [actionRow] });
                    }
                    if (selectedValue === 'contributers') {
                        const request = await octokit.request('GET /repos/{owner}/{repo}/contributors', {
                            owner: owner,
                            repo: repo,
                        });
                        const data = request.data;

                        const contributor_embed = {
                            color: 0x0099ff,
                            title: 'Contributers',
                            fields: [],
                        };

                        data.forEach((contributor) => {
                            contributor_embed.fields.push(
                                {
                                    name: contributor.login,
                                    value: `[Profile](${contributor.html_url})`,
                                },
                            );
                        });
                        const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                        await interaction.update({ embeds: [contributor_embed], components: [newActionRow] });
                    }
                    if (selectedValue === 'commits') {
                        console.log("debug");
                        const request = await octokit.request('GET /repos/{owner}/{repo}/commits', {
                            owner: owner,
                            repo: repo,
                        });
                        const data = request.data;

                        const commits_embed = {
                            color: 0x0099ff,
                            title: 'Commits',
                            fields: [],
                        };

                        data.forEach((commit) => {
                            commits_embed.fields.push(
                                {
                                    name: commit.commit.author.name,
                                    value: `[Commit](${commit.html_url})`,
                                },
                            );
                        });

                        const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                        await interaction.update({ embeds: [commits_embed], components: [newActionRow] });
                    }
                }
            });

            collector.on('end', () => {
                actionRow.components.forEach((component) => component.setDisabled(true));
                reply.edit({ components: [actionRow] });
            });
        }
    },
};
