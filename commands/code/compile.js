const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('compile')
        .setDescription('compiles your code')
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Select a language')
                .setRequired(true)
                .addChoices(
                    { name: 'C++', value: 'cpp' },
                    { name: 'Python', value: 'python' },
                )),

    async execute(interaction) {

        const modal = new ModalBuilder()
            .setCustomId('compilerModal')
            .setTitle('Input Code');

        const scriptInput = new TextInputBuilder()
            .setLabel('Paste code here')
            .setCustomId('codeInput')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const paramsInput = new TextInputBuilder()
            .setLabel('Paste input here (leave blank if none)')
            .setCustomId('Input')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const scriptActionRow = new ActionRowBuilder().addComponents(scriptInput);
        const paramsActionRow = new ActionRowBuilder().addComponents(paramsInput);
        modal.addComponents(scriptActionRow, paramsActionRow);

        interaction.showModal(modal);

    },
};
