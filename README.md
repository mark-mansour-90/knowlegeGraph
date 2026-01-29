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

🎥 Demo: https://youtu.be/RhB4RcTE2PY

## Running locally
```bash
git clone https://github.com/mark-mansour-90/knowledgeGraph
cd knowledgeGraph
cp server/.env.example server/.env
docker compose up --build
```
Frontend: http://localhost:5173
Backend: http://localhost:4000
