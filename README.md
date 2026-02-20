# GitDepSec

GitDepSec is a dependencies vulnerabilities visualizer with AI-powered insights to help you resolve them and ship code more secure and faster.

## **Who should use GitDepSec?**

**Anyone** working with Node.js, Python, Java, Ruby, or Dart projects who needs to identify and fix vulnerable dependencies for their project.

# Features

- Popular programming ecosystems supported (names from <a href='https://osv.dev/'>OSV.dev</a>)
  - JS/TS (Node (npm)) - package.json (Tested)
  - Python (PyPI) - requirements.txt(Tested)
  - Java (Maven) - pom.xml (Partially Tested)
  - RubyGems (Gemfile) - GemFile(Not tested)
  - Dart (Pubspec) - PubSpec.yaml (Not Tested)

- **Graph visualizations** for vulnerable dependencies with detailed information.
- Upload a **dependency manifest file** or **Github repository URL** with specific branch selection.
- AI summary to help understand detailed and jargon-filled information in vulnerability information.
- **Inline prompt** box to help you ask questions on selected text (VS-Code inspired inline support).
- Generate an **AI Fix Plan** for your vulnerabilities to solve them at once with information.
  (Note: Currently, the Fix Plan describes individual steps for solving each dependency vulnerability, a detailed fix plan generation is currently in development)

# How to run locally

Clone the repository and open the repository in any text editor/IDE you like.

## Frontend

- Run the command inside the root folder to install dependencies.

  ```bash
  bun install
  ```

- Add your Github PAT to the **.env** file as it is important to increase the limit to 5000 req/hour.
- Finally, execute the command below to start the frontend at **localhost:3000**.

  ```bash
  bun run dev
  ```

## Backend

- Quick start (one command from project root):

  ```bash
  bun run backend:setup
  ```

- This command will:
  - create `backend/.env` if missing
  - set local defaults for `PORT`, `NODE_ENV`, `DEV_ORIGIN`, and `DATABASE_URL` (only if empty/missing)
  - install backend dependencies
  - start or create the Postgres Docker container
  - run Drizzle schema generation + push
  - start the backend dev server

- Manual setup (if you prefer step-by-step):

- Navigate to the **./backend** directory inside the repository

  ```bash
  cd ./backend
  ```

- Install dependencies for backend

  ```bash
   bun install
  ```

- Create a **.env** file in the backend directory and add:
  - **OPEN_ROUTER_KEY** - Your OpenRouter API Key for AI functionalities
  - **ENCRYPTION_KEY** (Optional) - Custom encryption key for securing API credentials in transit (defaults to built-in key if not set)
- ### Database
  - To setup the Database, run the bash script that will start a docker container running a **postgresql** image in it.

    ```bash
    ./database-start.sh
    ```

  - When prompted to generate a random password, input yes. The Postgres database will start in a container at **localhost:5432**.
  - After the container is running, run the following command to generate the Tables from the schema.

    ```bash
       bun run db:generate
    ```

  - Then push the changes to the container by running:

    ```bash
       bun run db:push
    ```

  - OPTIONAL: to check if the DB is running as expected, run the following command to see if you can open the studio.

    ```bash
       bun run db:studio
    ```

- Finally, after setting up both Backend and DB, run the service with

  ```bash
  bun run dev
  ```

### MCP (Phase 1)

- Run the local MCP server (stdio transport) with:

  ```bash
  bun run backend:mcp
  ```

- Phase 1 tools:
  - `scan_repo`
  - `scan_manifest`
  - `list_vulnerabilities`

- Full MCP notes are in `backend/mcp/README.md`.

# Ideation and Motivation

I came across <a href='https://gitdiagram.com/'>GitDiagram</a> where I made some contributions to the repository, I also had some idea to before this to build something like a visualisation for vulnerable dependencies, which can help people find, see and resolve them easily.
So there began the development for **GitDepSec**. You will see the inspiration in my code.

# AI Information

You can add your OpenRouter API Key (OPEN_ROUTER_KEY) to use any AI model through their platform. OpenRouter provides access to various models including GPT-4, Claude, Gemini, and many others.

# How it works

Let's ask **GitDiagram** itself...
<img width="5572" height="2916" alt="image" src="https://github.com/user-attachments/assets/3d7439b4-f7d2-4f2d-83e3-c7a2965f7c32" />
So, you either give your github repo url and select the branch or upload a file.
Then we parse your dependencies and fetch transitive dependencies of each of them from <a href='https://deps.dev/'>deps.dev</a> and vulnerabilities for each of them dependencies from <a href='https://osv.dev/'>OSV.dev</a>, combine all of them and return to the frontend.

# Future Plans

I have a lot of things in mind, and would like to make this a tool that all software developers can use and analyse their projects dependencies locally or online. Also, a CLI tool in the current landscape of people moving to more TUI based apps.

# Contributions and Bug Reporting

- People are welcome to improve and support this project by contributing to the codebase.
- Please create an issue for anything you want to be fixed or want to contribute for, so that it is easy for me and others to track and understand the request/contribution in detail.
- It may take some time for the PR to be reviewed as I do not do this full time so patience would be appreciated

Thanks for stopping by.
