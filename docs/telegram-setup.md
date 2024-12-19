# Setting up Testing Environment in Telegram

This guide is designed for future contributors to configure the testing environment for Telegram bots and apps. Follow the steps carefully to create a bot, set up an app, and run it locally with Ngrok for public access.

## Prerequisites
- A Telegram account.
- A computer or device where you can run the bot locally.
- A local server setup (e.g., Node.js, Python, or any server application running on your local machine).
- Ngrok installed (for exposing local servers to the internet).

---

## Step 1: Create a Bot with BotFather

1. **Start a conversation with BotFather**:
   - Open Telegram and search for **BotFather**. This is the official bot provided by Telegram for managing other bots.
   - Start the chat with `/start` to view the list of commands. 

2. **Create a New Bot**:
   - Type `/newbot` to create a new bot.
   - BotFather will prompt you for a name for your bot. This can be anything, e.g., `MyTestBot`.
   - After that, you will be asked for a **username** for your bot. The username must be unique and must end with `bot`, e.g., `MyTestBot123_bot`.

3. **Secure your Bot Token**:
   - Once your bot is created, BotFather will provide you with an **API token** (access token). This token is essential for interacting with your bot programmatically.
   - **Important**: Keep your API token secure! Never share it publicly.

---

## Step 2: Create a New App on Telegram

1. **Start the App Creation Process**:
   - In the chat with BotFather, type `/newapp` to create a new app associated with your bot.
   - You will be prompted to select the bot you just created. Select the bot you wish to link to this app.

2. **Provide App Details**:
   - **Short description**: Provide a short description of your app. This will be visible to users.
   - **App picture**: Upload a picture with dimensions **640x360 pixels**. This will be the visual representation of your app on Telegram.

3. **Skip Demo GIF**:
   - BotFather will ask you for a **demo GIF**. You can skip this step by typing `/skip`.

4. **Enter Website URL**:
   - Telegram will ask for a **website URL**. This is where your app will be hosted.

---

## Step 3: Run the Project Locally

Since Telegram requires a publicly accessible URL for your app, we cannot directly use your local development environment. Instead, we will use **Ngrok** to expose your local server to the internet.

1. **Install Ngrok**:
   - Go to [Ngrok](https://ngrok.com/) and create an account.
   - After creating an account, download and install Ngrok by following the installation instructions for your operating system.

2. **Start Your Local Server**:
   - Run your app locally on your machine. Ensure your server is running on a specific port (e.g., `http://localhost:3000`).

3. **Expose Your Local Server with Ngrok**:
   - Open a terminal and navigate to the directory where Ngrok is installed.
   - Run the following command to expose your local server to the internet:
     ```bash
     ngrok http http://localhost:3000
     ```
   - Ngrok will provide you with a **public URL** that forwards traffic to your local server (e.g., `http://abc123.ngrok.io`).

4. **Update the Website URL in Telegram**:
   - Copy the Ngrok URL provided (e.g., `http://abc123.ngrok.io`).
   - Return to the conversation with BotFather and enter this URL as the website URL for your app.

---

## Step 4: Finalize App Configuration

Once you've configured the app and linked it to your bot with the Ngrok URL:

- Your app will now be live, and users can interact with it via Telegram.
- If you want to update the details (e.g., description, image, URL), you can always return to BotFather and modify the settings.

---

## Important Environment Variables: BOT_TOKEN and WEBAPP_URL

### BOT_TOKEN:
The **BOT_TOKEN** is a unique access token provided by **BotFather** when you create your bot. This token is used to authenticate your bot and interact with the Telegram Bot API. It is critical that you store this token securely and do not share it publicly.

- You will use the **BOT_TOKEN** in your project to interact with the Telegram API programmatically.
- Always keep this token private, as anyone with access to it can control your bot.

### WEBAPP_URL:
The **WEBAPP_URL** refers to the publicly accessible URL of your app, which is required for Telegram to link to your bot. Since Telegram requires an internet-accessible URL for your app, **Ngrok** is used to create a temporary public URL that forwards to your local server.

- The **WEBAPP_URL** is typically the **Ngrok URL** (e.g., `http://abc123.ngrok.io`) and should be provided when configuring the app in **BotFather**.
- If you're deploying your app to a production environment, you can update the **WEBAPP_URL** to reflect your actual hosting URL.

---

## Notes

- **Security**: Make sure that you never share your Bot Token or any sensitive information. Keep it secure at all times.
- **Ngrok**: The free version of Ngrok provides temporary URLs that expire after some time. For long-term usage, consider using a paid Ngrok plan or deploy your bot and app on a public server.

---

## Telegram API Documentation References

For further reference, you can consult the official Telegram documentation on bot creation and app configuration:
- [BotFather Documentation](https://core.telegram.org/bots#botfather)
- [Telegram Bots API](https://core.telegram.org/bots/api)
- [Ngrok Documentation](https://ngrok.com/docs)

---

By following these steps, you will have successfully set up a Telegram bot, created an app, and exposed it to the public using Ngrok for testing. Happy coding!
