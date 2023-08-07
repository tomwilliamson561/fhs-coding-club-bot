const { github_token, DEBUG } = require('../../config.json');
const { Octokit } = require("octokit");
const { SlashCommandBuilder, ActionRowBuilder, ComponentType, ButtonBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const octokit = new Octokit({ auth: github_token, request: { fetch } });


module.exports = {
    data: new SlashCommandBuilder()
        .setName('ghsearch')
        .setDescription('Searching GitHub')
        .addSubcommand(subcommand =>
            subcommand
                .setName('code')
                .setDescription('Search code')
                .addStringOption(option => option.setName('query').setDescription('Query').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('commits')
                .setDescription('Search commits')
                .addStringOption(option => option.setName('query').setDescription('Query').setRequired(true))
                .addStringOption(option => option.setName('sort').setDescription('Sort').setRequired(false))
                .addStringOption(option => option.setName('order').setDescription('Order').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('issues')
                .setDescription('Search issues')
                .addStringOption(option => option.setName('query').setDescription('Query').setRequired(true))
                .addStringOption(option => option.setName('sort').setDescription('Sort').setRequired(false))
                .addStringOption(option => option.setName('order').setDescription('Order').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('pull-requests')
                .setDescription('Search pull requests')
                .addStringOption(option => option.setName('query').setDescription('Query').setRequired(true))
                .addStringOption(option => option.setName('sort').setDescription('Sort').setRequired(false))
                .addStringOption(option => option.setName('order').setDescription('Order').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('labels')
                .setDescription('Search labels')
                .addIntegerOption(option => option.setName('repo').setDescription('Repository ID').setRequired(true))
                .addStringOption(option => option.setName('query').setDescription('Query').setRequired(true))
                .addStringOption(option => option.setName('sort').setDescription('Sort').setRequired(false))
                .addStringOption(option => option.setName('order').setDescription('Order').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('repositories')
                .setDescription('Search repositories')
                .addStringOption(option => option.setName('query').setDescription('Query').setRequired(true))
                .addStringOption(option => option.setName('sort').setDescription('Sort').setRequired(false))
                .addStringOption(option => option.setName('order').setDescription('Order').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('topics')
                .setDescription('Search topics')
                .addStringOption(option => option.setName('query').setDescription('Query').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('users')
                .setDescription('Search users')
                .addStringOption(option => option.setName('query').setDescription('Query').setRequired(true))
                .addStringOption(option => option.setName('sort').setDescription('Sort').setRequired(false))
                .addStringOption(option => option.setName('order').setDescription('Order').setRequired(false))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const query = interaction.options.getString('query');

        if (subcommand === 'code') {
            try {
                const request = await octokit.request('GET /search/code?q={query}&per_page={per_page}', {
                    query: query,
                    per_page: 100,
                });
                const data = request.data;

                const pageSize = 10;
                const pages = [];
                for (let i = 0; i < data.items.length; i += pageSize) {
                    pages.push(data.items.slice(i, i + pageSize));
                }

                let currentPage = 0;

                const updateCodeEmbed = async (pageIndex) => {
                    const codeData = pages[pageIndex];
                    const code_embed = {
                        color: 0x0099ff,
                        title: 'Code',
                        url: "https://github.com/search?" + query + "&type=code",
                        fields: [],
                    };

                    codeData.forEach((code) => {
                        code_embed.fields.push(
                            {
                                name: code.name,
                                value: `[Result](${code.html_url})`,
                            },
                        );
                    });

                    const actionRow = getActionRow(currentPage);
                    await interaction.editReply({ embeds: [code_embed], components: [actionRow] });
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

                const codeData = pages[0];
                const code_embed = {
                    color: 0x0099ff,
                    title: 'Repositories',
                    url: "https://github.com/search?" + query + "&type=code",
                    fields: [],
                };

                codeData.forEach((code) => {
                    code_embed.fields.push(
                        {
                            name: code.name,
                            value: `[Result](${code.html_url})`,
                        },
                    );
                });

                const actionRow = getActionRow(currentPage);
                await interaction.reply({ embeds: [code_embed], components: [actionRow] });

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
                    await updateCodeEmbed(currentPage);
                });

                collector.on('end', () => {
                    actionRow.components.forEach((component) => component.setDisabled(true));
                    interaction.editReply({ components: [actionRow] });
                });
            } catch (error) {
                if (DEBUG) console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (subcommand === 'commits') {
            try {
                const sort = interaction.options.getString('sort');
                const order = interaction.options.getString('order');

                const request = await octokit.request('GET /search/commits?q={query}&sort={sort}&order={order}&per_page={per_page}', {
                    query: query,
                    sort: sort,
                    order: order,
                    per_page: 100,
                });
                const data = request.data;

                const pageSize = 10;
                const pages = [];
                for (let i = 0; i < data.items.length; i += pageSize) {
                    pages.push(data.items.slice(i, i + pageSize));
                }

                let currentPage = 0;

                const updateCommitsEmbed = async (pageIndex) => {
                    const commitsData = pages[pageIndex];
                    const commits_embed = {
                        color: 0x0099ff,
                        title: 'Commits',
                        url: "https://github.com/search?" + query + "&type=commits",
                        fields: [],
                    };
                    
                    commitsData.forEach((commit) => {
                        commits_embed.fields.push(
                            {
                                name: commit.commit.message,
                                value: `[Result](${commit.html_url})`,
                            },
                        );
                    });

                    const actionRow = getActionRow(currentPage);
                    await interaction.editReply({ embeds: [commits_embed], components: [actionRow] });
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

                const commitsData = pages[0];
                const commits_embed = {
                    color: 0x0099ff,
                    title: 'Commits',
                    url: "https://github.com/search?" + query + "&type=commits",
                    fields: [],
                };
                
                commitsData.forEach((commit) => {
                    commits_embed.fields.push(
                        {
                            name: commit.commit.message,
                            value: `[Result](${commit.html_url})`,
                        },
                    );
                });

                const actionRow = getActionRow(currentPage);
                await interaction.reply({ embeds: [commits_embed], components: [actionRow] });

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
                    actionRow.components.forEach((component) => component.setDisabled(true));
                    interaction.editReply({ components: [actionRow] });
                });

            } catch (error) {
                if (DEBUG) console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (subcommand === 'issues') {
            try {
                const sort = interaction.options.getString('sort');
                const order = interaction.options.getString('order');

                const request = await octokit.request('GET /search/issues?q={query}&sort={sort}&order={order}&per_page={per_page}', {
                    query: query,
                    sort: sort,
                    order: order,
                    per_page: 100,
                });
                const data = request.data;

                const pageSize = 10;
                const pages = [];
                for (let i = 0; i < data.items.length; i += pageSize) {
                    pages.push(data.items.slice(i, i + pageSize));
                }

                let currentPage = 0;

                const parsedQuery = query.replace(' ', '%20')

                const updateIssuesEmbed = async (pageIndex) => {
                    const issuesData = pages[pageIndex];
                    const issues_embed = {
                        color: 0x0099ff,
                        title: 'Issues',
                        url: "https://github.com/search?q=" + parsedQuery + "&type=issue",
                        fields: [],
                    };

                    issuesData.forEach((issue) => {
                        issues_embed.fields.push(
                            {
                                name: issue.title,
                                value: `[Result](${issue.html_url})`,
                            },
                        );
                    });

                    const actionRow = getActionRow(currentPage);
                    await interaction.editReply({ embeds: [issues_embed], components: [actionRow] });
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
                }

                const issuesData = pages[0];
                const issues_embed = {
                    color: 0x0099ff,
                    title: 'Issues',
                    url: "https://github.com/search?q=" + parsedQuery + "&type=issue",
                    fields: [],
                };

                issuesData.forEach((issue) => {
                    issues_embed.fields.push(
                        {
                            name: issue.title,
                            value: `[Result](${issue.html_url})`,
                        },
                    );
                });

                const actionRow = getActionRow(currentPage);
                await interaction.reply({ embeds: [issues_embed], components: [actionRow] });

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
                    await updateIssuesEmbed(currentPage);
                });

                collector.on('end', () => {
                    actionRow.components.forEach((component) => component.setDisabled(true));
                    interaction.editReply({ components: [actionRow] });
                });

            } catch (error) {
                if (DEBUG) console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (subcommand === 'pull-requests') {
            try {
                const sort = interaction.options.getString('sort');
                const order = interaction.options.getString('order');
                
                const request = await octokit.request('GET /search/issues?q={query}&sort={sort}&order={order}&per_page={per_page}', {
                    query: query,
                    sort: sort,
                    order: order,
                    per_page: 100,
                });
                const data = request.data;

                const pageSize = 10;
                const pages = [];
                for (let i = 0; i < data.items.length; i += pageSize) {
                    pages.push(data.items.slice(i, i + pageSize));
                }

                let currentPage = 0;

                const parsedQuery = query.replace(' ', '%20')

                const updatePullRequestsEmbed = async (pageIndex) => {
                    const pullRequestsData = pages[pageIndex];
                    const pullRequests_embed = {
                        color: 0x0099ff,
                        title: 'Pull Requests',
                        url: "https://github.com/search?q=" + parsedQuery + "&type=pullrequests",
                        fields: [],
                    };
                    
                    pullRequestsData.forEach((pullRequest) => {
                        pullRequests_embed.fields.push(
                            {
                                name: pullRequest.title,
                                value: `[Result](${pullRequest.html_url})`,
                            },
                        );
                    });

                    const actionRow = getActionRow(currentPage);
                    await interaction.editReply({ embeds: [pullRequests_embed], components: [actionRow] });
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
                }

                const pullRequestsData = pages[0];
                const pullRequests_embed = {
                    color: 0x0099ff,
                    title: 'Pull Requests',
                    url: "https://github.com/search?q=" + parsedQuery + "&type=pullrequests",
                    fields: [],
                };

                pullRequestsData.forEach((pullRequest) => {
                    pullRequests_embed.fields.push(
                        {
                            name: pullRequest.title,
                            value: `[Result](${pullRequest.html_url})`,
                        },
                    );
                });

                const actionRow = getActionRow(currentPage);
                await interaction.reply({ embeds: [pullRequests_embed], components: [actionRow] });

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
                    await updatePullRequestsEmbed(currentPage);
                });

                collector.on('end', () => {
                    actionRow.components.forEach((component) => component.setDisabled(true));
                    interaction.editReply({ components: [actionRow] });
                });

            } catch (error) {
                if (DEBUG) console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (subcommand === 'labels') {
            try {
                const sort = interaction.options.getString('sort');
                const order = interaction.options.getString('order');
                const repo = interaction.options.getInteger('repo');

                const request = await octokit.request('GET /search/labels?q={query}&repository_id={repo}&sort={sort}&order={order}&per_page={per_page}', {
                    query: query,
                    repo: repo,
                    sort: sort,
                    order: order,
                    per_page: 100,
                });
                const data = request.data;

                const pageSize = 10;
                const pages = [];
                for (let i = 0; i < data.items.length; i += pageSize) {
                    pages.push(data.items.slice(i, i + pageSize));
                }

                let currentPage = 0;

                const updateLabelsEmbed = async (pageIndex) => {
                    const labelsData = pages[pageIndex];
                    const labels_embed = {
                        color: 0x0099ff,
                        title: 'Labels',
                        url: "https://github.com/search?" + query + "&type=labels",
                        fields: [],
                    };

                    labelsData.forEach((label) => {
                        labels_embed.fields.push(
                            {
                                name: label.name,
                                value: `[Result](${label.html_url})`,
                            },
                        );
                    });

                    const actionRow = getActionRow(currentPage);
                    await interaction.editReply({ embeds: [labels_embed], components: [actionRow] });
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
                }

                const labelsData = pages[0];
                const labels_embed = {
                    color: 0x0099ff,
                    title: 'Labels',
                    url: "https://github.com/search?" + query + "&type=labels",
                    fields: [],
                };

                labelsData.forEach((label) => {
                    labels_embed.fields.push(
                        {
                            name: label.name,
                            value: `[Result](${label.html_url})`,
                        },
                    );
                });

                const actionRow = getActionRow(currentPage);
                await interaction.editReply({ embeds: [labels_embed], components: [actionRow] });

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
                    await updateLabelsEmbed(currentPage);
                });

                collector.on('end', () => {
                    actionRow.components.forEach((component) => component.setDisabled(true));
                    interaction.editReply({ components: [actionRow] });
                });

            } catch (error) {
                if (DEBUG) console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (subcommand === 'repositories') {
            try {
                const sort = interaction.options.getString('sort');
                const order = interaction.options.getString('order');

                const request = await octokit.request('GET /search/repositories?q={query}&sort={sort}&order={order}&per_page={per_page}', {
                    query: query,
                    sort: sort,
                    order: order,
                    per_page: 100,
                });
                const data = request.data;

                const pageSize = 10;
                const pages = [];
                for (let i = 0; i < data.items.length; i += pageSize) {
                    pages.push(data.items.slice(i, i + pageSize));
                }

                let currentPage = 0;

                const updateRepositoriesEmbed = async (pageIndex) => {
                    const repositoriesData = pages[pageIndex];
                    const repositories_embed = {
                        color: 0x0099ff,
                        title: 'Repositories',
                        url: "https://github.com/search?" + query + "&type=repositories",
                        fields: [],
                    };

                    repositoriesData.forEach((repository) => {
                        repositories_embed.fields.push(
                            {
                                name: repository.name,
                                value: `[Result](${repository.html_url})`,
                            },
                        );
                    });

                    const actionRow = getActionRow(currentPage);
                    await interaction.editReply({ embeds: [repositories_embed], components: [actionRow] });
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
                }

                const repositoriesData = pages[0];
                const repositories_embed = {
                    color: 0x0099ff,
                    title: 'Repositories',
                    url: "https://github.com/search?" + query + "&type=repositories",
                    fields: [],
                };

                repositoriesData.forEach((repository) => {
                    repositories_embed.fields.push(
                        {
                            name: repository.name,
                            value: `[Result](${repository.html_url})`,
                        },
                    );
                });

                const actionRow = getActionRow(currentPage);
                await interaction.editReply({ embeds: [repositories_embed], components: [actionRow] });

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
                    await updateRepositoriesEmbed(currentPage);
                });

                collector.on('end', () => {
                    actionRow.components.forEach((component) => component.setDisabled(true));
                    interaction.editReply({ components: [actionRow] });
                });

            } catch (error) {
                if (DEBUG) console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (subcommand === 'topics') {
            try {
                const request = await octokit.request('GET /search/topics?q={query}&per_page={per_page}', {
                    query: query,
                    per_page: 100,
                });
                const data = request.data;

                const pageSize = 10;
                const pages = [];
                for (let i = 0; i < data.items.length; i += pageSize) {
                    pages.push(data.items.slice(i, i + pageSize));
                }

                let currentPage = 0;

                const updateTopicsEmbed = async (pageIndex) => {
                    const topicsData = pages[pageIndex];
                    const topics_embed = {
                        color: 0x0099ff,
                        title: 'Topics',
                        url: "https://github.com/search?" + query + "&type=topics",
                        fields: [],
                    };

                    topicsData.forEach((topic) => {
                        topics_embed.fields.push(
                            {
                                name: topic.name,
                                value: `[Result](https://github.com/topics/${topic.name})`,
                            },
                        );
                    });

                    const actionRow = getActionRow(currentPage);
                    await interaction.editReply({ embeds: [topics_embed], components: [actionRow] });
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
                }

                const topicsData = pages[0];
                const topics_embed = {
                    color: 0x0099ff,
                    title: 'Topics',
                    url: "https://github.com/search?" + query + "&type=topics",
                    fields: [],
                };

                topicsData.forEach((topic) => {
                    topics_embed.fields.push(
                        {
                            name: topic.name,
                            value: `[Result](https://github.com/topics/${topic.name})`,
                        },
                    );
                });

                const actionRow = getActionRow(currentPage);
                await interaction.reply({ embeds: [topics_embed], components: [actionRow] });

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
                    await updateTopicsEmbed(currentPage);
                });

                collector.on('end', () => {
                    actionRow.components.forEach((component) => component.setDisabled(true));
                    interaction.editReply({ components: [actionRow] });
                });

            } catch (error) {
                if (DEBUG) console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (subcommand === 'users') {
            try {
                const sort = interaction.options.getString('sort');
                const order = interaction.options.getString('order');

                const request = await octokit.request('GET /search/users?q={query}&sort={sort}&order={order}&per_page={per_page}', {
                    query: query,
                    sort: sort,
                    order: order,
                    per_page: 100,
                });
                const data = request.data;

                const pageSize = 10;
                const pages = [];
                for (let i = 0; i < data.items.length; i += pageSize) {
                    pages.push(data.items.slice(i, i + pageSize));
                }

                let currentPage = 0;

                const updateUsersEmbed = async (pageIndex) => {
                    const usersData = pages[pageIndex];
                    const users_embed = {
                        color: 0x0099ff,
                        title: 'Users',
                        url: "https://github.com/search?" + query + "&type=users",
                        fields: [],
                    };

                    usersData.forEach((user) => {
                        users_embed.fields.push(
                            {
                                name: user.login,
                                value: `[Result](${user.html_url})`,
                            },
                        );
                    });

                    const actionRow = getActionRow(currentPage);
                    await interaction.editReply({ embeds: [users_embed], components: [actionRow] });
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
                }

                const usersData = pages[0];
                const users_embed = {
                    color: 0x0099ff,
                    title: 'Users',
                    url: "https://github.com/search?" + query + "&type=users",
                    fields: [],
                };

                usersData.forEach((user) => {
                    users_embed.fields.push(
                        {
                            name: user.login,
                            value: `[Result](${user.html_url})`,
                        },
                    );
                });

                const actionRow = getActionRow(currentPage);
                await interaction.reply({ embeds: [users_embed], components: [actionRow] });

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
                    await updateUsersEmbed(currentPage);
                });

                collector.on('end', () => {
                    actionRow.components.forEach((component) => component.setDisabled(true));
                    interaction.editReply({ components: [actionRow] });
                });

            } catch (error) {
                if (DEBUG) console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    },
};
