const { Events } = require('discord.js');


module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction) {


        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message:', error);
                return;
            }
        }
    },
};



