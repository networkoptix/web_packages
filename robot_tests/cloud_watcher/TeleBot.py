import telebot


class TeleBot:
    bot = telebot.TeleBot('1358820574:AAG0pAau7Va3o0El2seTqPLBnWcTctsB0wE')

    # def __init__(self):
    #     TeleBot.bot.polling()

    def send_text(self, txt):
        TeleBot.bot.send_message(txt)
