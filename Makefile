.PHONY: up down prod logs api frontend

up:
	docker compose up -d --build akashic-arbor-dev wdtools-api azurite

prod:
	docker compose up -d --build akashic-arbor

down:
	docker compose down

logs:
	docker compose logs -f

api:
	docker compose up -d --build wdtools-api azurite

frontend:
	docker compose up -d --build akashic-arbor-dev
