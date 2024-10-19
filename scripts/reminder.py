import sqlite3
import datetime
import subprocess
from urllib.parse import urlencode
import shutil


db_path = '/path/to/subscriptions.db'
# Connexion à la base de données SQLite
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

email = "your@mail.com"

# Fonction pour envoyer un mail via sendmail
def envoyer_mail(destinataire, sujet, message_html):    
    process = subprocess.Popen(['/usr/sbin/sendmail', '-t'], stdin=subprocess.PIPE)
    mail_content = f"""To: {destinataire}
Subject: {sujet}
Content-Type: text/html; charset="UTF-8"

{message_html}
"""
    process.communicate(mail_content.encode())

# Fonction pour mettre à jour la colonne reminder dans la base de données
def update_reminder(id, newReminder):
    cursor.execute("UPDATE subscriptions SET reminder = ? WHERE id = ?", (newReminder, id))
    conn.commit()

# Fonction pour vérifier les entrées dans la base de données et envoyer des mails
def verifier_et_envoyer_mails():
    # Requête SQL pour récupérer les e-mails et les dates
    cursor.execute("SELECT id, name, reminder, price, currency, frequency, url FROM subscriptions WHERE frequency <> 'daily' AND reminder IS NOT NULL AND reminder <> '' AND TRIM(reminder) <> ''")
    resultats = cursor.fetchall()

    todayDate = datetime.date.today()

    for id, name, reminder, price, currency, frequency, url in resultats:
        try:
            reminder_date = datetime.datetime.strptime(reminder, "%Y-%m-%d").date()
        except ValueError:
            print(f"Date format error - {id} : {name}")
            continue
        
        mailLimiteDate = todayDate + datetime.timedelta(days=360)
        newReminder = 0
        daysRemainAnnual = 31
        daysRemainMonthly = 5
        daysRange = 0

        if frequency == "monthly":
            mailLimiteDate = reminder_date - datetime.timedelta(days=daysRemainMonthly)
            newReminder = reminder_date + datetime.timedelta(days=31)
            daysRange = daysRemainMonthly
        elif frequency == "annual":
            mailLimiteDate = reminder_date - datetime.timedelta(days=daysRemainAnnual)
            newReminder = reminder_date + datetime.timedelta(days=365)
            daysRange = daysRemainAnnual

        if todayDate >= mailLimiteDate:
            backup_database(db_path)
            subject = f"Subscriptions Tracker reminder : {name}"
            htmlMessage = f"""
            <html>
            <body>
                <h2>{name}</h2>
                <p style="color: green;"><strong>Subscription reminder !</strong></p>
                <p>Hi,</p>
                <p>Your <strong>{frequency}</strong> subscription will end at <strong>{reminder}</strong>.</p>
                <p>Price: <strong>{price} {currency}</strong>.</p>
                <br>
                <p>A new reminder is set to <strong>{newReminder}</strong>.</p>
                <br>
                <p>Subscriptions tracker lite.</p>
            </body>
            </html>
            """
            # Envoyer le mail
            envoyer_mail(email, subject, htmlMessage)
            print(f"Mail sent to {email}, subscription {name} reminder {reminder}, less than {daysRange} days, {frequency} ")
            update_reminder(id, newReminder)

def backup_database(db_path):
    # Nommer la copie de sauvegarde avec un timestamp
    backup_path = f"{db_path}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.backup"
    
    # Utiliser shutil pour copier le fichier
    shutil.copy(db_path, backup_path)
    print(f"Base de données sauvegardée : {backup_path}")


# Appeler la fonction pour vérifier et envoyer des mails
print(f"{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')} > Cron - Python - Subscriptions Tracker - Reminder : Start.")
verifier_et_envoyer_mails()
print(f"{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')} > Cron - Python - Subscriptions Tracker - Reminder : End.")

# Fermer la connexion à la base de données
conn.close()
