import telebot


class CloudWatcher:
    bot = telebot.TeleBot('1358820574:AAG0pAau7Va3o0El2seTqPLBnWcTctsB0wE')

    @staticmethod
    def print_status_errors(errors):
        if errors:
            for err in errors:
                print(err)
                # self._bot.send_message(err)

    @staticmethod
    @bot.message_handler(content_types=['text'])
    def send_text(message, txt):
        CloudWatcher.bot.send_message(message.chat.id, txt)