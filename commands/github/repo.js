const { github_token, DEBUG } = require('../../config.json');
const { Octokit } = require("octokit");
const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, ButtonBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const octokit = new Octokit({ auth: github_token, request: { fetch } });


module.exports = {
    data: new SlashCommandBuilder()
        .setName('ghrepo')
        .setDescription('Provides information about a repo.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Info about the repo')
                .addStringOption(option => option.setName('owner').setDescription('The owner').setRequired(true))
                .addStringOption(option => option.setName('repo').setDescription('The repo').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('code')
                .setDescription('Get code from a repo')
                .addStringOption(option => option.setName('owner').setDescription('The owner').setRequired(true))
                .addStringOption(option => option.setName('repo').setDescription('The repo').setRequired(true))
                .addStringOption(option => option.setName('path').setDescription('The path').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('tree')
                .setDescription('Repo tree structure')
                .addStringOption(option => option.setName('owner').setDescription('The owner').setRequired(true))
                .addStringOption(option => option.setName('repo').setDescription('The repo').setRequired(true))
                .addStringOption(option => option.setName('branch').setDescription('The branch').setRequired(true))
                .addBooleanOption(option => option.setName('recursive').setDescription('Recursive').setRequired(false))
                .addStringOption(option => option.setName('ignore').setDescription('Ignore paths (separate by spaces)').setRequired(false))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const repo = interaction.options.getString('repo');
        const owner = interaction.options.getString('owner');

        if (subcommand === 'info') {
            try {
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
                        { label: 'Branches', description: 'View branches', value: 'branches' },
                        { label: 'Pull Requests', description: 'View pull requests', value: 'pull_requests'}
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
                        } else if (selectedValue === 'contributers') {
                            const request = await octokit.request('GET /repos/{owner}/{repo}/contributors&per_page={per_page}', {
                                owner: owner,
                                repo: repo,
                                per_page: 100,
                            });
                            const data = request.data;

                            const pageSize = 10;
                            const pages = [];
                            for (let i = 0; i < data.length; i += pageSize) {
                                pages.push(data.slice(i, i + pageSize));
                            }

                            let currentPage = 0;

                            const updateContributorsEmbed = async (pageIndex) => {
                                const contributorData = pages[pageIndex];
                                const contributor_embed = {
                                    color: 0x0099ff,
                                    title: 'Contributers',
                                    url: "https://github.com/" + owner + "/" + repo + "/graphs/contributors",
                                    fields: [],
                                };

                                contributorData.forEach((contributor) => {
                                    contributor_embed.fields.push(
                                        {
                                            name: contributor.login,
                                            value: `[Profile](${contributor.html_url})`,
                                        },
                                    );
                                });

                                const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                                const finalActionRow = getActionRow(currentPage);
                                await interaction.editReply({ embeds: [contributor_embed], components: [newActionRow, finalActionRow] });
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

                            const contributorData = pages[0];
                            const contributor_embed = {
                                color: 0x0099ff,
                                title: 'Contributers',
                                url: "https://github.com/" + owner + "/" + repo + "/graphs/contributors",
                                fields: [],
                            };

                            contributorData.forEach((contributor) => {
                                contributor_embed.fields.push(
                                    {
                                        name: contributor.login,
                                        value: `[Profile](${contributor.html_url})`,
                                    },
                                );
                            });

                            const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                            const finalActionRow = getActionRow(currentPage);
                            await interaction.update({ embeds: [contributor_embed], components: [newActionRow, finalActionRow] });

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
                                await updateContributorsEmbed(currentPage);
                            });

                            collector.on('end', () => {
                                finalActionRow.components.forEach((component) => component.setDisabled(true));
                                interaction.editReply({ components: [finalActionRow] });
                            });
                        } else if (selectedValue === 'commits') {
                            const request = await octokit.request('GET /repos/{owner}/{repo}/commits&per_page={per_page}', {
                                owner: owner,
                                repo: repo,
                                per_page: 100,
                            });
                            const data = request.data;

                            const pageSize = 10;
                            const pages = [];
                            for (let i = 0; i < data.length; i += pageSize) {
                                pages.push(data.slice(i, i + pageSize));
                            }

                            let currentPage = 0;

                            const updateCommitsEmbed = async (pageIndex) => {
                                const commitData = pages[pageIndex];
                                const commits_embed = {
                                    color: 0x0099ff,
                                    title: 'Commits',
                                    url: "https://github.com/" + owner + "/" + repo + "/commits",
                                    fields: [],
                                };

                                commitData.forEach((commit) => {
                                    commits_embed.fields.push(
                                        {
                                            name: commit.commit.author.name,
                                            value: `[Commit](${commit.html_url})`,
                                        },
                                    );
                                });

                                const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                                const finalActionRow = getActionRow(currentPage);
                                await interaction.editReply({ embeds: [commits_embed], components: [newActionRow, finalActionRow] });
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

                            const commitData = pages[0];
                            const commits_embed = {
                                color: 0x0099ff,
                                title: 'Commits',
                                url: "https://github.com/" + owner + "/" + repo + "/commits",
                                fields: [],
                            };

                            commitData.forEach((commit) => {
                                commits_embed.fields.push(
                                    {
                                        name: commit.commit.author.name,
                                        value: `[Commit](${commit.html_url})`,
                                    },
                                );
                            });

                            const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                            const finalActionRow = getActionRow(currentPage);
                            await interaction.update({ embeds: [commits_embed], components: [newActionRow, finalActionRow] });

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
                                await updateCommitsEmbed(currentPage);
                            });

                            collector.on('end', () => {
                                const finalActionRow = getActionRow(currentPage);
                                finalActionRow.components.forEach((component) => component.setDisabled(true));
                                interaction.editReply({ components: [finalActionRow] });
                            });
                        } else if (selectedValue === 'branches') {
                            const request = await octokit.request('GET /repos/{owner}/{repo}/branches&per_page={per_page}', {
                                owner: owner,
                                repo: repo,
                                per_page: 100,
                            });
                            const data = request.data;

                            const pageSize = 10;
                            const pages = [];
                            for (let i = 0; i < data.length; i += pageSize) {
                                pages.push(data.slice(i, i + pageSize));
                            }

                            let currentPage = 0;

                            const updateBranchesEmbed = async (pageIndex) => {
                                const branchData = pages[pageIndex];
                                const branches_embed = {
                                    color: 0x0099ff,
                                    title: 'Branches',
                                    url: "https://github.com/" + owner + "/" + repo + "/branches",
                                    fields: [],
                                };

                                branchData.forEach((branch) => {
                                    const url = "https://github.com/" + owner + "/" + repo + "/tree/" + branch.name;
                                    branches_embed.fields.push(
                                        {
                                            name: branch.name,
                                            value: `[Branch](${url})`,
                                        },
                                    );
                                });

                                const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                                const finalActionRow = getActionRow(currentPage);
                                await interaction.editReply({ embeds: [branches_embed], components: [newActionRow, finalActionRow] });
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

                            const branchData = pages[0];
                            const branches_embed = {
                                color: 0x0099ff,
                                title: 'Branches',
                                url: "https://github.com/" + owner + "/" + repo + "/branches",
                                fields: [],
                            };

                            branchData.forEach((branch) => {
                                const url = "https://github.com/" + owner + "/" + repo + "/tree/" + branch.name;
                                branches_embed.fields.push(
                                    {
                                        name: branch.name,
                                        value: `[Branch](${url})`,
                                    },
                                );
                            });

                            const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                            const finalActionRow = getActionRow(currentPage);
                            await interaction.update({ embeds: [branches_embed], components: [newActionRow, finalActionRow] });

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
                                await updateBranchesEmbed(currentPage);
                            });

                            collector.on('end', () => {
                                const finalActionRow = getActionRow(currentPage);
                                finalActionRow.components.forEach((component) => component.setDisabled(true));
                                interaction.editReply({ components: [finalActionRow] });
                            });

                        } else if (selectedValue === 'pull_requests') {
                            const request = await octokit.request('GET /repos/{owner}/{repo}/pulls&per_page={per_page}', {
                                owner: owner,
                                repo: repo,
                                per_page: 100,
                            });
                            const data = request.data;

                            const pageSize = 10;
                            const pages = [];
                            for (let i = 0; i < data.length; i += pageSize) {
                                pages.push(data.slice(i, i + pageSize));
                            }

                            let currentPage = 0;

                            const updatePullsEmbed = async (pageIndex) => {
                                const pullsData = pages[pageIndex];
                                const pulls_embed = {
                                    color: 0x0099ff,
                                    title: 'Pull requests',
                                    url: "https://github.com/" + owner + "/" + repo + "/pulls",
                                    fields: [],
                                };

                                pullsData.forEach((pull) => {
                                    pulls_embed.fields.push(
                                        {
                                            name: pull.title,
                                            value: `[Pull request #${pull.number}](${pull.html_url})`,
                                        },
                                    );
                                });

                                const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                                const finalActionRow = getActionRow(currentPage);
                                await interaction.editReply({ embeds: [pulls_embed], components: [newActionRow, finalActionRow] });
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

                            const pullsData = pages[0];
                            const pulls_embed = {
                                color: 0x0099ff,
                                title: 'Pull requests',
                                url: "https://github.com/" + owner + "/" + repo + "/pulls",
                                fields: [],
                            };

                            pullsData.forEach((pull) => {
                                pulls_embed.fields.push(
                                    {
                                        name: pull.title,
                                        value: `[Pull request #${pull.number}](${pull.html_url})`,
                                    },
                                );
                            });

                            const newActionRow = new ActionRowBuilder().addComponents(selectMenu);
                            const finalActionRow = getActionRow(currentPage);
                            await interaction.update({ embeds: [pulls_embed], components: [newActionRow, finalActionRow] });

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
                                await updatePullsEmbed(currentPage);
                            });

                            collector.on('end', () => {
                                finalActionRow.components.forEach((component) => component.setDisabled(true));
                                interaction.editReply({ components: [finalActionRow] });
                            });
                        }
                    }
                });

                collector.on('end', () => {
                    actionRow.components.forEach((component) => component.setDisabled(true));
                    reply.edit({ components: [actionRow] });
                });
            } catch (error) {
                if (DEBUG) console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (subcommand === 'code') {
            const path = interaction.options.getString('path');

            try {
                const request = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                    owner: owner,
                    repo: repo,
                    path: path,
                });
                const data = request.data;
            
                const content = atob(data.content);
            
                if (content.length > 4096) {
                    const pages = [];
                    let currentPage = 0;
                    const pageSize = 4096;
            
                    for (let i = 0; i < content.length; i += pageSize) {
                        pages.push(content.slice(i, i + pageSize));
                    }
            
                    const code_embeds = pages.map((page, index) => ({
                        color: 0x0099ff,
                        title: `${data.name} - Page ${index + 1}/${pages.length}`,
                        url: data.html_url,
                        description: page,
                    }));
            
                    const updateCodeEmbed = async (pageIndex) => {
                        await interaction.editReply({ embeds: [code_embeds[pageIndex]], components: [getActionRow(pageIndex)] });
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
            
                    await interaction.reply({ embeds: [code_embeds[currentPage]], components: [getActionRow(currentPage)] });
            
                    const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
            
                    collector.on('collect', async (buttonInteraction) => {
                        if (!buttonInteraction.user.id === interaction.user.id) return;
            
                        const [action, pageIndex] = buttonInteraction.customId.split('_');
            
                        if (action === 'previous') {
                            currentPage = Math.max(0, parseInt(pageIndex, 10) - 1);
                        } else if (action === 'next') {
                            currentPage = Math.min(pages.length - 1, parseInt(pageIndex, 10) + 1);
                        }
            
                        await buttonInteraction.deferUpdate();
                        await updateCodeEmbed(currentPage);
                    });
            
                    collector.on('end', () => {
                        const finalActionRow = getActionRow(currentPage);
                        finalActionRow.components.forEach((component) => component.setDisabled(true));
                        interaction.editReply({ components: [finalActionRow] });
                    });
                } else {
                    const code_embed = {
                        color: 0x0099ff,
                        title: data.name,
                        url: data.html_url,
                        description: content,
                    };
            
                    await interaction.reply({ embeds: [code_embed] });
                }
            } catch (error) {
                if (DEBUG) console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (subcommand === 'tree') {
            const branch = interaction.options.getString('branch');
            const recursive = interaction.options.getBoolean('recursive');
            const ignore = interaction.options.getString('ignore');
            const ignore_paths = ignore ? ignore.split(' ') : [];

            try {
                const request = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{branch}?recursive={recursive}', {
                    owner: owner,
                    repo: repo,
                    branch: branch,
                    recursive: recursive ? 1 : 0,
                });
                const data = request.data;

                const formatTree = (tree) => {
                    let output = '';
                    const sortedTree = tree.sort((a, b) => a.path.localeCompare(b.path));
            
                    for (let i = 0; i < sortedTree.length; i++) {
                        const item = sortedTree[i];
                        if (ignore_paths.some(path => item.path.includes(path))) continue;
            
                        const url = "https://github.com/" + owner + "/" + repo + "/tree/" + branch + "/" + item.path;
                        const file = item.path.split('/').pop();

                        let isLast = false;
                        if (i === tree.length - 1) isLast = true;
                        else if (sortedTree[i + 1].path.split('/').length < item.path.split('/').length) isLast = true;

                        const prefix = isLast ? '└─ ' : '├─ ';

                        if (item.path.split('/').length === 1) {
                            output += `${prefix}[${item.type}] [${file}](${url})\n`;
                        } else {
                            const preIndent = '│　 '.repeat(Math.max(item.path.split('/').length - 1, 0));
                            output += `${preIndent}${prefix}[${item.type}] [${file}](${url})\n`;
                        }
            
                        if (item.type === 'tree' && recursive) {
                            const subdirectory = tree.filter(subitem => subitem.path.startsWith(item.path + '/'));
                            output += formatTree(subdirectory);
                        }
                    }
            
                    return output;
                };

                const tree_output = formatTree(data.tree);
            
                const tree_embed = {
                    color: 0x0099ff,
                    title: owner + "/" + repo + " - Tree",
                    url: "https://github.com/" + owner + "/" + repo + "/tree/" + branch,
                    description: "\n" + repo + "\n" + tree_output,
                };

                await interaction.reply({ embeds: [tree_embed] });
            } catch (error) {
                if (DEBUG) console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    },
};
