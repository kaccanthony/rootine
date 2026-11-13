# Final
Final Project of Group 7 for Programming Tools and Techniques 1T2627-CS0053

**Group Name: Xylem**
\nLeader: Kent Anthony Capuno
\nMembers:
\nAilish Sophia Narvasa
\nJericko Ocampo
\nJecyn Vallirie Turbanos

## Assets to be added (phases of the plant)
- Seed
- Germination
- Seedling
- Adult Plant (Flower is budding)
- Flower (Flower matured)

## Tech Stack
| Part | Technology used |
| --- | --- |
| Front End | HTML, CSS, JavaScript |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| External API | Webhook API |
| Plant visuals | SVG Illustrations + CSS Animations |
| Dev Tools | VS Code, Git, GitHub |
| Testing | Node server |

## Run the dashboard

```bash
npm install
npm start
```

Open `http://localhost:3000`. The current build is intentionally front-end only:
task changes live in the browser session, and no database or SQL files are included.

## Project structure

```text
rootine/
├── public/
│   ├── images/          # Browser-ready image assets
│   ├── scripts/         # Dashboard interactions
│   ├── styles/          # Site styling and responsive layout
│   └── index.html       # Main dashboard
├── src/
│   └── server.js        # Express entry point
├── rootine-extension/   # Existing Chrome extension prototype
├── UI-Drafts/           # Design references
└── package.json
```

Separate Design per plant design

Part of the plant, when the plant grows, the other part of the plant also grows. That plant will be the chatbot that will discuss the statistics and summary of your schedule. This will be the main use of the API to achieve the goal of using API

### Week 1 Progress Report

During Week 1, the team finalized the project scope and requirements for ROOTINE, selected the technology stack, and assigned development responsibilities. We planned the application’s main pages and drafted the initial HTML structure for navigation, task management, plant display, garden archiving, and plant-information search. Next, we will implement the styling, interactive task and plant-growth features, database connectivity, and API integration.
