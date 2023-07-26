const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, StringSelectMenuBuilder } = require('discord.js');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('compile')
        .setDescription('compiles your code')
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Select a language')
                .setRequired(true)
                .addChoices(
                    { name: 'c++', value: 'cpp' },
                    { name: 'Python', value: 'python' },
                )),
    async execute(interaction) {

        const modal = new ModalBuilder()
            .setCustomId('inputCode')
            .setTitle('Input Code')

        const code = new TextInputBuilder()
            .setLabel('Paste code here')
            .setCustomId('codeInput')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const input = new TextInputBuilder()
            .setLabel('Paste input here (leave blank if none)')
            .setCustomId('Input')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);


        const actionRow = new ActionRowBuilder().addComponents(code);
        const actionRow1 = new ActionRowBuilder().addComponents(input);

        modal.addComponents(actionRow, actionRow1)
        interaction.showModal(modal)
    },
};
