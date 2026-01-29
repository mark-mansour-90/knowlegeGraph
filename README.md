# knowlegeGraph
An app for comparing knowledge based on topics provided and finding relation score while representing this graphically
allows users to:
- create graphs from topic lists
- explore relationships across graphs
- visualize graphs interactively
- edit and delete graphs

## Tech Stack
- Frontend: React + TypeScript + react-force-graph
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- Infra: Docker & docker-compose

## Running locally
```bash
git clone <repo>
cd knowledgeGraph
cp server/.env.example server/.env
docker compose up --build


🎥 Demo: https://youtu.be/RhB4RcTE2PY
